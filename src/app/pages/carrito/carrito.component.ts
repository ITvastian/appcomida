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
  delivery = 100;
  total = 0;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  ngOnInit(): void {
    this.headerService.titulo.set('Carrito');
    this.buscarInfo().then(() => {
    this.calcularinfo();
    });
  }

  async buscarInfo() {
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      const res = await this.ProductosService.getById(itemCarrito.idProd);
      if (res) this.productosCarrito.set([...this.productosCarrito(), res]);
    }
  }

  eliminarProd(idProd: number) {
    this.CartService.deleteProd(idProd);
  }
  calcularinfo() {
    this.subtotal = 0;
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      this.subtotal +=
        this.productosCarrito()[i].precio *
        this.CartService.carrito[i].cantidad;
    }
    this.total = this.subtotal + this.delivery;
  }
  cambiarProductoCantidad(id: number, cantidad: number) {
    this.CartService.cambiarProd(id, cantidad);
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
    const mensaje = `Hola! Soy ${
      this.perfilService.perfil()?.nombre
    }, y te quiero hacer el siguiente pedido ${pedido}
    Si te queres comunicar conmigo hacelo al N° del que te hablo o al ${
      this.perfilService.perfil()?.telefono
    }
    La direccion del envio es : ${this.perfilService.perfil()?.direccion} - ${
      this.perfilService.perfil()?.detalleEntrega
    }
    Muchas Gracias`;

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
