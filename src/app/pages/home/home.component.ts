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

  ngOnInit(): void {
    this.headerService.titulo.set('Dyno');
    this.headerService.extendido.set(true);

    this.categoriasService.getAll().subscribe({
      next: (res: Categoria[]) => this.categorias.set(res),  // Tipo explícito para res
      error: (err: any) => console.error('Error fetching categories:', err)  // Tipo explícito para err
    });
  }
  ngOnDestroy(): void {
    this.headerService.extendido.set(false);
  }
}
