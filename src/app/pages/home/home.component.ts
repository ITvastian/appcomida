import { CommonModule } from '@angular/common';
import { CategoriasService } from './../../core/services/categorias.service';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { TarjetaCategoryComponent } from 'src/app/core/components/tarjeta-category/tarjeta-category.component';
import { Categoria } from 'src/app/core/interface/categorias';
import { HeaderService } from 'src/app/core/services/header.service';
import { RouterModule } from '@angular/router';
import { CarruselComponent } from "../../core/components/carousel/carousel.component";
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone:true,
  imports: [TarjetaCategoryComponent, CommonModule, RouterModule, CarruselComponent, FormsModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  categoriasService = inject(CategoriasService);
  location = inject(Location);
  router = inject(Router);
  categorias: WritableSignal<Categoria[]> = signal([]);
  textoBusqueda = signal('');
  cargandoCategorias = signal(true);
  errorCategorias = signal(false);

  categoriasFiltradasVacio = computed(() => {
    const texto = this.textoBusqueda().toLowerCase().trim();
    if (!texto) {
      return this.categorias();
    }
    return this.categorias().filter(cat =>
      cat.name.toLowerCase().includes(texto)
    );
  });

  ngOnInit(): void {
    this.headerService.titulo.set('');
    this.headerService.extendido.set(true);
    this.cargarCategorias();
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

  limpiarBusqueda() {
    this.textoBusqueda.set('');
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
