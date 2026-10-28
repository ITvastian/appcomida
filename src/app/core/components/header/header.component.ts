import { HeaderService } from 'src/app/core/services/header.service';
import { HeaderBackgroundService } from 'src/app/core/services/header-background.service';
import { TitleHeaderService } from 'src/app/core/services/title-header.service';
import { UiConfigService } from 'src/app/core/services/ui-config.service';
import { Component, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TenantContextService } from 'src/app/core/services/tenant-context.service';
import { PedidoActivoService } from 'src/app/core/services/pedido-activo.service';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  headerBackgroundService = inject(HeaderBackgroundService);
  titleHeaderService = inject(TitleHeaderService);
  uiConfigService = inject(UiConfigService);
  router = inject(Router);
  location = inject(Location);
  private tenantContext = inject(TenantContextService);
  pedidoActivo = inject(PedidoActivoService);

  // Mesa del QR (0 si no hay); se muestra en la placa del header extendido.
  get mesa(): number {
    return this.tenantContext.getTableNumber(undefined);
  }

  claseAplicada = signal('');
  tituloMostrado = signal('');
  backgroundImageUrl = signal('');
  tituloBackend = signal(''); // Título dinámico del backend
  titleActive = signal(false); // Estado del título personalizado
  isHomeRoute = signal(false);

  private destroy$ = new Subject<void>();

  esconderTitulo = effect(
    () => {
      if (this.headerService.titulo()) {
        this.claseAplicada.set('fade-out');
      }
    },
    { allowSignalWrites: true }
  );

  ngOnInit() {
    // Para la placa de la mesa (si se entra directo a /home sin pasar por la entrada).
    this.pedidoActivo.refrescar();
    this.actualizarEstadoRuta(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.actualizarEstadoRuta(event.urlAfterRedirects || event.url);
      });

    this.uiConfigService
      .getCurrentUiConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((uiConfig) => {
        this.backgroundImageUrl.set(uiConfig.titleBackgroundUrl);
        this.tituloBackend.set(uiConfig.headerTitle);
        this.titleActive.set(uiConfig.headerTitleActive);
      });
    // Las actualizaciones en tiempo real llegan vía HeaderBackgroundService/TitleHeaderService (RealtimeService).
  }
  volverAtras() {
    if (this.isHomeRoute()) {
      this.router.navigateByUrl('/entrada');
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/home');
  }
  mostrarTituloNuevo(e: AnimationEvent) {
    if (e.animationName.includes('titulo-out')) {
      this.tituloMostrado.set(this.headerService.titulo());
      this.claseAplicada.set('fade-in');
      setTimeout(() => this.claseAplicada.set(''), 550);
    }
  }

  tituloVisible(): string {
    if (this.isHomeRoute()) {
      return this.titleActive() ? this.tituloBackend() : '';
    }

    return this.titleActive() ? this.tituloBackend() : this.tituloMostrado();
  }

  private actualizarEstadoRuta(url: string) {
    const path = (url || '').split('?')[0].split('#')[0];
    const isHome = path === '/home' || path === '/';
    this.isHomeRoute.set(isHome);

    if (isHome) {
      // Evita arrastrar el título de navegación previo cuando se vuelve al home.
      this.tituloMostrado.set('');
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
