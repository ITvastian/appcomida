import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WritableSignal, signal } from '@angular/core';
import { CategoriasService } from 'src/app/core/services/categorias.service';
import { HeaderService } from 'src/app/core/services/header.service';
import { Producto } from 'src/app/core/interface/productos';
import { CommonModule } from '@angular/common';
import { TarjetaProductoComponent } from "../../core/components/tarjeta-producto/tarjeta-producto.component";

@Component({
  selector: 'app-rubro',
  templateUrl: './rubro.component.html',
  styleUrls: ['./rubro.component.scss'],
  standalone:true,
  imports: [CommonModule, TarjetaProductoComponent,RouterModule]
})
export class RubroComponent implements OnInit {
  headerService = inject(HeaderService);
  categoriasService = inject(CategoriasService);
  productos: WritableSignal<Producto[]> = signal([]);
  ac = inject(ActivatedRoute);

  ngOnInit(): void {
    this.ac.params.subscribe((params) => {
      const categoriaNombre = params['nombre'];
      if (categoriaNombre) {
        this.categoriasService.getAll().subscribe({
          next: (categorias) => {
            const categoria = categorias.find(cat => cat.name === categoriaNombre);
            if (categoria) {
              this.productos.set(categoria.productos);
              this.headerService.titulo.set(categoria.name);
            }
          },
          error: (err) => console.error('Error fetching category:', err)
        });
      }
    });
  }
}
