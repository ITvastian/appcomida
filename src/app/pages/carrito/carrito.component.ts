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
  ventasService = inject(VentasService);

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);

  subtotal = 0;
  delivery = 0;
  total = 0;
  extraTotal = 0;
  entrega = `${this.perfilService.perfil()?.paraLlevar ? 'Si' : 'No'}`;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  // Cache de productos para evitar llamadas duplicadas
  productosCache: { [id: string]: Producto } = {};

  ngOnInit(): void {
    this.headerService.titulo.set('Carrito');
    this.buscarInfo().then(() => {
      this.calcularinfo();
    });
  }

  async buscarInfo() {
    const productos: Array<Producto & { cantidad: number; extras: Extra[]; notas?: string }> = [];

    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];

      // console.log(`Solicitando producto con id: ${itemCarrito.idProd}`);

      // Revisa si el producto ya está en cache
      let producto = this.productosCache[itemCarrito.idProd];
      if (!producto) {
        try {
          // Si no está en caché, hace la solicitud
          const productoObservable = this.ProductosService.getById(itemCarrito.idProd);
          producto = await firstValueFrom(productoObservable);

          if (producto) {
            this.productosCache[itemCarrito.idProd] = producto; // Almacena en cache
            // console.log(`Producto ${itemCarrito.idProd} cacheado`);
          } else {
            console.warn(`Producto con id ${itemCarrito.idProd} no encontrado.`);
          }
        } catch (error) {
          console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
          continue; // Si hay un error con este producto, pasa al siguiente
        }
      }

      // Si el producto fue encontrado o cacheado, se añade al carrito
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
      const producto = this.productosCarrito().find(p => p._id === item.idProd);
      if (producto) {
        const totalExtras = item.extras?.reduce((extraAcc, extra) => extraAcc + extra.price, 0) || 0;
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
        const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd));
        if (producto) {
          pedido += `*${itemCarrito.cantidad} X ${producto.name}\n`;
          if (itemCarrito.extras && itemCarrito.extras.length > 0) {
            pedido += `${itemCarrito.extras.map(extra => extra.name).join(', ')}\n`;
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
  // finalizarPedido() {
  //   const perfil = this.perfilService.perfil(); // Obtener los datos del perfil
  //   const venta = {
  //     productos: this.CartService.carrito, // Los productos que están en el carrito
  //     total: this.total, // Total de la venta
  //     cliente: {
  //       nombre: perfil?.nombre,
  //       telefono: perfil?.telefono,
  //       mesa: perfil?.direccion,
  //       paraLlevar: perfil?.paraLlevar,
  //       notas: perfil?.detalleEntrega,
  //     },
  //   };

  //   // Llama al servicio para enviar los datos de la venta
  //   this.ventasService.agregarVenta(venta).subscribe({
  //     next: (respuesta) => {
  //       console.log('Venta guardada exitosamente:', respuesta);
  //       this.CartService.vaciar(); // Vaciar el carrito después de la venta
  //       this.dialog.nativeElement.close();
  //       this.router.navigate(['/home']);
  //     },
  //     error: (error) => {
  //       console.error('Error al guardar la venta:', error);
  //     },
  //   });
  // }

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
