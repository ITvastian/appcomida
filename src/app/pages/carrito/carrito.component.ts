import { PerfilService } from './../../core/services/perfil.service';
import { ProductosService } from './../../core/services/productos.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
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
import { TenantContextService } from 'src/app/core/services/tenant-context.service';
import { firstValueFrom, reduce } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiConfigService } from 'src/app/core/services/api-config.service';
import { RealtimeService } from 'src/app/core/services/realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss'],
  imports: [CommonModule, ContadorCantidadComponent, RouterModule, FormsModule],
  standalone: true,
})
export class CarritoComponent implements OnDestroy {
  headerService = inject(HeaderService);
  CartService = inject(CartService);
  ProductosService = inject(ProductosService);
  perfilService = inject(PerfilService);
  tenantContextService = inject(TenantContextService);
  apiConfigService = inject(ApiConfigService);
  router = inject(Router);
  realtimeService = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  productosCarrito: WritableSignal<
    (Producto & { cantidad: number; extras: any[]; notas?: string })[]
  > = signal([]);
  cargandoCarrito = signal(true);
  perfilIncompletoAlert = signal(false);
  private perfilAlertTimer?: ReturnType<typeof setTimeout>;
  private perfilAlertRestartTimer?: ReturnType<typeof setTimeout>;
  paso = 1;

  subtotal: number = 0;
  delivery: number = 0;
  total: number = 0;
  extraTotal = 0;
  extra: number = 0;
  entrega = `${this.perfilService.perfil()?.takeAway ? 'Si' : 'No'}`;

  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('tableDialog') tableDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('errorDialog') errorDialog!: ElementRef<HTMLDialogElement>;
  tituloErrorPedido = '';
  mensajeErrorPedido = '';
  private readonly apiUrl = this.apiConfigService.api('/salon/order');

  // Cache de productos para evitar llamadas duplicadas
  productosCache: { [id: string]: Producto } = {};

