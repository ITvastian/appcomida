import { CommonModule } from '@angular/common';
import { ProductosService } from './../../core/services/productos.service';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TarjetaProductoComponent } from 'src/app/core/components/tarjeta-producto/tarjeta-producto.component';
import { Producto } from 'src/app/core/interface/productos';
import { HeaderService } from 'src/app/core/services/header.service';
import { CategoriasService } from 'src/app/core/services/categorias.service';

@Component({
  selector: 'app-rubro',
  templateUrl: './rubro.component.html',
  styleUrls: ['./rubro.component.scss'],
  standalone: true,
  imports: [TarjetaProductoComponent, CommonModule, RouterModule
  ],
})
export class RubroComponent {
  headerService = inject(HeaderService);
  CategoriasService = inject(CategoriasService);
  ac = inject(ActivatedRoute);
  productos: WritableSignal<Producto[]> = signal([]);

  ngOnInit(): void {
    this.ac.params.subscribe((params) => {
      if (params['id']) {
        this.CategoriasService
        .getById(parseInt(params['id']))
        .then((categoria) => {
          if (categoria) {
            this.productos.set(categoria.productos);
            this.headerService.titulo.set(categoria.nombre);
            }
          });
      }
    });
  }
}
