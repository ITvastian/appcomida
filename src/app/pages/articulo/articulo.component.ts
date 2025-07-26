
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
  router = inject(Router);
  route = inject(ActivatedRoute);

  producto?: Producto;
  cantidad: number = 1;
  notas: string = '';
  extrasSeleccionados: any[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const categoryId = params.get('category');
      if (!categoryId) {
        console.error('No se recibió categoría desde la URL.');
      }
      if (categoryId) {
        this.productosService.getByCategory(categoryId).subscribe((productos) => {
          if (productos.length > 0) {
            this.producto = productos[0];
            console.log('Producto encontrado:', this.producto);

            if (this.producto?.extras && Array.isArray(this.producto.extras)) {
              // Aseguramos que cada extra tenga las propiedades necesarias
              this.producto.extras = this.producto.extras.map((extra) => ({
                name: typeof extra === 'string' ? extra : extra.name,
                price: extra.price || 0, // Usamos un precio predeterminado si no está definido
                seleccionado: false, // Por defecto no seleccionado
              })) as Extra[];
              console.log('Extras procesados:', this.producto.extras);
            }
          } else {
            console.log('No se encontraron productos para la categoría:', categoryId);
          }
        });
      } else {
        console.log('No se recibió una categoría válida.');
      }
    });
  }

  actualizarExtrasSeleccionados(extra: Extra): void {
    const index = this.extrasSeleccionados.findIndex((e) => e.name === extra.name);
    if (index === -1) {
      this.extrasSeleccionados.push(extra);
    } else {
      this.extrasSeleccionados.splice(index, 1);
    }
    console.log('Extras seleccionados:', this.extrasSeleccionados);
  }

  agregarAlCarrito(): void {
    if (!this.producto) {
      console.error('Producto no está definido.');
      return;
    }
  
    const productoId = this.producto.category;
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
}