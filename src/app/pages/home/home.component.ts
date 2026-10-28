import { CommonModule } from '@angular/common';
import { CategoriasService } from './../../core/services/categorias.service';
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
  location = inject(Location);
  router = inject(Router);
  realtimeService = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);
  categorias: WritableSignal<Categoria[]> = signal([]);
  cargandoCategorias = signal(true);
  errorCategorias = signal(false);

  ngOnInit(): void {
    this.headerService.titulo.set('');
    this.headerService.extendido.set(true);
    this.cargarCategorias();

    this.realtimeService
      .menuChanges('categorias')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recargarCategoriasEnSegundoPlano());
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
