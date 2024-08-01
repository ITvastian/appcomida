import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

interface Product {
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
}
@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'https://mvp-admin.onrender.com/api/products';

  constructor(private http: HttpClient) {}

  // Obtener productos
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  addProduct(product: Product): Observable<any> {
    return this.http.post(this.apiUrl, product);
  }
}
