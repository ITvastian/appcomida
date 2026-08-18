import { Producto } from 'src/app/core/interface/productos';
import { ProductosService } from './../../core/services/productos.service';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Busqueda } from 'src/app/core/interface/busqueda';
import { HeaderService } from 'src/app/core/services/header.service';
import { TarjetaProductoComponent } from 'src/app/core/components/tarjeta-producto/tarjeta-producto.component';
import { RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.scss'],
  imports: [CommonModule, FormsModule, TarjetaProductoComponent, RouterModule],
  standalone: true,
})
export class BuscarComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  productosService = inject(ProductosService);
  
  productos: Producto[] = [];
  productosCompletos: Producto[] = []; // Todos los productos cargados

  parametrosBusqueda: Busqueda = {
    texto: '',
    aptoCeliaco: false,
    aptoVegano: false,
  };

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.headerService.titulo.set('Buscar');
    
    // Cargar todos los productos una sola vez
    this.cargarTodosLosProductos();

    // Setup debounced search local
    const searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300), // Espera 300ms después del último keystroke
        distinctUntilChanged() // Solo si el texto realmente cambió
      )
      .subscribe((texto) => {
        this.filtrarLocalmente(texto);
      });

    this.subscriptions.push(searchSubscription);
  }

  cargarTodosLosProductos() {
    const allProductsSubscription = this.productosService.getAllProducts().subscribe({
      next: (productos) => {
        this.productosCompletos = productos;
        this.productos = productos;
      },
      error: (err) => console.error('Error fetching all products:', err)
    });

    this.subscriptions.push(allProductsSubscription);
  }

  // Filtrar localmente sin llamar al backend
  filtrarLocalmente(texto: string) {
    if (!texto || texto.trim() === '') {
      this.productos = this.productosCompletos;
      return;
    }

    const textoBuscado = texto.toLowerCase().trim();
    this.productos = this.productosCompletos.filter(producto =>
      producto.name.toLowerCase().includes(textoBuscado)
    );
  }

  clear() {
    this.parametrosBusqueda.texto = '';
    this.productos = this.productosCompletos;
  }

  onInputChange() {
    // Emite el texto al Subject (que aplicará debounce)
    this.searchSubject.next(this.parametrosBusqueda.texto);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.searchSubject.next(this.parametrosBusqueda.texto);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchSubject.next(this.parametrosBusqueda.texto);
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe de todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }
}
