import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Producto } from '../interface/productos';
import { Busqueda } from '../interface/busqueda';

@Injectable({
  providedIn: 'root',
})
export class ProductosService  {
  // private apiUrl = 'http://localhost:3001/api'; // URL de tu API
  private apiUrl = 'https://mvp-admin.onrender.com/api';

  constructor(private http: HttpClient) {}

  getByCategory(id: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/categorias/${id}/productos`);
  }

  getAllProducts(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`);
  }

  getById(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/productos/${id}`).pipe(
      // tap(producto => console.log('Producto recibido:', producto)) // Depuración
    );
  }


  buscar(parametros: Busqueda): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, {
      params: {
        texto: parametros.texto,
        aptoCeliaco: parametros.aptoCeliaco.toString(),
        aptoVegano: parametros.aptoVegano.toString()
      }
    });
  }
}
