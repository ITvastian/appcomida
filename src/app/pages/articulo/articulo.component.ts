// import { Component, OnInit, inject } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { HeaderService } from 'src/app/core/services/header.service';
// import { ProductosService } from 'src/app/core/services/productos.service';
// import { Producto, Extra } from 'src/app/core/interface/productos';
// import { CartService } from 'src/app/core/services/cart.service';
// import { CommonModule } from '@angular/common';
// import { ContadorCantidadComponent } from 'src/app/core/components/contador-cantidad/contador-cantidad.component';
// import { FormsModule } from '@angular/forms';
// import { CategoriasService } from 'src/app/core/services/categorias.service';

// @Component({
//   selector: 'app-articulo',
//   templateUrl: './articulo.component.html',
//   styleUrls: ['./articulo.component.scss'],
//   standalone: true,
//   imports: [CommonModule, ContadorCantidadComponent, FormsModule],
// })
// export class ArticuloComponent implements OnInit {
//   headerService = inject(HeaderService);
//   productosService = inject(ProductosService);
//   cartService = inject(CartService);
//   categoriasService = inject(CategoriasService);

//   router = inject(Router);
//   route = inject(ActivatedRoute);

//   producto?: Producto;
//   cantidad: number = 1;
//   notas = '';
//   extrasSeleccionados: Extra[] = [];

//   ngOnInit(): void {
//     if (this.producto?.extras) {
//       this.producto.extras.forEach((extra) => (extra.seleccionado = false));
//     }
//     this.route.params.subscribe((params) => {
//       const id = params['id'];
//       // console.log('ID from route:', id);
//       this.productosService.getById(id).subscribe({
//         next: (producto) => {
//           this.producto = producto;
//           // console.log('Producto:', this.producto);
//         },
//         error: (err) => console.error('Error fetching producto:', err),
//       });
//     });
//   }

//   actualizarExtrasSeleccionados(extra: Extra): void {
//     extra.seleccionado = !extra.seleccionado;
//     if (extra.seleccionado) {
//       if (
//         !this.extrasSeleccionados.some(
//           (e) => e.name === extra.name && e.price === extra.price
//         )
//       ) {
//         this.extrasSeleccionados.push(extra);
//       }
//     } else {
//       this.extrasSeleccionados = this.extrasSeleccionados.filter(
//         (e) => e.name !== extra.name || e.price !== extra.price
//       );
//     }
//   }

//   agregarAlCarrito(): void {
//     if (!this.producto) return;
//     this.cartService.addProd(
//       this.producto._id,
//       this.cantidad,
//       this.notas,
//       this.extrasSeleccionados
//     );
//     this.router.navigate(['/carrito']);
//   }
// }

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
    this.route.params.subscribe((params) => {
      const id = params['id']; // Obtén el ID del producto desde la ruta
      console.log('ID de producto desde la ruta:', id); // Verifica si el ID es correcto
      if (id) {
        const productId = Number(id); // Convierte el id a número
        if (!isNaN(productId)) { // Verifica que el id convertido sea un número válido
          this.productosService.getById(productId).subscribe({
            next: (producto) => {
              console.log('Producto recibido:', producto); // Verifica si el producto llega
              this.producto = producto;
              if (this.producto.extras) {
                this.producto.extras.forEach((extra) => (extra.seleccionado = false));

              }
            },
            error: (err) => console.error('Error fetching producto:', err),
          });
        } else {
          console.error('Invalid product ID:', id);
        }
      }
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
    if (this.producto._id) { // Asegúrate de que _id no sea undefined
      this.cartService.addProd(
        Number(this.producto._id),  // Usa _id en lugar de id
        this.cantidad,
        this.notas,
        this.extrasSeleccionados
      );
      this.router.navigate(['/carrito']);
    } else {
      console.error('Producto no tiene un ID válido');
    }
  }
}
