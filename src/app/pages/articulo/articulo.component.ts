
import { Component, DestroyRef, OnInit, inject, EventEmitter, Input, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeService } from 'src/app/core/services/realtime.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderService } from 'src/app/core/services/header.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { Producto, Extra } from 'src/app/core/interface/productos';
import { CartService } from 'src/app/core/services/cart.service';
import { CommonModule } from '@angular/common';
import { ContadorCantidadComponent } from 'src/app/core/components/contador-cantidad/contador-cantidad.component';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from 'src/app/core/services/categorias.service';

@Component({
  selector: 'app-articulo',
  templateUrl: './articulo.component.html',
  styleUrls: ['./articulo.component.scss'],
  standalone: true,
  imports: [CommonModule, ContadorCantidadComponent, FormsModule],
})
export class ArticuloComponent implements OnInit {
  headerService = inject(HeaderService);
  productosService = inject(ProductosService);
  cartService = inject(CartService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  realtimeService = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  producto?: Producto;
  cantidad: number = 1;
  notas: string = '';
  // extrasSeleccionados: any[] = [];
  extrasSeleccionados: Extra[] = [];


  ngOnInit(): void {
    this.numero.set(this.cantidadInicial);

    this.route.paramMap.subscribe((params) => {
      const productId = params.get('id') || params.get('category');

      if (!productId) {
        console.error('No se recibió un identificador válido desde la URL.');
        return;
      }

      this.productosService.getById(productId).subscribe((producto) => {
        if (producto && producto._id) {
          this.producto = producto;
          this.procesarExtras(this.producto);
          return;
        }

        this.productosService.getByCategory(productId).subscribe((productos) => {
          if (productos.length > 0) {
            this.producto = productos[0];
            this.procesarExtras(this.producto);
            console.log('Producto encontrado por categoría:', this.producto);
            return;
          }

          console.log('No se encontró ningún producto para:', productId);
        });
      });
    });

    this.realtimeService
      .menuChanges('productos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refrescarProducto());
  }

  // Trae precio/extras actualizados y conserva los extras elegidos que sigan existiendo.
  private refrescarProducto(): void {
    const productoId = String(this.producto?._id || '').trim();
    if (!productoId) {
      return;
    }

    this.productosService.getById(productoId).subscribe((producto) => {
      if (!producto?._id) {
        return;
      }
      this.procesarExtras(producto);
      this.producto = producto;
      this.extrasSeleccionados = this.extrasSeleccionados
        .map((elegido) => producto.extras.find((extra) => extra.name === elegido.name))
        .filter((extra): extra is Extra => !!extra);
    });
  }

  private procesarExtras(producto: Producto | undefined): void {
    if (!producto || !producto.extras || !Array.isArray(producto.extras)) {
      return;
    }

    producto.extras = producto.extras.map((extra) => ({
      name: typeof extra === 'string' ? extra : extra.name,
      price: extra.price || 0,
      seleccionado: false,
    })) as Extra[];

    console.log('Extras procesados:', producto.extras);
  }
  numero = signal(1);
  @Output() cantidadNueva = new EventEmitter<number>();
  @Input() cantidadInicial = 1;


  actualizarNum(dif: number) {
    this.numero.set(Math.max(this.numero() + dif, 1));
    this.cantidad = this.numero();
    this.cantidadNueva.emit(this.numero());
  }
  // actualizarExtrasSeleccionados(extra: Extra): void {
  //   const index = this.extrasSeleccionados.findIndex((e) => e.name === extra.name);
  //   if (index === -1) {
  //     this.extrasSeleccionados.push(extra);
  //   } else {
  //     this.extrasSeleccionados.splice(index, 1);
  //   }
  //   console.log('Extras seleccionados:', this.extrasSeleccionados);
  // }
  actualizarExtrasSeleccionados(extra: Extra): void {

    const index = this.extrasSeleccionados.findIndex(
      (e) => e.name === extra.name
    );

    if (index === -1) {

      if (this.extrasSeleccionados.length >= 3) {
        return;
      }

      this.extrasSeleccionados.push(extra);

    } else {

      this.extrasSeleccionados.splice(index, 1);

    }

    console.log(
      'Extras seleccionados:',
      this.extrasSeleccionados
    );
  }



  agregarAlCarrito(): void {
    if (!this.producto) {
      console.error('Producto no está definido.');
      return;
    }

    const productoId = String(this.producto._id || '').trim();
    if (!productoId) {
      console.error('El producto no tiene un ID válido:', this.producto);
      return;
    }

    this.cartService.addProd(
      String(productoId),
      this.cantidad,
      this.notas,
      this.extrasSeleccionados
    );

    this.router.navigate(['/carrito']);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  extraSeleccionado(extra: Extra): boolean {
    return this.extrasSeleccionados.some(
      (e) => e.name === extra.name
    );
  }

  get totalExtras(): number {
    return this.extrasSeleccionados.reduce(
      (total, extra) => total + Number(extra.price || 0),
      0
    );
  }

  get total(): number {
    const precioProducto = Number(this.producto?.price || 0);

    return (precioProducto + this.totalExtras) * this.cantidad;
  }

}