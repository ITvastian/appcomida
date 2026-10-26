import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

// Se cobra la cuenta completa de la mesa (todos los pedidos pendientes): el backend calcula
// el monto y genera el paymentId. Si se mandan orderId/amount/paymentId, se ignoran.
export interface CuentaMesaPayload {
  tenantId: string;
  tableNumber: number;
}

export interface CuentaMesaResponse {
  success: boolean;
  paymentId: string;
  // Total de la cuenta (todos los pedidos pendientes de la mesa).
  amount: number;
  orderIds: string[];
  // Último pedido, por compatibilidad.
  orderId: string;
}

export interface MercadoPagoCheckoutResponse extends CuentaMesaResponse {
  checkoutUrl: string;
}

export interface MetodosDePagoResponse {
  success: boolean;
  mercadopago: boolean;
  transfer: boolean;
}

export interface DatosBancarios {
  alias?: string;
  cbu?: string;
  holderName?: string;
  // Solo dígitos; se formatea al mostrarlo.
  cuit?: string;
  bankName?: string;
  instructions?: string;
}

export interface TransferenciaResponse {
  success: boolean;
  amount: number;
  orderIds: string[];
  transfer: DatosBancarios;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  // Qué medios de pago online acepta el local. Si los dos son false, se paga solo en el local.
  getMetodos(tenantId: string): Observable<MetodosDePagoResponse> {
    return this.http.get<MetodosDePagoResponse>(this.apiConfig.api('/payments/methods'), { params: { tenantId } });
  }

  // Devuelve el monto y los datos bancarios del local. Se puede llamar varias veces.
  // 400 = el local no acepta transferencias, 404 = no hay nada pendiente.
  initializeTransfer(payload: CuentaMesaPayload): Observable<TransferenciaResponse> {
    return this.http.post<TransferenciaResponse>(this.apiConfig.api('/payments/transfer/init'), payload);
  }

  // Si dos personas de la mesa pagan a la vez, ambas reciben el mismo checkoutUrl.
  // 409 = se está generando el pago (reintentar en 2–3 s), 400 = el local no tiene MP,
  // 404 = no hay pedidos pendientes (la cuenta ya está paga).
  createMercadoPagoCheckout(payload: CuentaMesaPayload): Observable<MercadoPagoCheckoutResponse> {
    return this.http.post<MercadoPagoCheckoutResponse>(this.apiConfig.api('/payments/mercadopago/create'), payload);
  }
}
