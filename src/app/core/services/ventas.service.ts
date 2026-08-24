import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VentaPayload } from '../interface/venta';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class VentasService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiConfigService: ApiConfigService) {
    this.apiUrl = this.apiConfigService.api('/ventas');
  }

  crearVenta(payload: VentaPayload): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  obtenerVentas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
