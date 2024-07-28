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
import { Extra, Producto } from 'src/app/core/interface/productos';
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

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: Extra[]; notas?: string })[]
  > = signal([]);
  subtotal = 0;
  delivery = 0;
  total = 0;
  extraTotal = 0;
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
      const producto = await this.ProductosService.getById(itemCarrito.idProd);
      if (producto) {
        productos.push({
          ...producto,
          cantidad: itemCarrito.cantidad,
          extras: itemCarrito.extras || [],
          notas: itemCarrito.notas || '',
        });
      }
    }
    this.productosCarrito.set(productos);
    this.calcularinfo();
  }

  eliminarProd(idProd: number) {
    this.CartService.deleteProd(idProd);
    this.actualizarCarrito();
  }
  calcularinfo() {
    this.subtotal = this.CartService.carrito.reduce((acc, item, index) => {
      const producto = this.productosCarrito()[index];
      const totalExtras = item.extras?.reduce((extraAcc, extra) => extraAcc + extra.precio, 0) || 0;
      return acc + (producto.precio * item.cantidad) + totalExtras;
    }, 0);

    this.extraTotal = this.CartService.carrito.reduce((acc, item) => {
      const totalExtras = item.extras?.reduce((extraAcc, extra) => extraAcc + extra.precio, 0) || 0;
      return acc + totalExtras;
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
      const itemCarrito = this.CartService.carrito[i];
      const producto = await this.ProductosService.getById(itemCarrito.idProd);
      if (producto) {
        pedido += `*${itemCarrito.cantidad} X ${producto.nombre}\n`;
        if (itemCarrito.extras && itemCarrito.extras.length > 0) {
          pedido += `${itemCarrito.extras
            .map((extra) => extra.nombre)
            .join(', ')}\n`;
        }
        if (itemCarrito.notas) {
          pedido += `  Notas: ${itemCarrito.notas}\n`;
        }
      }
    }
    const entrega = this.perfilService.perfil()?.paraLlevar? 'Si' : 'No';
    const mensaje = `
      Hola! Soy ${this.perfilService.perfil()?.nombre}
      Orden:

      Pedido:
      ${pedido}
      Teléfono: ${this.perfilService.perfil()?.telefono}

      Mesa N°: ${this.perfilService.perfil()?.direccion}

      Notas: ${this.perfilService.perfil()?.detalleEntrega}

      Para llevar: ${entrega}

      Muchas Gracias!!!`;

    // const link = `https://wa.me/${Numero_Whats}?text=${encodeURI(mensaje)}`;
    const link = `https://wa.me/${Numero_Whats}?text=${encodeURIComponent(mensaje)}`;
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
  stars: any[] = new Array(5);
  rating: number = 0;
  hoverIndex: number = 0;

  rate(index: number): void {
    this.rating = index;
  }

  hover(index: number): void {
    this.hoverIndex = index;
  }
}
