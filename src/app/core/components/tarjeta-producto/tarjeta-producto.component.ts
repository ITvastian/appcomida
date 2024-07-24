import { CommonModule } from '@angular/common';
import { Component, Input,OnChanges  } from '@angular/core';
import { Extra, Producto } from '../../interface/productos';

@Component({
  selector: 'app-tarjeta-producto',
  templateUrl: './tarjeta-producto.component.html',
  styleUrls: ['./tarjeta-producto.component.scss'],
  standalone:true,
  imports: [CommonModule]
})
export class TarjetaProductoComponent implements OnChanges {

  @Input({ required: true }) producto!: Producto;
  @Input() extrasSeleccionados: Extra[] = [];


  ngOnChanges(): void {
    console.log('Extras en TarjetaProductoComponent:', this.extrasSeleccionados); // Debugging line
  }
}
