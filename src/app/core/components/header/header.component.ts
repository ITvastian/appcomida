import { HeaderService } from 'src/app/core/services/header.service';
import { HeaderBackgroundService } from 'src/app/core/services/header-background.service';
import { TitleHeaderService } from 'src/app/core/services/title-header.service';
import { UiConfigService } from 'src/app/core/services/ui-config.service';
import { Component, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';
import { ApiConfigService } from '../../services/api-config.service';
import { TenantContextService } from '../../services/tenant-context.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerService = inject(HeaderService);
  headerBackgroundService = inject(HeaderBackgroundService);
  titleHeaderService = inject(TitleHeaderService);
  uiConfigService = inject(UiConfigService);
  router = inject(Router);
  apiConfigService = inject(ApiConfigService);
  tenantContextService = inject(TenantContextService);
  
  claseAplicada = signal('');
  tituloMostrado = signal('');
  backgroundImageUrl = signal('');
  tituloBackend = signal(''); // Título dinámico del backend
  titleActive = signal(false); // Estado del título personalizado
  isHomeRoute = signal(false);
  
  websocket: any;
  private destroy$ = new Subject<void>();
  private reconnectTimer: any;
  private shouldReconnect = true;

  esconderTitulo = effect(
    () => {
      if (this.headerService.titulo()) {
        this.claseAplicada.set('fade-out');
      }
    },
    { allowSignalWrites: true }
  );

  ngOnInit() {
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
    
    // Conectar WebSocket para actualizaciones en tiempo real
    this.conectarWebSocket();
  }

  conectarWebSocket() {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      return;
    }

    if (!this.shouldReconnect) {
      return;
    }

    if (
      this.websocket &&
      (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.websocket = new WebSocket(this.apiConfigService.ws());

    this.websocket.onopen = () => {
      console.log('WebSocket conectado para header');
    };

    this.websocket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      
      // Escuchar evento de actualizacion de fondo del header
      if (data.type === 'title_background_updated' && data.imageUrl) {
        console.log('Fondo del header actualizado:', data.imageUrl);
        this.headerBackgroundService.updateBackgroundFromWebSocket(data.imageUrl);
      }

      // Escuchar evento de actualizacion de título del header
      if (data.type === 'header_title_updated' && data.title) {
        console.log('Título del header actualizado desde WebSocket:', data.title, '- Activo:', data.isActive);
        const titleData = { 
          title: data.title, 
          isActive: data.isActive, 
          updatedAt: data.timestamp || data.updatedAt 
        };
        this.titleHeaderService.updateTitleFromWebSocket(titleData);
      }
    };

    this.websocket.onerror = (error: any) => {
      console.error('Error WebSocket Header:', error);
    };

    this.websocket.onclose = () => {
      if (!this.shouldReconnect) {
        return;
      }

      console.log('WebSocket Header desconectado - Reconectando...');
      this.reconnectTimer = setTimeout(() => this.conectarWebSocket(), 3000);
    };
  }

  mostrarTituloNuevo(e: AnimationEvent) {
    if (e.animationName.includes('fade-out')) {
      this.tituloMostrado.set(this.headerService.titulo());
      this.claseAplicada.set('fade-in');
      setTimeout(() => this.claseAplicada.set(''), 250);
    }
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
    this.shouldReconnect = false;
    this.destroy$.next();
    this.destroy$.complete();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.websocket) {
      this.websocket.close();
    }
  }
}
