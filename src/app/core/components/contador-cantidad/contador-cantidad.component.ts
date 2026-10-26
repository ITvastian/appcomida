import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { MAX_CANTIDAD_POR_ITEM } from '../../services/cart.service';

@Component({
  selector: 'app-contador-cantidad',
  templateUrl: './contador-cantidad.component.html',
  styleUrls: ['./contador-cantidad.component.scss'],
  standalone: true,
  imports: [NgFor],
})
export class ContadorCantidadComponent implements OnInit{

  ngOnInit(): void {
    this.numero.set(this.cantidadInicial)
  }

  numero = signal(1);
  @Output() cantidadNueva = new EventEmitter<number>();
  @Input () cantidadInicial = 1;


  actualizarNum(dif: number) {
    this.numero.set(Math.min(Math.max(this.numero() + dif, 1), MAX_CANTIDAD_POR_ITEM));
    this.cantidadNueva.emit(this.numero());
  }
}
