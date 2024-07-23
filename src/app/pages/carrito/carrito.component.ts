import { PerfilService } from './../../core/services/perfil.service';
import { ProductosService } from './../../core/services/productos.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  WritableSignal,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ContadorCantidadComponent } from 'src/app/core/components/contador-cantidad/contador-cantidad.component';
import { Producto } from 'src/app/core/interface/productos';
import { CartService } from 'src/app/core/services/cart.service';
import { Numero_Whats } from 'src/app/core/services/constantes/telefono';
import { HeaderService } from 'src/app/core/services/header.service';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss'],
  imports: [CommonModule, ContadorCantidadComponent, RouterModule],
  standalone: true,
})
export class CarritoComponent {
  headerService = inject(HeaderService);
  CartService = inject(CartService);
  ProductosService = inject(ProductosService);
  perfilService = inject(PerfilService);
  router = inject(Router);

  productosCarrito: WritableSignal<Producto[]> = signal([]);
  subtotal = 0;
  delivery = 0;
  total = 0;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  ngOnInit(): void {
    this.headerService.titulo.set('Cart');
    this.buscarInfo().then(() => {
      this.calcularinfo();
    });
  }

  async buscarInfo() {
    const productos = [];
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      const res = await this.ProductosService.getById(itemCarrito.idProd);
      if (res) productos.push(res);
    }
    this.productosCarrito.set(productos);
    this.calcularinfo(); // Asegurar que se recalcula el total después de buscar la información
  }

  eliminarProd(idProd: number) {
    this.CartService.deleteProd(idProd);
    this.actualizarCarrito();
  }

  calcularinfo() {
    this.subtotal = this.CartService.carrito.reduce((acc, item, index) => {
      const producto = this.productosCarrito()[index];
      return acc + (producto.precio * item.cantidad);
    }, 0);
    this.total = this.subtotal + this.delivery;
  }

  cambiarProductoCantidad(id: number, cantidad: number) {
    this.CartService.cambiarProd(id, cantidad);
    this.actualizarCarrito();
    this.calcularinfo();
  }

  async actualizarCarrito() {
    await this.buscarInfo();
    this.calcularinfo();
  }

  async enviarMensaje() {
    let pedido = '';
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const producto = await this.ProductosService.getById(
        this.CartService.carrito[i].idProd
      );
      pedido += `*${this.CartService.carrito[i].cantidad} X ${producto?.nombre}
      `;
    }
    const mensaje = `
      Hola! Soy ${this.perfilService.perfil()?.nombre}
      Orden:

      Pedido: ${pedido}
      Teléfono: ${this.perfilService.perfil()?.telefono}

      Mesa N°: ${this.perfilService.perfil()?.direccion}

      Notas :${this.perfilService.perfil()?.detalleEntrega}

      Muchas Gracias!!!`;

    const link = `https://wa.me/${Numero_Whats}?text=${encodeURI(mensaje)}`;
    window.open(link, '_blank');
    this.dialog.nativeElement.showModal();
  }

  finalizarPedido() {
    this.CartService.vaciar();
    this.dialog.nativeElement.close();
    this.router.navigate(['/home']);
  }

  editarPedido() {
    this.dialog.nativeElement.close();
  }
}
