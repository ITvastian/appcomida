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

  parametrosBusqueda: Busqueda = {
    texto: '',
    aptoCeliaco: false,
    aptoVegano: false,
  };

  ngOnInit(): void {
    this.headerService.titulo.set('Buscar');
    this.cargarTodosLosProductos();
  }

  buscar() {
    this.productosService.buscar(this.parametrosBusqueda).subscribe({
      next: (productos) => this.productos = productos,
      error: (err) => console.error('Error fetching products:', err)
    });
  }

  cargarTodosLosProductos() {
    this.productosService.getAllProducts().subscribe({
      next: (productos) => this.productos = productos,
      error: (err) => console.error('Error fetching all products:', err)
    });
  }

  clear() {
    this.parametrosBusqueda.texto = '';
    this.cargarTodosLosProductos();
  }

  onInputChange() {
    this.buscar(); // Realiza la búsqueda a medida que el usuario escribe
  }

  onSubmit(event: Event) {
    event.preventDefault(); // Evita que el formulario se envíe y recargue la página
    this.buscar();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Evita el envío del formulario al presionar Enter
      this.buscar(); // Realiza la búsqueda al presionar Enter
    }
  }
}
