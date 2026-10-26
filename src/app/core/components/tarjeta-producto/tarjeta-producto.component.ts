import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Extra, Producto } from '../../interface/productos';

@Component({
  selector: 'app-tarjeta-producto',
  templateUrl: './tarjeta-producto.component.html',
  styleUrls: ['./tarjeta-producto.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class TarjetaProductoComponent {

  @Input({ required: true }) producto!: Producto;
  @Input() extrasSeleccionados: Extra[] = [];

  getProductImage(): string {
    const productoAny = this.producto as any;
    return (
      productoAny?.photoUrl ||
      productoAny?.photo ||
      productoAny?.imageUrl ||
      ''
    );
  }
}
