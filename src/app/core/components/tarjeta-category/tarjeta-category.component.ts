import { Component, Input } from '@angular/core';
import { Categoria } from '../../interface/categorias';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tarjeta-category',
  templateUrl: './tarjeta-category.component.html',
  styleUrls: ['./tarjeta-category.component.scss'],
  standalone: true,
  imports:[CommonModule]
})
export class TarjetaCategoryComponent {
  @Input({ required: true }) categoria!: Categoria;

  // ngOnInit() {
  //   console.log('Categoria:', this.categoria);
  // }
}
