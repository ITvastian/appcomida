import { HeaderService } from 'src/app/core/services/header.service';
import { HeaderBackgroundService } from 'src/app/core/services/header-background.service';
import { TitleHeaderService } from 'src/app/core/services/title-header.service';
import { Component, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';

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
  router = inject(Router);
  
  claseAplicada = signal('');
  tituloMostrado = signal('');
  backgroundImageUrl = signal('');
  tituloBackend = signal(''); // Título dinámico del backend
  titleActive = signal(false); // Estado del título personalizado
  isHomeRoute = signal(false);
  
  websocket: any;
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
    this.actualizarEstadoRuta(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.actualizarEstadoRuta(event.urlAfterRedirects || event.url);
      });

    // Cargar fondo reactivamente (Observable) - instantaneo
    this.headerBackgroundService
      .getCurrentBackground()
      .pipe(takeUntil(this.destroy$))
      .subscribe((background) => {
        if (background?.imageUrl) {
          this.backgroundImageUrl.set(background.imageUrl);
          console.log('Fondo del header cargado:', background.imageUrl);
        }
      });

    // Cargar título del backend reactivamente (Observable)
    this.titleHeaderService
      .getCurrentTitle()
      .pipe(takeUntil(this.destroy$))
      .subscribe((titleData) => {
        if (titleData?.title) {
          this.tituloBackend.set(titleData.title);
          this.titleActive.set(titleData.isActive === true); // true si isActive es true
          console.log('Título del header cargado:', titleData.title, '- Activo:', titleData.isActive);
        }
      });
    
    // Conectar WebSocket para actualizaciones en tiempo real
    this.conectarWebSocket();
  }

  conectarWebSocket() {
    this.websocket = new WebSocket('ws://localhost:3001');

    this.websocket.onopen = () => {
      console.log('WebSocket conectado para header');
    };

    this.websocket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      
      // Escuchar evento de actualizacion de fondo del header
      if (data.type === 'title_background_updated' && data.imageUrl) {
        console.log('Fondo del header actualizado:', data.imageUrl);
        this.backgroundImageUrl.set(data.imageUrl);
        
        // Guardar en el servicio
        this.headerBackgroundService.updateBackgroundFromWebSocket(data.imageUrl);
      }

      // Escuchar evento de actualizacion de título del header
      if (data.type === 'header_title_updated' && data.title) {
        console.log('Título del header actualizado desde WebSocket:', data.title, '- Activo:', data.isActive);
        this.tituloBackend.set(data.title);
        this.titleActive.set(data.isActive === true); // true si isActive es true
        
        // Guardar en el servicio
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
      console.log('WebSocket Header desconectado - Reconectando...');
      setTimeout(() => this.conectarWebSocket(), 3000);
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
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.websocket) {
      this.websocket.close();
    }
  }
}
