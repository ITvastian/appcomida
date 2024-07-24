import { Injectable } from '@angular/core';
import { Cart } from '../interface/carrito';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  carrito: Cart[] = [];

  constructor() {
    const cart = localStorage.getItem('cart');
    if (cart) {
      try {
        const parsedCart = JSON.parse(cart);
        if (Array.isArray(parsedCart)) {
          this.carrito = parsedCart;
        } else {
          console.warn('El carrito en el almacenamiento local no es un array:', parsedCart);
          this.carrito = [];
        }
      } catch (error) {
        console.error('Error al parsear el carrito del almacenamiento local:', error);
        this.carrito = [];
      }
    } else {
      this.carrito = [];
    }
  }

  addProd(idProd: number, cantidad: number, notas: string, extras: any[]) {
    const i = this.carrito.findIndex((producto) => producto.idProd === idProd);
    if (i === -1) {
      const nuevoProd: Cart = {
        idProd: idProd,
        cantidad: cantidad,
        notas: notas,
        extras: extras
      };
      this.carrito.push(nuevoProd);
    } else {
      this.carrito[i].cantidad += cantidad;
      this.carrito[i].extras = extras;
    }
    this.actualizarAlmacenamiento();
  }

  deleteProd(idProd: number) {
    this.carrito = this.carrito.filter((producto) => producto.idProd !== idProd);
    if (this.carrito.length === 0) return localStorage.clear();
    this.actualizarAlmacenamiento();
  }

  cambiarProd(idProd: number, cantidad: number) {
    this.carrito = this.carrito.map((producto) => {
      const productoActual = producto;
      if (productoActual.idProd === idProd) productoActual.cantidad = cantidad;
      return productoActual;
    });
    this.actualizarAlmacenamiento();
  }

  actualizarAlmacenamiento() {
    localStorage.setItem('cart', JSON.stringify(this.carrito));
  }

  vaciar() {
    this.carrito = [];
    localStorage.clear();
  }
}
