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
import { firstValueFrom } from 'rxjs';

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
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);
  subtotal = 0;
  delivery = 0;
  total = 0;
  extraTotal = 0;
  entrega = `${this.perfilService.perfil()?.paraLlevar ? 'Si' : 'No'}`;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  ngOnInit(): void {
    this.headerService.titulo.set('Cart');
    this.buscarInfo().then(() => {
      this.calcularinfo();
    });

  }

  async buscarInfo() {
    const productos: Array<Producto & { cantidad: number; extras: Extra[]; notas?: string }> = [];

    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      const productoObservable = this.ProductosService.getById(itemCarrito.idProd);

      try {
        const producto = await firstValueFrom(productoObservable);

        if (producto) {
          const productoValido: Producto & {
            cantidad: number;
            extras: Extra[];
            notas?: string;
          } = {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            esVegano: producto.esVegano,
            esCeliaco: producto.esCeliaco,
            // fotoUrl: producto.fotoUrl,
            productoFotoUrl: producto.productoFotoUrl,
            ingredientes: producto.ingredientes,
            cantidad: itemCarrito.cantidad,
            extras: itemCarrito.extras || [], // Asegúrate de que extras está aquí
            notas: itemCarrito.notas || '',
          };

          productos.push(productoValido);
        }
      } catch (error) {
        console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
      }
    }
    this.productosCarrito.set(productos);
    this.calcularinfo();
  }
  eliminarProd(idProd: number) {
    this.CartService.deleteProd(idProd);
    this.actualizarCarrito();
  }
  cambiarProductoCantidad(id: number, nuevaCantidad: number) {
    const itemActual = this.CartService.carrito.find(item => item.idProd === id);
    if (!itemActual) return;

    // Actualiza la cantidad en el carrito
    this.CartService.cambiarProd(id, nuevaCantidad);

    // Recalcula la información
    this.calcularinfo();
  }
  calcularinfo() {
    this.subtotal = 0;
    this.extraTotal = 0;

    this.CartService.carrito.forEach((item) => {
      const producto = this.productosCarrito().find(p => p.id === item.idProd);
      if (producto) {
        const totalExtras = item.extras?.reduce((extraAcc, extra) => extraAcc + extra.precio, 0) || 0;
        this.subtotal += producto.precio * item.cantidad;
        this.extraTotal += totalExtras;
      }
    });

    this.total = this.subtotal + this.extraTotal + this.delivery;
  }



  async actualizarCarrito() {
    await this.buscarInfo();
    this.calcularinfo();
  }

  async enviarMensaje() {
    let pedido = '';
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      try {
        const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd));
        if (producto) {
          pedido += `*${itemCarrito.cantidad} X ${producto.nombre}\n`;
          if (itemCarrito.extras && itemCarrito.extras.length > 0) {
            pedido += `${itemCarrito.extras.map(extra => extra.nombre).join(', ')}\n`;
          }
          if (itemCarrito.notas) {
            pedido += `  Notas: ${itemCarrito.notas}\n`;
          }
        }
      } catch (error) {
        console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
      }
    }
    const entrega = this.perfilService.perfil()?.paraLlevar ? 'Si' : 'No';
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
  clickSound: HTMLAudioElement;

  constructor() {
    this.clickSound = new Audio('assets/sounds/click.wav');
  }

  rate(index: number): void {
    this.rating = index;
    this.playSound();
  }

  hover(index: number): void {
    this.hoverIndex = index;
  }

  playSound(): void {
    this.clickSound.play();
  }
}
