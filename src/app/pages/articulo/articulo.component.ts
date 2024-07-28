import { ActivatedRoute, Router } from '@angular/router';
import { Component, inject, signal } from '@angular/core';
import { HeaderService } from 'src/app/core/services/header.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { Producto, Extra } from 'src/app/core/interface/productos';
import { CommonModule } from '@angular/common';
import { ContadorCantidadComponent } from 'src/app/core/components/contador-cantidad/contador-cantidad.component';
import { CartService } from 'src/app/core/services/cart.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-articulo',
  templateUrl: './articulo.component.html',
  styleUrls: ['./articulo.component.scss'],
  standalone: true,
  imports: [CommonModule, ContadorCantidadComponent, FormsModule],
})
export class ArticuloComponent {
  headerService = inject(HeaderService);
  ProductosService = inject(ProductosService);
  CartService = inject(CartService);

  producto?: Producto;
  cantidad = signal(1);
  notas = "";
  extrasSeleccionados: Extra[] = [];

  ngOnInit(): void {
    this.headerService.titulo.set('articulo');
    if (this.producto?.extras) {
      this.producto.extras.forEach(extra => extra.seleccionado = false); // Asegúrate de inicializar
    }
  }

  constructor(private ac: ActivatedRoute, private router: Router) {
    ac.params.subscribe((param) => {
      if (param['id']) {
        this.ProductosService.getById(param['id']).then((producto) => {
          this.producto = producto;
          if (this.producto && this.producto.extras) {
            // console.log('Producto con extras:', this.producto); // Verifica el estado del producto
            this.producto.extras.forEach(extra => extra.seleccionado = false);
          }
          this.headerService.titulo.set(producto!.nombre);
        });
      }
    });
  }

  actualizarExtrasSeleccionados(extra: Extra): void {
    extra.seleccionado = !extra.seleccionado;
    if (extra.seleccionado) {
      if (!this.extrasSeleccionados.some(e => e.nombre === extra.nombre && e.precio === extra.precio)) {
        this.extrasSeleccionados.push(extra);
      }
    } else {
      this.extrasSeleccionados = this.extrasSeleccionados.filter(e => e.nombre !== extra.nombre || e.precio !== extra.precio);
    }
    // console.log('Extras seleccionados después de actualizar:', this.extrasSeleccionados); // Debugging line
  }

  agregarAlCarrito(): void {
    if (!this.producto) return;
    // console.log('Extras seleccionados al agregar al carrito:', this.extrasSeleccionados); // Debugging line
    this.CartService.addProd(
      this.producto.id,
      this.cantidad(),
      this.notas,
      this.extrasSeleccionados
    );
    this.router.navigate(['/carrito']);
  }

}
