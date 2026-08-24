import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { BannerService } from '../../services/banner.service';
import { UiConfigService } from '../../services/ui-config.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiConfigService } from '../../services/api-config.service';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class CarruselComponent implements OnInit, AfterViewInit, OnDestroy {
  fotos = [
    { url: 'https://via.placeholder.com/1200x400?text=Foto+1' },
    { url: 'https://via.placeholder.com/1200x400?text=Foto+2' },
    { url: 'https://via.placeholder.com/1200x400?text=Foto+3' },
    { url: 'https://via.placeholder.com/1200x400?text=Foto+4' },
    { url: 'https://via.placeholder.com/1200x400?text=Foto+5' },
  ];

  clonedFotos = [this.fotos[this.fotos.length - 1], ...this.fotos];
  intervalId: any;
  websocket: any;
  private destroy$ = new Subject<void>();
  private reconnectTimer: any;
  private shouldReconnect = true;

  constructor(
    private elementRef: ElementRef, 
    private cdr: ChangeDetectorRef,
    private bannerService: BannerService,
    private uiConfigService: UiConfigService,
    private apiConfigService: ApiConfigService
  ) {}

  ngOnInit() {
    // 📸 Cargar banners reactivamente (Observable)
    this.uiConfigService
      .getCurrentUiConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((uiConfig) => {
        const banners = uiConfig.banners || [];
        if (banners && banners.length > 0) {
          this.fotos = banners.map((b: any) => ({ 
            url: b.imageUrl || 'https://via.placeholder.com/1200x400' 
          }));
          this.clonedFotos = [this.fotos[this.fotos.length - 1], ...this.fotos];
          this.cdr.detectChanges();
          console.log('✅ Banners cargados:', this.fotos);
        }
      });
    
    // 📡 Conectar WebSocket para actualizaciones en tiempo real
    this.conectarWebSocket();
  }

  conectarWebSocket() {
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
      console.log('✅ WebSocket conectado');
    };

    this.websocket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      
      // ✅ Cambio: Ahora recibe 'banners' (array) en lugar de 'imageUrl'
      if (data.type === 'banner_updated' && data.banners) {
        console.log(`🖼️ Banners actualizados - Slot ${data.slot}:`, data.banners[data.slot]?.imageUrl);
        this.bannerService.updateBannersFromWebSocket(data.banners);
      }
    };

    this.websocket.onerror = (error: any) => {
      console.error('❌ Error WebSocket:', error);
    };

    this.websocket.onclose = () => {
      if (!this.shouldReconnect) {
        return;
      }

      console.log('🔴 WebSocket desconectado - Reconectando...');
      this.reconnectTimer = setTimeout(() => this.conectarWebSocket(), 3000);
    };
  }

  ngAfterViewInit() {
    const slides = this.elementRef.nativeElement.querySelector('.slides');
    if (!slides) {
      console.warn('⚠️ Elemento .slides no encontrado');
      return;
    }

    let currentIndex = 0;

    const changeSlide = () => {
      currentIndex++;
      if (currentIndex >= this.clonedFotos.length) {
        currentIndex = 0;
        slides.style.transition = 'none';
        slides.style.transform = `translateX(0)`;
      } else {
        slides.style.transition = 'transform 0.5s ease-in-out';
        slides.style.transform = `translateX(-${currentIndex * 100}%)`;
      }
    };

    this.intervalId = setInterval(changeSlide, 3000);
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
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}