import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { routeAnimations } from './route-animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [routeAnimations],
})
export class AppComponent {
  title = 'Dyno';
  private readonly router = inject(Router);

  @ViewChild('main') private main?: ElementRef<HTMLElement>;

  constructor() {
    // Cada página nueva arranca desde arriba.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.main?.nativeElement.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  }

  private get currentPath(): string {
    const path = (this.router.url || '').split('?')[0].split('#')[0];
    return path;
  }

  get mostrarHeader(): boolean {
    return this.currentPath !== '/entrada' && !this.currentPath.startsWith('/articulo');
  }

  get mostrarTabs(): boolean {
    return this.currentPath !== '/entrada';
  }

  ordenDeRuta(outlet: RouterOutlet): number | undefined {
    return outlet?.isActivated ? outlet.activatedRouteData?.['orden'] : undefined;
  }
}
