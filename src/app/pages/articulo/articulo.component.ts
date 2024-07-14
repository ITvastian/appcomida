import { ActivatedRoute, Router } from '@angular/router';
import { Component, inject, signal } from '@angular/core';
import { HeaderService } from 'src/app/core/services/header.service';
import { ProductosService } from 'src/app/core/services/productos.service';
import { Producto } from 'src/app/core/interface/productos';
import { CommonModule } from '@angular/common';
import { ContadorCantidadComponent } from 'src/app/core/components/contador-cantidad/contador-cantidad.component';
import { CartService } from 'src/app/core/services/cart.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-articulo',
  templateUrl: './articulo.component.html',
  styleUrls: ['./articulo.component.scss'],
  standalone: true,
  imports: [CommonModule, ContadorCantidadComponent,FormsModule],
})
export class ArticuloComponent {
  headerService = inject(HeaderService);
  ProductosService = inject(ProductosService);
  CartService = inject(CartService);

  producto?: Producto;
  cantidad = signal(1);
  notas = "";

  ngOnInit(): void {
    this.headerService.titulo.set('articulo');
  }
  constructor(private ac: ActivatedRoute, private router:Router) {
    ac.params.subscribe((param) => {
      if (param['id']) {
        this.ProductosService.getById(param['id']).then((producto) => {
          this.producto = producto;
          this.headerService.titulo.set(producto!.nombre);
        });
      }
    });
  }
  agregarAlCarrito() {
    if (!this.producto) return;
    this.CartService.addProd(this.producto?.id, this.cantidad(),this.notas);
    this.router.navigate(["/carrito"])
  }
}
