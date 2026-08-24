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

  get mostrarLayoutPrincipal(): boolean {
    const path = (this.router.url || '').split('?')[0].split('#')[0];
    return path !== '/entrada';
  }
}
