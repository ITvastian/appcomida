import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';

@Component({
  selector: 'app-contador-cantidad',
  templateUrl: './contador-cantidad.component.html',
  styleUrls: ['./contador-cantidad.component.scss'],
  standalone: true,
})
export class ContadorCantidadComponent implements OnInit{

  ngOnInit(): void {
    this.numero.set(this.cantidadInicial)
  }

  numero = signal(1);
  @Output() cantidadNueva = new EventEmitter<number>();
  @Input () cantidadInicial = 1;

  actualizarNum(dif: number) {
    this.numero.set(Math.max(this.numero() + dif, 1));
    this.cantidadNueva.emit(this.numero());
  }
}
