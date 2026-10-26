import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';

interface Tab {
  path: string;
  label: string;
  // Rutas hijas que mantienen el tab activo (ej. categoría y artículo dentro de Menú).
  prefijos: string[];
}

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
})
export class TabsComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  @ViewChild('blob') private blob?: ElementRef<HTMLElement>;

  readonly tabs: Tab[] = [
    { path: '/home', label: 'Menú', prefijos: ['/home', '/categoria', '/articulo'] },
    { path: '/buscar', label: 'Buscar', prefijos: ['/buscar'] },
    { path: '/carrito', label: 'Pedido', prefijos: ['/carrito'] },
    { path: '/perfil', label: 'Perfil', prefijos: ['/perfil'] },
  ];

  activo = signal(this.indiceDe(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((event) => this.activar(this.indiceDe(event.urlAfterRedirects)));
  }

  get cantidadEnCarrito(): number {
    return this.cartService.carrito.reduce((total, item) => total + (Number(item.cantidad) || 0), 0);
  }

  private indiceDe(url: string): number {
    const path = (url || '').split('?')[0].split('#')[0];
    return this.tabs.findIndex((tab) => tab.prefijos.some((prefijo) => path.startsWith(prefijo)));
  }

  private activar(indice: number): void {
    const anterior = this.activo();
    if (indice === anterior) {
      return;
    }
    this.activo.set(indice);

    // Efecto "gelatina": la burbuja se estira en la dirección del viaje y rebota al llegar.
    if (anterior >= 0 && indice >= 0) {
      const distancia = Math.abs(indice - anterior);
      this.blob?.nativeElement.animate(
        [
          { transform: 'scaleX(1) scaleY(1)' },
          { transform: `scaleX(${1 + 0.35 * distancia}) scaleY(0.82)`, offset: 0.35 },
          { transform: 'scaleX(0.9) scaleY(1.08)', offset: 0.7 },
          { transform: 'scaleX(1) scaleY(1)' },
        ],
        { duration: 560, easing: 'ease-out' }
      );
    }
  }
}
