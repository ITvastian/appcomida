import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface TransferInitializationPayload {
  paymentId: string;
  tenantId: string;
  tableNumber: number;
  paymentMethod: 'transfer';
}

export interface TransferOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface TransferOrder {
  id: string;
  orderId: string;
  tableNumber: string | number;
  items: TransferOrderItem[];
  total: number;
  createdAt?: string;
  timestamp?: string;
}

export interface TransferInitializationResponse {
  success: boolean;
  paymentId: string;
  tenantId: string;
  orderId: string;
  tableNumber: string | number;
  amount: number;
  order: TransferOrder;
  firestoreDocumentId?: string;
}

export interface MercadoPagoCheckoutPayload {
  paymentId: string;
  tenantId: string;
  orderId: string;
  tableNumber: number;
  amount: number;
}

export interface MercadoPagoCheckoutResponse {
  success: boolean;
  checkoutUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  initializeTransfer(payload: TransferInitializationPayload): Observable<TransferInitializationResponse> {
    return this.http.post<TransferInitializationResponse>(
      this.apiConfig.api('/payments/transfer/init'),
      payload,
    );
  }

  createMercadoPagoCheckout(payload: MercadoPagoCheckoutPayload): Observable<MercadoPagoCheckoutResponse> {
    return this.http.post<MercadoPagoCheckoutResponse>(
      this.apiConfig.api('/payments/mercadopago/create'),
      payload,
    );
  }
}