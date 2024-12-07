import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
// export class TelService {
//   private apiUrl = 'http://localhost:3001/api/tel';

//   constructor(private http: HttpClient) {}

//   getNumeroWhatsApp(): Observable<{ numeroWhatsApp: string }> {
//     return this.http.get<{ numeroWhatsApp: string }>(this.apiUrl);
//   }
// }
export class TelService {
  private apiUrl = 'http://localhost:3001/api/tel/numeros';

  constructor(private http: HttpClient) {}

  // Obtener la lista de números
  getNumeros(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl);
  }

  // Agregar un nuevo número
  agregarNumero(numero: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { numero });
  }
}
