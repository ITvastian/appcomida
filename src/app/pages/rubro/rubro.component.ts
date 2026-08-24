import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WritableSignal, signal } from '@angular/core';
import { CategoriasService } from 'src/app/core/services/categorias.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { HeaderService } from 'src/app/core/services/header.service';
import { TitleHeaderService } from 'src/app/core/services/title-header.service';
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
  titleHeaderService = inject(TitleHeaderService);
  productos: WritableSignal<Producto[]> = signal([]); 
  categoryName = signal('');
  titleActive = signal(false);
  ac = inject(ActivatedRoute);

  ngOnInit(): void {
    // Obtener estado de titleActive de Firestore
    this.titleHeaderService.getCurrentTitle().subscribe((titleData) => {
      if (titleData?.isActive !== undefined) {
        this.titleActive.set(titleData.isActive);
      }
    });

    this.ac.params.subscribe((params) => {
      const categoryParam = String(params['id'] || '').trim();
      const categoryNameFromQuery = this.ac.snapshot.queryParamMap.get('name')?.trim() || '';

      const categoryTitle = categoryNameFromQuery || categoryParam;
      this.categoryName.set(categoryTitle);

      // Establecer el título del header con el nombre de la categoría en UPPERCASE
      this.headerService.titulo.set(categoryTitle.toUpperCase());

      this.cargarProductosPorCategoria(categoryParam, categoryNameFromQuery);
    });
  }

  private cargarProductosPorCategoria(categoryParam: string, categoryNameFromQuery: string): void {
    if (!categoryParam) {
      this.productos.set([]);
      return;
    }

    // Flujo nuevo: Home navega por ID real de categoría.
    if (categoryNameFromQuery) {
      this.buscarProductosPorCategoria(categoryParam, categoryNameFromQuery);
      return;
    }

    // Compatibilidad con enlaces viejos que venían por nombre.
    this.categoriasService.getCategoryIdByName(categoryParam).subscribe({
      next: (categoryId) => {
        this.categoryName.set(categoryParam);
        this.headerService.titulo.set(categoryParam.toUpperCase());
        this.buscarProductosPorCategoria(categoryId, categoryParam);
      },
      error: () => {
        this.buscarProductosPorCategoria(categoryParam, categoryParam);
      },
    });
  }

  private buscarProductosPorCategoria(categoryId: string, categoryName?: string): void {
    this.productosService.getByCategory(categoryId, categoryName).subscribe({
      next: (productosFiltrados) => {
        this.productos.set(productosFiltrados);
      },
      error: (err) => {
        console.error('Error al obtener productos filtrados:', err);
        this.productos.set([]);
      },
    });
  }
}
