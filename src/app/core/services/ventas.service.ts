import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VentaPayload } from '../interface/venta';

@Injectable({
  providedIn: 'root',
})
export class VentasService {
  private apiUrl = 'https://mvp-admin.onrender.com/api/ventas';

  constructor(private http: HttpClient) {}

  crearVenta(payload: VentaPayload): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  obtenerVentas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
