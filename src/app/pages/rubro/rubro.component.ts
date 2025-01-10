import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WritableSignal, signal } from '@angular/core';
import { CategoriasService } from 'src/app/core/services/categorias.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { HeaderService } from 'src/app/core/services/header.service';
import { Producto } from 'src/app/core/interface/productos';
import { CommonModule } from '@angular/common';
import { TarjetaProductoComponent } from "../../core/components/tarjeta-producto/tarjeta-producto.component";

@Component({
  selector: 'app-rubro',
  templateUrl: './rubro.component.html',
  styleUrls: ['./rubro.component.scss'],
  standalone: true,
  imports: [CommonModule, TarjetaProductoComponent, RouterModule],
})
export class RubroComponent implements OnInit {
  headerService = inject(HeaderService);
  categoriasService = inject(CategoriasService);
  productosService = inject(ProductosService);
  productos: WritableSignal<Producto[]> = signal([]); 
  ac = inject(ActivatedRoute);

  ngOnInit(): void {
    this.ac.params.subscribe((params) => {
      const nombreCategoria = params['id'];
      // console.log('Nombre de la categoría desde la URL:', nombreCategoria);
      this.categoriasService.getCategoryIdByName(nombreCategoria).subscribe({
        next: (id) => {
          // console.log('ID real de la categoría:', id);
          this.productosService.getByCategory(id).subscribe({
            next: (productosFiltrados) => {
              this.productos.set(productosFiltrados);
              // console.log('Productos filtrados:', productosFiltrados);
            },
            error: (err) => {
              console.error('Error al obtener productos filtrados:', err);
            },
          });
        },
        error: (err) => {
          console.error('Error al obtener el ID de la categoría:', err);
        },
      });
    });
  }
}
