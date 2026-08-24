import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

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
  private apiUrl: string;

  constructor(private http: HttpClient, private apiConfigService: ApiConfigService) {
    this.apiUrl = this.apiConfigService.api('/categorias');
  }

  // Obtener productos
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  addProduct(product: Product): Observable<any> {
    return this.http.post(this.apiUrl, product);
  }
}
