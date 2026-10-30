import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { EstadoLlamado, RealtimeService } from './realtime.service';
import { TenantContextService } from './tenant-context.service';

export interface WaiterRequestPayload {
  tenantId: string;
  tableNumber: number;
  message?: string;
}

export type TipoLlamado = 'waiter' | 'bill';

export interface LlamadoMesa {
  id: string;
  tipo: TipoLlamado;
  status: EstadoLlamado;
  count: number;
  // La mesa ya tenía uno pendiente: el back no creó otro ("Ya avisamos al mozo").
  duplicado?: boolean;
  actualizado: number;
}

interface CrearLlamadoResponse {
  success: boolean;
  // 200 + duplicate: true cuando ya había uno pendiente del mismo tipo.
  duplicate?: boolean;
  data: { id: string; type: string; status: EstadoLlamado; count: number; createdAt?: string; timestamp?: string };
}

interface LlamadosMesaResponse {
  requests: Array<{
    id: string;
    type: string;
    status: EstadoLlamado;
    count: number;
    createdAt?: string;
    updatedAt?: string;
    attendedAt?: string;
  }>;
}

/**
 * Llamados al mozo y pedidos de cuenta de la mesa. El back los guarda (2xx = quedó registrado)
 * y avisa los cambios de estado con `table_request_updated`. Al reconectar el WebSocket o al
 * entrar se recupera el estado con GET /public/table-requests.
 */
@Injectable({
  providedIn: 'root',
})
export class WaiterRequestsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly realtime = inject(RealtimeService);
  private readonly tenantContext = inject(TenantContextService);

  // Último llamado conocido de cada tipo para la mesa actual.
  readonly mozo = signal<LlamadoMesa | null>(null);
  readonly cuenta = signal<LlamadoMesa | null>(null);

  constructor() {
    this.realtime.on('table_request_updated').subscribe((event) => {
      this.registrar({
        id: event.requestId,
        tipo: event.requestType,
        status: event.status,
        count: this.estado(event.requestType)()?.count ?? 1,
        actualizado: Date.parse(event.timestamp ?? '') || Date.now(),
      });
    });
    this.realtime.resync$.subscribe(() => this.refrescar());
  }

  create(payload: WaiterRequestPayload): Observable<CrearLlamadoResponse> {
    return this.http
      .post<CrearLlamadoResponse>(this.apiConfig.api('/waiter-requests/new'), payload)
      .pipe(tap((respuesta) => this.registrarCreado('waiter', respuesta)));
  }

  createBillRequest(payload: WaiterRequestPayload): Observable<CrearLlamadoResponse> {
    return this.http
      .post<CrearLlamadoResponse>(this.apiConfig.api('/bill-requests/new'), {
        tenantId: payload.tenantId,
        tableNumber: payload.tableNumber,
        message: payload.message || '',
      })
      .pipe(tap((respuesta) => this.registrarCreado('bill', respuesta)));
  }

  /** Recupera los llamados pendientes y los resueltos en los últimos 30 minutos. */
  refrescar(): void {
    const tenantId = this.tenantContext.getTenantId();
    const mesa = this.tenantContext.getTableNumber(undefined);
    if (!tenantId || !mesa) {
      this.mozo.set(null);
      this.cuenta.set(null);
      return;
    }

    this.http
      .get<LlamadosMesaResponse>(this.apiConfig.api('/public/table-requests'), {
        params: { tenantId, table: String(mesa) },
      })
      .subscribe({
        next: (respuesta) => {
          // El más reciente de cada tipo define el estado del botón.
          const ultimos = new Map<TipoLlamado, LlamadoMesa>();
          for (const r of respuesta?.requests ?? []) {
            const tipo = this.tipoDe(r.type);
            const llamado: LlamadoMesa = {
              id: r.id,
              tipo,
              status: r.status,
              count: r.count ?? 1,
              actualizado: Date.parse(r.updatedAt || r.attendedAt || r.createdAt || '') || 0,
            };
            if (!ultimos.has(tipo) || llamado.actualizado > ultimos.get(tipo)!.actualizado) {
              ultimos.set(tipo, llamado);
            }
          }
          this.mozo.set(ultimos.get('waiter') ?? null);
          this.cuenta.set(ultimos.get('bill') ?? null);
        },
        error: (error) => console.warn('No se pudo consultar el estado de los llamados:', error),
      });
  }

  private registrarCreado(tipo: TipoLlamado, respuesta: CrearLlamadoResponse): void {
    const data = respuesta?.data;
    if (!data?.id) {
      return;
    }
    this.registrar({
      id: data.id,
      tipo,
      status: data.status ?? 'pending',
      count: data.count ?? 1,
      duplicado: respuesta.duplicate === true,
      actualizado: Date.now(),
    });
  }

  private registrar(llamado: LlamadoMesa): void {
    const estado = this.estado(llamado.tipo);
    const actual = estado();
    // Un evento de otro llamado más viejo no pisa al actual.
    if (actual && actual.id !== llamado.id && actual.actualizado > llamado.actualizado) {
      return;
    }
    estado.set(llamado);
  }

  private estado(tipo: TipoLlamado) {
    return tipo === 'bill' ? this.cuenta : this.mozo;
  }

  // El back usa "waiter_request"/"bill_request" en los datos y "waiter"/"bill" en los eventos.
  private tipoDe(type: string): TipoLlamado {
    return String(type).toLowerCase().includes('bill') ? 'bill' : 'waiter';
  }
}
