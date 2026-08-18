import { CommonModule } from '@angular/common';
import { CategoriasService } from './../../core/services/categorias.service';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { TarjetaCategoryComponent } from 'src/app/core/components/tarjeta-category/tarjeta-category.component';
import { Categoria } from 'src/app/core/interface/categorias';
import { HeaderService } from 'src/app/core/services/header.service';
import { RouterModule } from '@angular/router';
import { CarruselComponent } from "../../core/components/carousel/carousel.component";
import { saveAs } from 'file-saver';

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
  categorias: WritableSignal<Categoria[]> = signal([]);
  cargandoCategorias = signal(true);
  errorCategorias = signal(false);

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

  reintentarCargaCategorias() {
    this.cargarCategorias();
  }

  ngOnDestroy(): void {
    this.headerService.extendido.set(false);
  }
}
