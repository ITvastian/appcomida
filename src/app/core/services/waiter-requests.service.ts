import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface WaiterRequestPayload {
  tenantId: string;
  tableNumber: number;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WaiterRequestsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  create(payload: WaiterRequestPayload): Observable<unknown> {
    return this.http.post(this.apiConfig.api('/waiter-requests/new'), payload);
  }

  createBillRequest(payload: WaiterRequestPayload): Observable<unknown> {
    return this.http.post(this.apiConfig.api('/bill-requests/new'), {
      tenantId: payload.tenantId,
      tableNumber: payload.tableNumber,
      message: payload.message || '',
    });
  }
}
