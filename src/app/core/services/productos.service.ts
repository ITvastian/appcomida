
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Producto } from '../interface/productos';
import { Busqueda } from '../interface/busqueda';
import { map } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private readonly apiUrl: string;
  private readonly defaultTenantId = 'big-pizza';

  constructor(private http: HttpClient, private apiConfigService: ApiConfigService) {
    this.apiUrl = this.apiConfigService.api('');
  }

  private obtenerTenantId(): string | null {
    const keys = ['activeTenantId', 'tenantId', 'activeRestaurantTenantId'];
    for (const key of keys) {
      const value = localStorage.getItem(key)?.trim();
      if (value) {
        return value;
      }
    }
    return this.defaultTenantId;
  }

  private normalizarProducto(producto: any): Producto {
    return {
      ...producto,
      _id: String(producto?._id || producto?.id || ''),
      category: String(producto?.category || producto?.categoryId || ''),
      categoryName: String(producto?.categoryName || producto?.category_name || ''),
      name: String(producto?.name || ''),
      price: this.parsePrice(producto?.price),
      esVegano: Boolean(producto?.esVegano),
      esCeliaco: Boolean(producto?.esCeliaco),
      photoUrl: this.parsePhotoUrl(producto?.photoUrl || producto?.photo || producto?.imageUrl),
      ingredients: String(producto?.ingredients || ''),
      extras: producto?.extras || [],
    } as Producto;
  }

  private mapearProductos(productos: Producto[]): Producto[] {
    return productos.map((producto: any) => this.normalizarProducto(producto));
  }

  private extraerArrayProductos(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.productos)) {
      return response.productos;
    }

    if (Array.isArray(response?.products)) {
      return response.products;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }

  private consultarTodos(tenantId?: string): Observable<Producto[]> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http
      .get<any>(`${this.apiUrl}/productos`, { params })
      .pipe(map((response) => this.extraerArrayProductos(response).map((p) => this.normalizarProducto(p))));
  }

  private parsePhotoUrl(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private parsePrice(value: unknown): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return 0;
    }

    const raw = value.trim().replace(/\$/g, '').replace(/\s/g, '');
    if (!raw) {
      return 0;
    }

    const hasDot = raw.includes('.');
    const hasComma = raw.includes(',');
    let normalized = raw;

    if (hasDot && hasComma) {
      // Si la coma aparece al final, suele ser decimal: 9.000,50
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
      } else {
        // Caso 9,000.50
        normalized = raw.replace(/,/g, '');
      }
    } else if (hasDot) {
      // Caso miles con punto: 9.000
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
        normalized = raw.replace(/\./g, '');
      }
    } else if (hasComma) {
      // Caso miles con coma: 9,000
      if (/^\d{1,3}(,\d{3})+$/.test(raw)) {
        normalized = raw.replace(/,/g, '');
      } else {
        normalized = raw.replace(',', '.');
      }
    }

    const parsed = Number(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  getAllProducts(): Observable<Producto[]> {
    const tenantId = this.obtenerTenantId();
    if (!tenantId) {
      return this.consultarTodos();
    }

    return this.consultarTodos(tenantId).pipe(
      switchMap((productos) => (productos.length > 0 ? of(productos) : this.consultarTodos()))
    );
  }

  private crearProductoVacio(): Producto {
    return {
      category: '',
      _id: '',
      name: '',
      price: 0,
      esVegano: false,
      esCeliaco: false,
      photoUrl: '',
      ingredients: '',
      extras: [],
    };
  }

  private filtrarProductosPorCategoria(productos: Producto[], categoryId: string, categoryName?: string): Producto[] {
    const normalizedId = (categoryId || '').trim().toLowerCase();
    const normalizedName = (categoryName || '').trim().toLowerCase();

    return productos.filter((producto) => {
      const productCategoryId = String((producto as any)?.category || '').trim().toLowerCase();
      const productCategoryName = String((producto as any)?.categoryName || '').trim().toLowerCase();

      const byId = normalizedId ? productCategoryId === normalizedId : false;
      const byName = normalizedName ? productCategoryName === normalizedName : false;
      return byId || byName;
    });
  }

  getByCategory(categoryId: string, categoryName?: string): Observable<Producto[]> {
    if (!categoryId) {
      console.warn('El ID de la categoría es undefined o vacío');
      return of([]);
    }

    return this.getAllProducts().pipe(
      map((allProducts) => this.filtrarProductosPorCategoria(allProducts, categoryId, categoryName))
    );
  }

  getById(id: string): Observable<Producto> {
    // Busca por ID real de producto. No por category, para evitar requests incorrectos.
    if (!id) {
      console.warn(`El ID proporcionado es inválido: ${id}`);
      return of(this.crearProductoVacio());
    }

    const normalizedId = String(id).trim();
    return this.getAllProducts().pipe(
      map((productos: Producto[]) => {
        let producto = productos.find((p) => String((p as any)?._id || '').trim() === normalizedId);
        if (!producto) {
          // Compatibilidad con carritos viejos que guardaban category en idProd.
          producto = productos.find((p) => String((p as any)?.category || '').trim() === normalizedId);
        }

        if (!producto) {
          console.warn(`No se encontro producto con id: ${id}`);
          return this.crearProductoVacio();
        }

        return {
          ...producto,
          _id: String((producto as any)?._id || '').trim(),
          price: this.parsePrice((producto as any)?.price),
          photoUrl: this.parsePhotoUrl((producto as any)?.photoUrl || (producto as any)?.photo),
          extras: (producto as any)?.extras || [],
          ingredients: (producto as any)?.ingredients || '',
        } as Producto;
      })
    );
  }

  getRawDocumentById(id: string) {
    return of(null);
  }

  // Búsqueda de productos por parámetros
  buscar(parametros: Busqueda): Observable<Producto[]> {
    const texto = (parametros?.texto || '').toLowerCase().trim();
    return this.getAllProducts().pipe(
      map((productos) => {
        if (!texto) {
          return productos;
        }
        return productos.filter((producto) => (producto?.name || '').toLowerCase().includes(texto));
      })
    );
  }
}

