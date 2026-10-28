import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Categoria } from 'src/app/core/interface/categorias';

@Component({
  selector: 'app-tarjeta-category',
  templateUrl: './tarjeta-category.component.html',
  styleUrls: ['./tarjeta-category.component.scss'],
  standalone: true,
  imports: [CommonModule]

})
export class TarjetaCategoryComponent {
  @Input() categoria!: Categoria;
  // La categoría tiene al menos un producto sin TACC: se muestra solo el ícono.
  @Input() sinTacc = false;
}
