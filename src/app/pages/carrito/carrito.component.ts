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
import { HeaderService } from 'src/app/core/services/header.service';
import { firstValueFrom, reduce } from 'rxjs';
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

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);
  cargandoCarrito = signal(true);

  subtotal: number = 0;
  delivery: number = 0;
  total: number = 0;
  extraTotal = 0;
  extra: number = 0;
  entrega = `${this.perfilService.perfil()?.takeAway ? 'Si' : 'No'}`;

  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  private apiUrl: string = 'http://localhost:3001/api/salon/order';
  // private apiUrl: string = 'https://mvp-admin.onrender.com/api/salon/tables';

  // Cache de productos para evitar llamadas duplicadas
  productosCache: { [id: string]: Producto } = {};

  ngOnInit(): void {
    this.headerService.titulo.set('Carrito');
    this.cargandoCarrito.set(true);
    this.buscarInfo().finally(() => {
      this.calcularinfo();
      this.cargandoCarrito.set(false);
    });
  }

  getExtraName(extra: any): string {
    if (typeof extra?.name === 'string' && extra.name.trim()) {
      return extra.name;
    }
    return 'Extra';
  }

  getExtraPrice(extra: any): number {
    if (extra?.price !== undefined && extra?.price !== null && !isNaN(Number(extra.price))) {
      return Number(extra.price);
    }

    // Compatibilidad con datos viejos donde el precio llegaba en extra.name
    if (typeof extra?.name === 'string' && !isNaN(Number(extra.name))) {
      return Number(extra.name);
    }

    return 0;
  }

  getExtrasWithPrice(extras: any[]): any[] {
    if (!Array.isArray(extras)) {
      return [];
    }
    return extras.filter((extra) => this.getExtraPrice(extra) > 0);
  }
  
  formatPrice(value: number): string {
    const safeValue = Number(value);
    if (isNaN(safeValue)) {
      return '0';
    }
    return new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 0,
    }).format(safeValue);
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
          const productoObservable = this.ProductosService.getById(itemCarrito.idProd.toString());
          producto = await firstValueFrom(productoObservable);


          if (producto) {
            this.productosCache[itemCarrito.idProd] = producto;
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

  cambiarProductoCantidad(category: string, nuevaCantidad: number) {
    const itemActual = this.CartService.carrito.find(item => String(item.idProd) === String(category));
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
          const extraPrice = this.getExtraPrice(extra);
          if (extraPrice > 0) {
            this.extraTotal += extraPrice * itemCantidad;
          }
        });
      }
    });
    this.total = this.subtotal + this.extraTotal;
  }

  async actualizarCarrito() {
    this.cargandoCarrito.set(true);
    try {
      await this.buscarInfo();
      console.log('Productos en productosCarrito después de actualizar:', this.productosCarrito());
      this.calcularinfo();
    } finally {
      this.cargandoCarrito.set(false);
    }
  }

  async enviarMensaje() {
    const items: any[] = [];
    
    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      try {
        const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd.toString()));

        if (producto) {
          items.push({
            productId: producto._id,
            name: producto.name,
            quantity: itemCarrito.cantidad,
            price: producto.price
          });
        }
      } catch (error) {
        console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
      }
    }

    const orden = {
      tableNumber: Number(this.perfilService.perfil()?.direccion) || 0,
      orderId: `ORD-${Date.now()}`,
      customerName: this.perfilService.perfil()?.nombre || 'Cliente',
      takeAway: this.perfilService.perfil()?.takeAway ?? false,
      items: items
    };

    this.http.post(this.apiUrl, orden).subscribe({
      next: (response) => {
        console.log('Orden enviada exitosamente al servidor:', response);
        this.dialog.nativeElement.showModal();
      },
      error: (err) => {
        console.error('Error al enviar la orden:', err);
        alert('Error al enviar la orden. Intenta de nuevo.');
      }
    });
  }

  stars: any[] = new Array(5);
  rating: number = 0;
  hoverIndex: number = 0;
  private ratingApiUrl: string = 'http://localhost:3001/api/rating';
  // private ratingApiUrl: string = 'https://mvp-admin.onrender.com/api/rating';
  clickSound: HTMLAudioElement;
  suggestionText = '';

  constructor(private http: HttpClient) {
    this.clickSound = new Audio('assets/sounds/click.wav');
  }




  // Enviando calificacion y notas al backend. 
  async enviarCalificacion() {
    const feedback = {
      rating: this.rating,
      suggestion: this.suggestionText
    };

    this.http.post(this.ratingApiUrl, feedback)
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
    const venta = {
      productos: this.CartService.carrito,
      subtotal: this.subtotal,
      extras: this.extraTotal,
      total: this.total,
      fecha: new Date()
    };
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