  ngOnInit(): void {
    this.headerService.titulo.set('Carrito');
    this.cargandoCarrito.set(true);
    this.buscarInfo().finally(() => {
      this.calcularinfo();
      this.cargandoCarrito.set(false);
    });

    this.realtimeService
      .menuChanges('productos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sincronizarConMenu());
  }

  // El servidor siempre cobra el precio actual: al cambiar el menú se recalcula el carrito
  // y se sacan los productos que ya no existen, avisándole al cliente.
  private async sincronizarConMenu(): Promise<void> {
    let catalogo: Producto[];
    try {
      catalogo = await firstValueFrom(this.ProductosService.getAllProducts());
    } catch (error) {
      // Sin catálogo no se puede saber qué se borró; no tocar el carrito.
      console.error('No se pudo sincronizar el carrito con el menú:', error);
      return;
    }

    const existe = (id: string) =>
      catalogo.some((p) => String(p._id).trim() === id || String(p.category).trim() === id);

    const eliminados: string[] = [];
    for (const item of [...this.CartService.carrito]) {
      const id = String(item.idProd).trim();
      if (!existe(id)) {
        const nombre = this.productosCarrito().find((p) => String(p._id) === id)?.name
          ?? this.productosCache[id]?.name;
        eliminados.push(nombre || 'Un producto');
        this.CartService.deleteProd(id);
      }
    }

    this.productosCache = {};
    for (const producto of catalogo) {
      this.productosCache[String(producto._id).trim()] = producto;
    }
    await this.buscarInfo();

    if (eliminados.length > 0) {
      this.abrirDialogoAviso(
        'Actualizamos el menú',
        eliminados.length === 1
          ? `${eliminados[0]} ya no está disponible y lo sacamos de tu pedido.`
          : `Estos productos ya no están disponibles y los sacamos de tu pedido: ${eliminados.join(', ')}.`
      );
    }
  }

  ngOnDestroy(): void {
    if (this.perfilAlertTimer) {
      clearTimeout(this.perfilAlertTimer);
    }
    if (this.perfilAlertRestartTimer) {
      clearTimeout(this.perfilAlertRestartTimer);
    }
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

  // Los extras guardados en localStorage solo identifican cuáles eligió el cliente (por nombre).
  // El precio siempre sale del producto que devuelve la API; los que no existen en el producto se descartan.
  private resolverExtrasDesdeProducto(extrasCarrito: any[] | undefined, producto: Producto): Extra[] {
    if (!Array.isArray(extrasCarrito) || !Array.isArray(producto.extras)) {
      return [];
    }

    const extrasProducto = new Map<string, Extra>();
    for (const extra of producto.extras as any[]) {
      const name = typeof extra === 'string' ? extra : extra?.name;
      if (typeof name === 'string' && name.trim()) {
        extrasProducto.set(name.trim(), { name: name.trim(), price: this.getExtraPrice(extra) });
      }
    }

    const resueltos: Extra[] = [];
    for (const extra of extrasCarrito) {
      const encontrado = extrasProducto.get(this.getExtraName(extra).trim());
      if (encontrado && !resueltos.some((e) => e.name === encontrado.name)) {
        resueltos.push(encontrado);
      }
    }
    return resueltos;
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
        const resolvedId = String(producto._id || '').trim();
        if (!resolvedId) {
          continue;
        }

        const productoValido: Producto & {
          cantidad: number;
          extras: Extra[];
          notas?: string;
        } = {
          _id: resolvedId,
          category: producto.category,
          name: producto.name,
          price: producto.price,
          esVegano: producto.esVegano,
          esCeliaco: producto.esCeliaco,
          photoUrl: producto.photoUrl,
          ingredients: producto.ingredients,
          cantidad: itemCarrito.cantidad,
          extras: this.resolverExtrasDesdeProducto(itemCarrito.extras, producto),
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
      if (String(producto._id) === String(category)) {
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
    const tenantId = this.tenantContextService.getTenantId();
    const takeAway = this.perfilService.perfil()?.takeAway ?? false;
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!takeAway && !tableNumber) {
      this.abrirDialogoMesa('No encontramos el número de mesa de ingreso. Volve a entrar desde el QR de la mesa.');
      return false;
    }

    const items: any[] = [];

    for (let i = 0; i < this.CartService.carrito.length; i++) {
      const itemCarrito = this.CartService.carrito[i];
      try {
        const producto = await firstValueFrom(this.ProductosService.getById(itemCarrito.idProd.toString()));

        if (producto) {
          const productId = String(producto._id ?? '').trim();
          if (!productId) {
            console.warn('Producto sin _id valido. Se omite en la orden.', producto);
            continue;
          }

          items.push({
            productId,
            name: producto.name,
            quantity: itemCarrito.cantidad,
            price: producto.price,
            extras: this.resolverExtrasDesdeProducto(itemCarrito.extras, producto).map((extra) => ({
              name: extra.name,
              price: extra.price,
              quantity: 1,
            })),
          });
        }
      } catch (error) {
        console.error(`Error al obtener el producto con id ${itemCarrito.idProd}:`, error);
      }
    }

    const orden = {
      tenantId,
      tableNumber,
      customerName: this.perfilService.perfil()?.nombre || 'Cliente',
      takeAway,
      items: items
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.apiUrl, orden, {
          headers: new HttpHeaders({
            'x-tenant-id': tenantId,
          }),
        })
      );
      console.log('Orden enviada exitosamente al servidor:', response);
      return true;
    } catch (err) {
      console.error('Error al enviar la orden:', err);
      const mensajeBackend = (err as any)?.error?.message ?? (err as any)?.error?.error;
      this.abrirDialogoError(
        typeof mensajeBackend === 'string' && mensajeBackend.trim()
          ? mensajeBackend
          : 'Error al enviar la orden. Intenta de nuevo.'
      );
      return false;
    }
  }

  stars: any[] = new Array(5);
  rating: number = 0;
  hoverIndex: number = 0;
  private readonly ratingApiUrl = this.apiConfigService.api('/rating');
  clickSound: HTMLAudioElement;
  suggestionText = '';
  numeroMesaIngresado = '';
  mensajeMesaDialog = 'Ingresa el numero de mesa para continuar.';
  errorNumeroMesa = '';

  constructor(private http: HttpClient) {
    this.clickSound = new Audio('assets/sounds/click.wav');
  }




  // Enviando calificacion y notas al backend. 
  async enviarCalificacion() {
    const tenantId = this.tenantContextService.getTenantId();
    const feedback = {
      tenantId,
      rating: this.rating,
      suggestion: this.suggestionText
    };

    try {
      await firstValueFrom(
        this.http.post(this.ratingApiUrl, feedback, {
          headers: new HttpHeaders({
            'x-tenant-id': tenantId,
          }),
        })
      );
    } catch (error) {
      console.error('Error al enviar el rating:', error);
    }
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


  abrirConfirmacionPedido() {
    if (!this.perfilService.perfil()) {
      this.animarPerfilIncompleto();
      return;
    }

    const takeAway = this.perfilService.perfil()?.takeAway ?? false;
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!takeAway && !tableNumber) {
      this.abrirDialogoMesa('No encontramos el número de mesa de ingreso. Volve a entrar desde el QR de la mesa.');
      return;
    }
    this.paso = 1;
    this.dialog.nativeElement.showModal();
  }

  private animarPerfilIncompleto(): void {
    if (this.perfilAlertTimer) {
      clearTimeout(this.perfilAlertTimer);
    }
    if (this.perfilAlertRestartTimer) {
      clearTimeout(this.perfilAlertRestartTimer);
    }

    this.perfilIncompletoAlert.set(false);
    this.perfilAlertRestartTimer = setTimeout(() => {
      this.perfilIncompletoAlert.set(true);
      this.perfilAlertTimer = setTimeout(() => {
        this.perfilIncompletoAlert.set(false);
      }, 1000);
    }, 0);
  }

  abrirDialogoMesa(mensajeInfo?: string) {
    this.mensajeMesaDialog = mensajeInfo || 'Ingresa el numero de mesa para continuar.';
    this.errorNumeroMesa = '';
    this.numeroMesaIngresado = '';
    if (this.dialog?.nativeElement?.open) {
      this.dialog.nativeElement.close();
    }
    this.tableDialog?.nativeElement?.showModal();
  }

  abrirDialogoError(mensaje: string) {
    this.abrirDialogoAviso('No pudimos enviar tu pedido', mensaje);
  }

  private abrirDialogoAviso(titulo: string, mensaje: string) {
    this.tituloErrorPedido = titulo;
    this.mensajeErrorPedido = mensaje;
    if (this.dialog?.nativeElement?.open) {
      this.dialog.nativeElement.close();
    }
    this.errorDialog?.nativeElement?.showModal();
  }

  cerrarDialogoError() {
    this.errorDialog.nativeElement.close();
  }

  cancelarIngresoMesa() {
    this.errorNumeroMesa = '';
    this.numeroMesaIngresado = '';
    this.tableDialog.nativeElement.close();
  }

  confirmarNumeroMesa() {
    const mesa = Number(this.numeroMesaIngresado);
    if (!Number.isInteger(mesa) || mesa <= 0) {
      this.errorNumeroMesa = 'El número de mesa debe ser mayor a 0';
      return;
    }

    localStorage.setItem('tableNumber', String(mesa));
    this.errorNumeroMesa = '';
    this.tableDialog.nativeElement.close();
    this.abrirConfirmacionPedido();
  }

  async finalizarPedido(enviarCalificacion: boolean) {
    const ordenEnviada = await this.enviarMensaje();
    if (!ordenEnviada) {
      return;
    }

    if (enviarCalificacion) {
      await this.enviarCalificacion();
    }

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
    this.suggestionText = '';
    this.rating = 0;
  }

  editarPedido() {
    this.dialog.nativeElement.close();
  }
}
