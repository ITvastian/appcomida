import { Producto } from 'src/app/core/interface/productos';
import { ProductosService } from './../../core/services/productos.service';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Busqueda } from 'src/app/core/interface/busqueda';
import { HeaderService } from 'src/app/core/services/header.service';
import { TarjetaProductoComponent } from 'src/app/core/components/tarjeta-producto/tarjeta-producto.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.scss'],
  imports: [CommonModule, FormsModule, TarjetaProductoComponent, RouterModule],
  standalone: true,
})
export class BuscarComponent {
  headerService = inject(HeaderService);
  productosService = inject(ProductosService);
  productos: Producto[] = [];

  ngOnInit(): void {
    this.headerService.titulo.set('Search');
    this.productosService
      .getallProducts()
      .then((res) => (this.productos = res));
  }

  parametrosBusqueda: Busqueda = {
    texto: '',
    aptoCeliaco: false,
    aptoVegano: false,
  };
  async buscar() {
    this.productos = await this.productosService.buscar(
      this.parametrosBusqueda
    );
  }
  async cargarTodosLosProductos() {
    this.productos = await this.productosService.getallProducts();
  }
  clear() {
    this.parametrosBusqueda.texto = '';
    this.cargarTodosLosProductos();
  }
}
