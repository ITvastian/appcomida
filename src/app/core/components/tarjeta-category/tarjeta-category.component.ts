import { Component, Input, OnInit } from '@angular/core';
import { CategoriasService } from '../../services/categorias.service';
import { CommonModule } from '@angular/common';
import { Categoria } from 'src/app/core/interface/categorias';

@Component({
  selector: 'app-tarjeta-category',
  templateUrl: './tarjeta-category.component.html',
  styleUrls: ['./tarjeta-category.component.scss'],
  standalone: true,
  imports: [CommonModule]

})
export class TarjetaCategoryComponent implements OnInit {
  @Input() categoria!: Categoria;
  categorias: Categoria[] = [];  // Arreglo para almacenar las categorías

  constructor(private categoriasService: CategoriasService) { }

  ngOnInit(): void {
    // Llamamos al servicio para obtener las categorías
    this.categoriasService.getAll().subscribe((data: Categoria[]) => {
      this.categorias = data;
    });
  }
}
