import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { RealtimeService } from './realtime.service';
import { TenantContextService } from './tenant-context.service';

export interface PedidoActivoExtra {
  name: string;
  price: number;
}

export interface PedidoActivoItem {
  name: string;
  quantity: number;
  // Unitario y sin extras.
  price: number;
  extras?: PedidoActivoExtra[];
}

export interface PedidoActivoOrden {
  orderId: string;
  createdAt: string;
  items: PedidoActivoItem[];
  total: number;
  paymentStatus: string;
}

export interface PedidoActivoResponse {
  success: boolean;
  tableNumber: number;
  hasPendingOrder: boolean;
  // Suma de todas las órdenes; usar este valor, no recalcular.
  total: number;
  orders: PedidoActivoOrden[];
}

export type MedioDePagoOnline = 'mercadopago' | 'transferencia';

// Cuánto se muestra "confirmando…" si el pedido sigue pendiente. Mercado Pago confirma por
// webhook en segundos; la transferencia la confirma el staff a mano y puede tardar minutos.
const ESPERA_CONFIRMACION_MS: Record<MedioDePagoOnline, number> = {
  mercadopago: 2 * 60 * 1000,
  transferencia: 30 * 60 * 1000,
};

/**
 * Pedidos pendientes (no pagados) de la mesa actual.
 * Se refresca al abrir desde el QR, al enviar un pedido, al volver de Mercado Pago,
 * con `table_order_updated` y al reconectar el WebSocket.
 * Un pago se da por hecho solo cuando el GET deja de mostrar pendientes.
 */
@Injectable({
  providedIn: 'root',
})
export class PedidoActivoService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly realtime = inject(RealtimeService);

  readonly pedido = signal<PedidoActivoResponse | null>(null);
  readonly hayPedido = computed(() => !!this.pedido()?.hasPendingOrder);
  // Medio con el que el cliente dijo que pagó y del que se espera la confirmación.
  readonly esperandoPago = signal<MedioDePagoOnline | null>(null);
  readonly confirmandoPago = computed(() => this.esperandoPago() !== null);
  // true cuando, esperando un pago, la mesa queda sin pendientes.
  readonly pagoRecibido = signal(false);

  private confirmacionTimer?: ReturnType<typeof setTimeout>;
  private consultaEnCurso = false;
  private consultaPendiente = false;

  constructor() {
    this.realtime.on('table_order_updated').subscribe(() => this.refrescar());
    this.realtime.resync$.subscribe(() => this.refrescar());
  }

  refrescar(): void {
    const tenantId = this.tenantContext.getTenantId();
    const mesa = this.tenantContext.getTableNumber(undefined);
    if (!tenantId || !mesa) {
      this.pedido.set(null);
      return;
    }

    // Si llegan varios avisos seguidos, se hace una consulta más al terminar la actual.
    if (this.consultaEnCurso) {
      this.consultaPendiente = true;
      return;
    }
    this.consultaEnCurso = true;

    this.http
      .get<PedidoActivoResponse>(this.apiConfig.api(`/public/salon/table/${mesa}`), { params: { tenantId } })
      .pipe(finalize(() => this.finConsulta()))
      .subscribe({
        next: (respuesta) => {
          this.pedido.set(respuesta?.success ? respuesta : null);
          if (respuesta?.hasPendingOrder) {
            return;
          }
          if (this.esperandoPago()) {
            this.pagoRecibido.set(true);
          }
          this.terminarEspera();
        },
        error: (error) => console.error('No se pudo consultar el pedido de la mesa:', error),
      });
  }

  /** Muestra "confirmando pago" hasta que la mesa quede sin pendientes (o venza la espera). */
  esperarConfirmacionDePago(medio: MedioDePagoOnline = 'mercadopago'): void {
    this.pagoRecibido.set(false);
    this.esperandoPago.set(medio);
    clearTimeout(this.confirmacionTimer);
    this.confirmacionTimer = setTimeout(() => this.esperandoPago.set(null), ESPERA_CONFIRMACION_MS[medio]);
    this.refrescar();
  }

  /** Oculta el aviso de "¡Pago recibido!". */
  descartarPagoRecibido(): void {
    this.pagoRecibido.set(false);
  }

  private terminarEspera(): void {
    clearTimeout(this.confirmacionTimer);
    this.esperandoPago.set(null);
  }

  private finConsulta(): void {
    this.consultaEnCurso = false;
    if (this.consultaPendiente) {
      this.consultaPendiente = false;
      this.refrescar();
    }
  }
}
