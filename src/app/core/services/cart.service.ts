import { Injectable } from '@angular/core';
import { Cart } from '../interface/carrito';
import { Extra } from '../interface/productos'; // Asegúrate de que la ruta sea correcta

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
          this.carrito = parsedCart.map((item: any) => ({
            ...item,
            extras: item.extras || [], // Asegúrate de que `extras` siempre sea un array
          }));
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
    // console.log('Carrito cargado:', this.carrito);
  }

  addProd(idProd: number, cantidad: number, notas: string, extras: Extra[]) {
    // console.log('Extras recibidos:', extras);
    const i = this.carrito.findIndex((producto) => producto.idProd === idProd);
    if (i === -1) {
      const nuevoProd: Cart = {
        idProd: idProd,
        cantidad: cantidad,
        notas: notas,
        extras: extras, // Aquí pasas los `extras` directamente
        precio: 0 // Asegúrate de actualizar el precio más tarde si es necesario
      };
      this.carrito.push(nuevoProd);
    } else {
      this.carrito[i].cantidad += cantidad;
      this.carrito[i].extras = extras; // Actualiza los `extras` si ya existe el producto
      this.carrito[i].notas = notas;
    }
    this.actualizarAlmacenamiento();
  }

  deleteProd(idProd: number) {
    this.carrito = this.carrito.filter((producto) => producto.idProd !== idProd);
    if (this.carrito.length === 0) {
      localStorage.clear();
    } else {
      this.actualizarAlmacenamiento();
    }
  }

  cambiarProd(idProd: number, cantidad: number) {
    this.carrito = this.carrito.map((producto) => {
      if (producto.idProd === idProd) {
        producto.cantidad = cantidad;
      }
      return producto;
    });
    this.actualizarAlmacenamiento();
  }

  actualizarAlmacenamiento() {
    // console.log('Actualizando almacenamiento con carrito:', this.carrito);
    localStorage.setItem('cart', JSON.stringify(this.carrito));
  }

  vaciar() {
    this.carrito = [];
    localStorage.clear();
  }
}
