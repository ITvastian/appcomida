import { CommonModule } from '@angular/common';
import { CategoriasService } from './../../core/services/categorias.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { TenantContextService } from 'src/app/core/services/tenant-context.service';
import { Component, DestroyRef, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeService } from 'src/app/core/services/realtime.service';
import { TarjetaCategoryComponent } from 'src/app/core/components/tarjeta-category/tarjeta-category.component';
import { Categoria } from 'src/app/core/interface/categorias';
import { HeaderService } from 'src/app/core/services/header.service';
import { RouterModule } from '@angular/router';
import { CarruselComponent } from "../../core/components/carousel/carousel.component";
import { saveAs } from 'file-saver';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone:true,
  imports: [TarjetaCategoryComponent, CommonModule, RouterModule, CarruselComponent]
})
export class HomeComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  categoriasService = inject(CategoriasService);
  private productosService = inject(ProductosService);
  private tenantContextService = inject(TenantContextService);

  // No hay local activo: no se entró desde el QR.
  readonly sinLocal = !this.tenantContextService.getTenantId();
  location = inject(Location);
  router = inject(Router);
  realtimeService = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);
  categorias: WritableSignal<Categoria[]> = signal([]);
  cargandoCategorias = signal(true);
  errorCategorias = signal(false);

  // Ids y nombres (en minúscula) de categorías con al menos un producto sin TACC.
  private categoriasSinTacc = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.headerService.titulo.set('');
    this.headerService.extendido.set(true);
    this.cargarCategorias();
    this.cargarCategoriasSinTacc();

    this.realtimeService
      .menuChanges('categorias')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recargarCategoriasEnSegundoPlano());
    this.realtimeService
      .menuChanges('productos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarCategoriasSinTacc());
  }

  // Mismo criterio que el filtro de productos por categoría: coincide por id o por nombre.
  tieneSinTacc(categoria: Categoria): boolean {
    const claves = this.categoriasSinTacc();
    return claves.has(String(categoria.id || '').trim().toLowerCase())
      || claves.has(String(categoria.name || '').trim().toLowerCase());
  }

  private cargarCategoriasSinTacc(): void {
    this.productosService.getAllProducts().subscribe({
      next: (productos) => {
        const claves = new Set<string>();
        for (const producto of productos) {
          if (producto.sinTacc) {
            [producto.category, producto.categoryName]
              .map((valor) => String(valor || '').trim().toLowerCase())
              .filter(Boolean)
              .forEach((clave) => claves.add(clave));
          }
        }
        this.categoriasSinTacc.set(claves);
      },
      // Solo es un indicador visual: si falla, las tarjetas se muestran sin ícono.
      error: (err) => console.warn('No se pudieron revisar los productos sin TACC:', err),
    });
  }

  // Sin spinner: el cliente ya está viendo el menú, solo se reemplaza al llegar.
  private recargarCategoriasEnSegundoPlano() {
    this.categoriasService.getAll().subscribe({
      next: (res: Categoria[]) => {
        this.categorias.set(res);
        this.errorCategorias.set(false);
      },
      error: (err: any) => console.error('Error recargando categorías:', err),
    });
  }

  cargarCategorias() {
    this.cargandoCategorias.set(true);
    this.errorCategorias.set(false);
    this.categoriasService.getAll().subscribe({
      next: (res: Categoria[]) => {
        this.categorias.set(res);
        this.cargandoCategorias.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching categories:', err);
        this.errorCategorias.set(true);
        this.cargandoCategorias.set(false);
      },
    });
  }

  reintentarCargaCategorias() {
    this.cargarCategorias();
  }

  volverAtras() {
    this.router.navigateByUrl('/entrada');
  }

  ngOnDestroy(): void {
    this.headerService.extendido.set(false);
  }
}
