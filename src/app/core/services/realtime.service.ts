import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { Observable, Subject, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';
import { TenantContextService } from './tenant-context.service';

export type MenuCollection = 'productos' | 'categorias';

export type RealtimeEvent =
  | { type: 'connection_established'; tenantId: string }
  | { type: 'menu_updated'; collections: MenuCollection[]; tenantId: string; timestamp?: string }
  | { type: 'banner_updated'; banners: unknown; slot?: number; tenantId: string; timestamp?: string }
  | { type: 'title_background_updated'; imageUrl: string; tenantId: string; timestamp?: string }
  | { type: 'header_title_updated'; title: string; isActive: boolean; tenantId: string; timestamp?: string }
  | { type: 'avatar_updated'; imageUrl: string; tenantId: string; timestamp?: string }
  // Solo llega a la mesa afectada; no trae datos: hay que volver a pedir el pedido por HTTP.
  | { type: 'table_order_updated'; tableNumber: number; tenantId: string; timestamp?: string }
  // Cambio de estado de un llamado al mozo o pedido de cuenta de esta mesa.
  | {
      type: 'table_request_updated';
      tableNumber: number;
      tenantId: string;
      requestId: string;
      requestType: 'waiter' | 'bill';
      status: EstadoLlamado;
      timestamp?: string;
    };

export type EstadoLlamado = 'pending' | 'attended' | 'dismissed' | 'expired';

const TIPOS_CONOCIDOS = new Set<RealtimeEvent['type']>([
  'connection_established',
  'menu_updated',
  'banner_updated',
  'title_background_updated',
  'header_title_updated',
  'avatar_updated',
  'table_order_updated',
  'table_request_updated',
]);

// Espera entre reintentos de conexión (ms). El último valor se repite.
const BACKOFF_MS = [1000, 2000, 5000, 10000, 20000, 30000];
// Código que usa el backend para rechazar conexiones sin tenantId válido.
const CODIGO_RECHAZO_POLICY = 1008;

/**
 * Conexión única a /ws/public del local activo.
 * - `events$`: eventos del panel (solo los tipos conocidos).
 * - `resync$`: emite al reconectar tras un corte, para volver a pedir los datos por HTTP.
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeService implements OnDestroy {
  private readonly apiConfig = inject(ApiConfigService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly zone = inject(NgZone);

  private socket?: WebSocket;
  // "tenant" o "tenant#mesa": identifica a qué canal está conectado el socket.
  private tenantConectado = '';
  private intentos = 0;
  private huboCorte = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private detenido = false;

  private readonly eventsSubject = new Subject<RealtimeEvent>();
  private readonly resyncSubject = new Subject<void>();

  readonly events$ = this.eventsSubject.asObservable();
  readonly resync$ = this.resyncSubject.asObservable();

  /** Agrega ?v=<timestamp> para que el navegador no muestre la versión cacheada de Cloudinary. */
  static conVersion(url: string, timestamp?: string): string {
    if (!url) {
      return url;
    }
    const parsed = Date.parse(timestamp ?? '');
    const version = Number.isFinite(parsed) ? parsed : Date.now();
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set('v', String(version));
      return u.toString();
    } catch {
      return url;
    }
  }

  on<T extends RealtimeEvent['type']>(type: T): Observable<Extract<RealtimeEvent, { type: T }>> {
    this.conectar();
    return this.events$.pipe(
      filter((event): event is Extract<RealtimeEvent, { type: T }> => event.type === type)
    );
  }

  /** Emite cuando hay que recargar el menú: por evento o tras una reconexión. */
  menuChanges(collection: MenuCollection): Observable<void> {
    return merge(
      this.on('menu_updated').pipe(filter((event) => event.collections?.includes(collection))),
      this.resync$
    ).pipe(map(() => undefined));
  }

  /** Abre la conexión si no existe, o la reabre si cambió el local o la mesa activa. */
  conectar(): void {
    this.detenido = false;
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      return;
    }

    // Con la mesa, el backend además envía table_order_updated de esa mesa.
    const mesa = this.tenantContext.getTableNumber(undefined);
    const destino = mesa > 0 ? `${tenantId}#${mesa}` : tenantId;

    const activo =
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING);
    if (activo && this.tenantConectado === destino) {
      return;
    }

    if (activo) {
      this.cerrarSocket();
      this.intentos = 0;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.tenantConectado = destino;
    const url =
      `${this.apiConfig.ws()}/ws/public?tenantId=${encodeURIComponent(tenantId)}` +
      (mesa > 0 ? `&table=${mesa}` : '');

    // Fuera de la zona para no disparar change detection por cada frame del socket.
    this.zone.runOutsideAngular(() => {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.intentos = 0;
        if (this.huboCorte) {
          this.huboCorte = false;
          this.zone.run(() => this.resyncSubject.next());
        }
      };

      socket.onmessage = (message) => {
        let data: any;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        if (!data || !TIPOS_CONOCIDOS.has(data.type)) {
          return;
        }
        this.zone.run(() => this.eventsSubject.next(data as RealtimeEvent));
      };

      socket.onclose = (event) => {
        if (this.socket !== socket) {
          return;
        }
        this.socket = undefined;
        if (this.detenido || event.code === CODIGO_RECHAZO_POLICY) {
          if (event.code === CODIGO_RECHAZO_POLICY) {
            console.warn('Tiempo real rechazado por el servidor (tenantId inválido).');
          }
          return;
        }
        this.huboCorte = true;
        this.programarReconexion();
      };
    });
  }

  private programarReconexion(): void {
    const espera = BACKOFF_MS[Math.min(this.intentos, BACKOFF_MS.length - 1)];
    this.intentos++;
    this.reconnectTimer = setTimeout(() => this.conectar(), espera);
  }

  private cerrarSocket(): void {
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  ngOnDestroy(): void {
    this.detenido = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.cerrarSocket();
  }
}
