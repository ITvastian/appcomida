import { Injectable } from '@angular/core';
import { Categoria } from '../interface/categorias';
import { Producto } from '../interface/productos';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  // private apiUrl = 'http://localhost:3001/api/categorias';
  private apiUrl = 'https://mvp-admin.onrender.com/api/categorias';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  getById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  create(categoria: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria);
  }
}
