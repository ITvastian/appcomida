import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Categoria } from '../interface/categorias';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  private readonly apiUrl: string;
  private readonly defaultTenantId = 'big-pizza';

  constructor(private http: HttpClient, private apiConfigService: ApiConfigService) {
    this.apiUrl = this.apiConfigService.api('');
  }

  private obtenerTenantId(): string {
    const keys = ['activeTenantId', 'tenantId', 'activeRestaurantTenantId'];
    for (const key of keys) {
      const value = localStorage.getItem(key)?.trim();
      if (value) {
        return value;
      }
    }
    return this.defaultTenantId;
  }

  private normalizarCategoria(data: any): Categoria {
    return {
      ...data,
      id: String(data?.id || data?._id || data?.categoryId || ''),
      name: String(data?.name || ''),
      photoUrl: String(data?.photoUrl || data?.photo || data?.imageUrl || ''),
      productos: Array.isArray(data?.productos) ? data.productos : [],
    } as Categoria;
  }

  private extraerArrayCategorias(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.categorias)) {
      return response.categorias;
    }

    if (Array.isArray(response?.categories)) {
      return response.categories;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }

  // Obtener todas las categorías desde API con tenantId
  getAll(): Observable<Categoria[]> {
    const tenantId = this.obtenerTenantId();
    const params = new HttpParams().set('tenantId', tenantId);

    return this.http.get<any>(`${this.apiUrl}/categorias`, { params }).pipe(
      map((response) => this.extraerArrayCategorias(response).map((item) => this.normalizarCategoria(item)))
    );
  }

  getCategoryIdByName(name: string): Observable<string> {
    const buscada = (name || '').trim().toLowerCase();
    return this.getAll().pipe(
      map((categorias) => {
        const encontrada = categorias.find((c) => (c?.name || '').trim().toLowerCase() === buscada);
        if (!encontrada?.id) {
          throw new Error('Categoría no encontrada');
        }
        return String(encontrada.id);
      })
    );
  }

  // Obtener una categoría por su ID (desde API)
  getById(id: string): Observable<Categoria> {
    return this.getAll().pipe(
      map((categorias) => {
        const encontrada = categorias.find((c) => String(c.id) === String(id));
        if (!encontrada) {
          throw new Error('Categoría no encontrada');
        }
        return encontrada;
      })
    );
  }

  // Crear categoría en API
  create(categoria: Categoria): Observable<any> {
    const tenantId = this.obtenerTenantId();
    return this.http.post(`${this.apiUrl}/categorias`, {
      ...categoria,
      tenantId,
    });
  }
}
