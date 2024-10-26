import { Component, OnInit, inject } from '@angular/core';
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
  categoriasService = inject(CategoriasService);

  router = inject(Router);
  route = inject(ActivatedRoute);

  producto?: Producto;
  cantidad: number = 1;
  notas = '';
  extrasSeleccionados: Extra[] = [];

  ngOnInit(): void {
    if (this.producto?.extras) {
      this.producto.extras.forEach((extra) => (extra.seleccionado = false));
    }
    this.route.params.subscribe((params) => {
      const id = params['id'];
      // console.log('ID from route:', id);
      this.productosService.getById(id).subscribe({
        next: (producto) => {
          this.producto = producto;
          console.log('Producto:', this.producto); // Verifica los datos del producto
        },
        error: (err) => console.error('Error fetching producto:', err),
      });
    });
  }

  actualizarExtrasSeleccionados(extra: Extra): void {
    extra.seleccionado = !extra.seleccionado;
    if (extra.seleccionado) {
      if (
        !this.extrasSeleccionados.some(
          (e) => e.name === extra.name && e.price === extra.price
        )
      ) {
        this.extrasSeleccionados.push(extra);
      }
    } else {
      this.extrasSeleccionados = this.extrasSeleccionados.filter(
        (e) => e.name !== extra.name || e.price !== extra.price
      );
    }
  }

  agregarAlCarrito(): void {
    if (!this.producto) return;
    this.cartService.addProd(
      this.producto._id,
      this.cantidad,
      this.notas,
      this.extrasSeleccionados
    );
    this.router.navigate(['/carrito']);
  }
}
