import { Injectable, inject } from '@angular/core';
import { Cart } from '../interface/carrito';
import { Extra } from '../interface/productos';
import { TenantContextService } from './tenant-context.service';

// Límites que valida el backend en POST /salon/order
export const MAX_CANTIDAD_POR_ITEM = 50;

/**
 * Carrito del local activo. Cada local tiene el suyo en localStorage (`cart:<tenantId>`),
 * así no se arrastran productos de un local a otro al escanear otro QR.
 */
@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly tenantContext = inject(TenantContextService);

  private items: Cart[] = [];
  // Local cuyo carrito está cargado en `items`.
  private tenantCargado: string | null = null;

  constructor() {
    // Carrito viejo sin local: no se sabe de qué local era, así que se descarta.
    localStorage.removeItem('cart');
  }

  get carrito(): Cart[] {
    this.asegurarLocal();
    return this.items;
  }

  set carrito(items: Cart[]) {
    this.asegurarLocal();
    this.items = items;
  }

  addProd(idProd: string, cantidad: number, notas: string, extras: Extra[]) {
    const idNormalizado = String(idProd);
    const i = this.carrito.findIndex((producto) => String(producto.idProd) === idNormalizado);
    if (i === -1) {
      const nuevoProd: Cart = {
        idProd: idNormalizado,
        cantidad: Math.min(cantidad, MAX_CANTIDAD_POR_ITEM),
        notas: notas,
        extras: extras,
        precio: 0,
      };
      this.carrito.push(nuevoProd);
    } else {
      this.carrito[i].cantidad = Math.min(this.carrito[i].cantidad + cantidad, MAX_CANTIDAD_POR_ITEM);
      this.carrito[i].extras = extras;
      this.carrito[i].notas = notas;
    }
    this.actualizarAlmacenamiento();
  }

  deleteProd(idProd: string) {
    const idNormalizado = String(idProd);
    this.carrito = this.carrito.filter((producto) => String(producto.idProd) !== idNormalizado);
    this.actualizarAlmacenamiento();
  }

  cambiarProd(idProd: string, nuevaCantidad: number) {
    const idNormalizado = String(idProd);
    const item = this.carrito.find((p) => String(p.idProd) === idNormalizado);
    if (item) {
      item.cantidad = nuevaCantidad;
    }
    this.actualizarAlmacenamiento();
  }

  actualizarAlmacenamiento() {
    const clave = this.clave();
    if (!clave) {
      return;
    }
    if (this.items.length === 0) {
      localStorage.removeItem(clave);
    } else {
      localStorage.setItem(clave, JSON.stringify(this.items));
    }
  }

  vaciar() {
    this.carrito = [];
    this.actualizarAlmacenamiento();
  }

  private clave(): string | null {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? `cart:${tenantId}` : null;
  }

  // Si cambió el local activo, carga su carrito.
  private asegurarLocal(): void {
    const tenantId = this.tenantContext.getTenantId();
    if (tenantId === this.tenantCargado) {
      return;
    }
    this.tenantCargado = tenantId;
    this.items = this.leer(tenantId);
  }

  private leer(tenantId: string): Cart[] {
    if (!tenantId) {
      return [];
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(`cart:${tenantId}`) || '[]');
      return Array.isArray(parsed) ? parsed.map((item: any) => ({ ...item, extras: item.extras || [] })) : [];
    } catch (error) {
      console.error('Error al leer el carrito guardado:', error);
      return [];
    }
  }
}
