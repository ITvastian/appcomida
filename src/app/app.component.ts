import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Dyno';
  private readonly router = inject(Router);

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
}
