import { CommonModule } from '@angular/common';
import { CategoriasService } from './../../core/services/categorias.service';
import { Component, OnDestroy, OnInit, inject, WritableSignal, signal } from '@angular/core';
import { TarjetaCategoryComponent } from 'src/app/core/components/tarjeta-category/tarjeta-category.component';
import { Categoria } from 'src/app/core/interface/categorias';
import { HeaderService } from 'src/app/core/services/header.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone:true,
  imports: [TarjetaCategoryComponent, CommonModule, RouterModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  CategoriasService = inject(CategoriasService);
  categorias: WritableSignal<Categoria[]> = signal([]);

  ngOnInit(): void {
    this.headerService.titulo.set('Order Place');
    this.headerService.extendido.set(true);

    this.CategoriasService.getAll().then((res) => (this.categorias.set(res)));
  }
  ngOnDestroy(): void {
    this.headerService.extendido.set(false);
  }
}
