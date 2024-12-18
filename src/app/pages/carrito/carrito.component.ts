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
import { VentasService } from 'src/app/core/services/ventas.service';
import { TelService } from 'src/app/core/services/tel.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss'],
  imports: [CommonModule, ContadorCantidadComponent, RouterModule, FormsModule],
  standalone: true,
})
export class CarritoComponent {
  headerService = inject(HeaderService);
  CartService = inject(CartService);
  ProductosService = inject(ProductosService);
  perfilService = inject(PerfilService);
  router = inject(Router);
  ventasService = inject(VentasService);
  telService = inject(TelService);

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);

  private mensajeUrl: string = 'http://localhost:3001/api/mensaje';
  // private apiUrl: string = 'https://mvp-admin.onrender.com/api/mensaje';

  subtotal = 0;
  delivery = 0;
  total = 0;
  extraTotal = 0;
  entrega = `${this.perfilService.perfil()?.paraLlevar ? 'Si' : 'No'}`;

  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  // Cache de productos para evitar llamadas duplicadas
  productosCache: { [id: string]: Producto } = {};

  ngOnInit(): void {
    this.cargarNumeros();
    this.headerService.titulo.set('Carrito');
    this.buscarInfo().then(() => {
      this.calcularinfo();
    });
  }

  numeros: string[] = [];
  numeroWhatsApp: string = ''; // Variable para almacenar el número de WhatsApp

  cargarNumeros(): void {
    this.telService.getNumeros().subscribe({
      next: (data) => {
        this.numeros = data;
        this.numeroWhatsApp = this.numeros[0]; // Asigna el primer número de la lista
      },
      error: (error) => {
        console.error('Error al obtener números', error);
      },
      complete: () => {
        console.log('Carga de números completada');
      },
    });
  }

  // cargarNumeros(): void {
  //   this.telService.getNumeros().subscribe({
  //     next: (data) => {
  //       this.numeros = data;
  //       if (this.numeros.length > 0) {
  //         this.numeroWhatsApp = this.numeros[0];
  //       } else {
  //         console.warn('La lista de números está vacía');
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error al obtener números', error);
  //     },
  //     complete: () => {
  //     },
  //   });
  // }
  async buscarInfo() {
    const productos: Array<
      Producto & { cantidad: number; extras: Extra[]; notas?: string }
    > = [];

    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];

      // console.log(`Solicitando producto con id: ${itemCarrito.idProd}`);

      // Revisa si el producto ya está en cache
      let producto = this.productosCache[itemCarrito.idProd];
      if (!producto) {
        try {
          // Si no está en caché, hace la solicitud
          const productoObservable = this.ProductosService.getById(
            itemCarrito.idProd
          );
          producto = await firstValueFrom(productoObservable);

          if (producto) {
            this.productosCache[itemCarrito.idProd] = producto; // Almacena en cache
            // console.log(`Producto ${itemCarrito.idProd} cacheado`);
          } else {
            console.warn(
              `Producto con id ${itemCarrito.idProd} no encontrado.`
            );
          }
        } catch (error) {
          console.error(
            `Error al obtener el producto con id ${itemCarrito.idProd}:`,
            error
          );
          continue;
        }
      }

      if (producto) {
        const productoValido: Producto & {
          cantidad: number;
          extras: Extra[];
          notas?: string;
        } = {
          _id: producto._id,
          name: producto.name,
          price: producto.price,
          esVegano: producto.esVegano,
          esCeliaco: producto.esCeliaco,
          photoUrl: producto.photoUrl,
          ingredients: producto.ingredients,
          cantidad: itemCarrito.cantidad,
          extras: itemCarrito.extras || [],
          notas: itemCarrito.notas || '',
        };

        productos.push(productoValido);
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
    const itemActual = this.CartService.carrito.find(
      (item) => item.idProd === id
    );
    if (!itemActual) return;
    this.CartService.cambiarProd(id, nuevaCantidad);
    this.calcularinfo();
  }

  calcularinfo() {
    this.subtotal = 0;
    this.extraTotal = 0;

    this.CartService.carrito.forEach((item) => {
      const producto = this.productosCarrito().find(
        (p) => p._id === item.idProd
      );
      if (producto) {
        const totalExtras =
          item.extras?.reduce((extraAcc, extra) => extraAcc + extra.price, 0) ||
          0;
        this.subtotal += producto.price * item.cantidad;
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
        const producto = await firstValueFrom(
          this.ProductosService.getById(itemCarrito.idProd)
        );
        if (producto) {
          pedido += `*${itemCarrito.cantidad} X ${producto.name}\n`;
          if (itemCarrito.extras && itemCarrito.extras.length > 0) {
            pedido += `${itemCarrito.extras
              .map((extra) => extra.name)
              .join(', ')}\n`;
          }
          if (itemCarrito.notas) {
            pedido += `  Notas: ${itemCarrito.notas}\n`;
          }
        }
      } catch (error) {
        console.error(
          `Error al obtener el producto con id ${itemCarrito.idProd}:`,
          error
        );
      }
    }
    const entrega = this.perfilService.perfil()?.paraLlevar ? 'Si' : 'No';
    const mensaje = `
      Hola! Soy ${this.perfilService.perfil()?.nombre}
      Orden:

      ---------------------------------------------------------
      Pedido:
      ${pedido}
      ---------------------------------------------------------
      Teléfono: ${this.perfilService.perfil()?.telefono}
      ---------------------------------------------------------
      Mesa N°: ${this.perfilService.perfil()?.direccion}
      ---------------------------------------------------------
      Notas: ${this.perfilService.perfil()?.detalleEntrega}
      ---------------------------------------------------------
      Para llevar: ${entrega}
      ---------------------------------------------------------
      Total: ${this.total}

      Muchas Gracias!!!`;

    // Send Backend Mensaje
    this.http.post(this.mensajeUrl, { mensaje }).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error al enviar el mensaje al backend:', error);
      },
    });

    const link = `https://wa.me/${
      this.numeroWhatsApp
    }?text=${encodeURIComponent(mensaje)}`;
    window.open(link, '_blank');
    this.dialog.nativeElement.showModal();
  }

  stars: any[] = new Array(5);
  rating: number = 0;
  hoverIndex: number = 0;
  // private apiUrl: string = 'http://localhost:3001/api/rating';
  private apiUrl: string = 'https://mvp-admin.onrender.com/api/rating';
  clickSound: HTMLAudioElement;
  suggestionText = '';

  constructor(private http: HttpClient) {
    this.clickSound = new Audio('assets/sounds/click.wav');
  }

  async enviarCalificacion() {
    const feedback = {
      rating: this.rating,
      suggestion: this.suggestionText,
    };

    this.http.post(this.apiUrl, feedback).subscribe({
      next: (response) => {
        // console.log('Rating enviado exitosamente:', response);
      },
      error: (error) => {
        console.error('Error al enviar el rating:', error);
      },
    });
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

  finalizarPedido() {
    this.CartService.vaciar();
    this.dialog.nativeElement.close();
    this.router.navigate(['/home']);
    this.enviarCalificacion();
    this.suggestionText = '';
    this.rating = 0;
  }

  editarPedido() {
    this.dialog.nativeElement.close();
  }
}
