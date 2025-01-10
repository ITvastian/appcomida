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
import { firstValueFrom, reduce } from 'rxjs';
import { VentasService } from 'src/app/core/services/ventas.service';
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

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);

  subtotal: number = 0;
  delivery: number = 0;
  total: number = 0;
  extraTotal = 0;
  extra: number = 0;

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
  // Obteniendo Numbers en extras
  getNumbersFromExtras(extras: any[]): string[] {
    return extras
      .map(extra => extra.name)
      .filter(name => !isNaN(Number(name)))
      .map(name => Number(name).toString());
  }
  // Obteniendo String en extras
  getStringsFromExtras(extras: any[]): string[] {
    return extras
      .map(extra => extra.name)            // Obtiene el valor de 'name' de cada extra
      .filter(name => isNaN(Number(name)))  // Filtra solo los que no son números
  }
  async buscarInfo() {
    const productos: Array<Producto & { cantidad: number; extras: Extra[]; notas?: string }> = [];
    console.log('Productos cargados en el carrito:', productos);
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      console.log('Procesando producto del carrito:', itemCarrito);
      let producto = this.productosCache[itemCarrito.idProd];
      if (!producto) {
        try {
          // Si no está en caché, hace la solicitud
          // const productoObservable = this.ProductosService.getById(itemCarrito.idProd);
          const productoObservable = this.ProductosService.getById(itemCarrito.idProd.toString());
          producto = await firstValueFrom(productoObservable);


          if (producto) {
            this.productosCache[itemCarrito.idProd] = producto; // Almacena en cache
            // console.log(`Producto ${itemCarrito.idProd} cacheado`);
          } else {
            console.warn(`Producto con id ${itemCarrito.idProd} no encontrado.`);
          }
        } catch (error) {
          console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
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
          category: producto.category,
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

  eliminarProd(category: string) {
    this.CartService.deleteProd(String(category));
    this.actualizarCarrito();
  }

  // cambiarProductoCantidad(id: number, nuevaCantidad: number) {
  //   const itemActual = this.CartService.carrito.find(item => String(item.idProd) === String(id));
  //   console.log(`itemActual - cambiarProductoCantidad ${itemActual}`);
    
  //   if (!itemActual) return;

  //   this.CartService.cambiarProd(String(id), nuevaCantidad);

  //   const productosActualizados = this.productosCarrito().map(producto => {
  //     if (producto._id === id) {
  //       return {
  //         ...producto,
  //         cantidad: nuevaCantidad,
  //       };
  //     }
  //     return producto;
  //   });

  //   this.productosCarrito.set(productosActualizados);
  //   this.calcularinfo();
  // }
  cambiarProductoCantidad(category: string, nuevaCantidad: number) {
    const itemActual = this.CartService.carrito.find(item => String(item.idProd) === String(category));
    // console.log(`itemActual - cambiarProductoCantidad ${itemActual}`);
   
    if (!itemActual) {
      console.log("No se encontró el producto en el carrito.");
      return;
    }
    this.CartService.cambiarProd(String(category), nuevaCantidad);
    const productosActualizados = this.productosCarrito().map(producto => {
      if (producto.category === category) {
        return {
          ...producto,
          cantidad: nuevaCantidad,
        };
      }
      return producto;
    });
  
    this.productosCarrito.set(productosActualizados);
    this.calcularinfo();
  }
  calcularinfo() {
    this.subtotal = 0;
    this.extraTotal = 0;

    this.productosCarrito().forEach((item) => {
      const itemPrice = item.price ?? 0;
      const itemCantidad = item.cantidad ?? 1;
      const subtotalItem = itemPrice * itemCantidad;
      this.subtotal += subtotalItem;

      if (Array.isArray(item.extras)) {
        item.extras.forEach(extra => {
          const extraPrice = Number(extra.name);
          if (!isNaN(extraPrice)) {
            this.extraTotal += extraPrice * itemCantidad;
          }
        });
      }
    });
    this.total = this.subtotal + this.extraTotal;
  }

  async actualizarCarrito() {
    await this.buscarInfo();
    console.log('Productos en productosCarrito después de actualizar:', this.productosCarrito());
    this.calcularinfo();
  }

  async enviarMensaje() {
    let pedido = '';
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      try {
        // const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd));
        const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd.toString()));

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
      Hola! 
      Soy ${this.perfilService.perfil()?.nombre}
      Orden:
    -----------------------------------
      Pedido:
      ${pedido}
    -----------------------------------
      Teléfono: 
      ${this.perfilService.perfil()?.telefono}
    -----------------------------------
      Mesa N°: 
      ${this.perfilService.perfil()?.direccion}
    -----------------------------------
      Notas: 
      ${this.perfilService.perfil()?.detalleEntrega}
    -----------------------------------
      Total:
      $ ${this.total}
    -----------------------------------
      Para llevar: 
      ${entrega}
    -----------------------------------
      Muchas Gracias!!!`;

    const link = `https://wa.me/${Numero_Whats}?text=${encodeURIComponent(mensaje)}`;
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
      suggestion: this.suggestionText
    };

    this.http.post(this.apiUrl, feedback)
      .subscribe({
        next: (response) => {
          // console.log('Rating enviado exitosamente:', response);
        },
        error: (error) => {
          console.error('Error al enviar el rating:', error);
        }
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
