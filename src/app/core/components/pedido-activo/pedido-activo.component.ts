import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PedidoActivoItem, PedidoActivoService } from '../../services/pedido-activo.service';

/** Tarjeta "Pedido en curso" de la mesa. Se oculta si no hay pedidos pendientes. */
@Component({
  selector: 'app-pedido-activo',
  templateUrl: './pedido-activo.component.html',
  styleUrls: ['./pedido-activo.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class PedidoActivoComponent {
  readonly servicio = inject(PedidoActivoService);
  abierto = signal(false);

  // Solo para mostrar la línea; los totales vienen del servidor.
  totalItem(item: PedidoActivoItem): number {
    const extras = (item.extras ?? []).reduce((suma, extra) => suma + (Number(extra.price) || 0), 0);
    return ((Number(item.price) || 0) + extras) * (Number(item.quantity) || 0);
  }

  cantidadItems(): number {
    return (this.servicio.pedido()?.orders ?? []).reduce(
      (suma, orden) => suma + orden.items.reduce((s, item) => s + (Number(item.quantity) || 0), 0),
      0
    );
  }
}
