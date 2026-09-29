import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { BannerService } from '../../services/banner.service';
import { UiConfigService } from '../../services/ui-config.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiConfigService } from '../../services/api-config.service';
import { TenantContextService } from '../../services/tenant-context.service';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class CarruselComponent implements OnInit, AfterViewInit, OnDestroy {
  fotos: Array<{ url: string }> = [];
  clonedFotos: Array<{ url: string }> = [];
  intervalId: any;
  websocket: any;
  private slidesElement: HTMLElement | null = null;
  private currentIndex = 0;
  private destroy$ = new Subject<void>();
  private reconnectTimer: any;
  private shouldReconnect = true;

  constructor(
    private elementRef: ElementRef, 
    private cdr: ChangeDetectorRef,
    private bannerService: BannerService,
    private uiConfigService: UiConfigService,
    private apiConfigService: ApiConfigService,
    private tenantContextService: TenantContextService
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
            url: b.imageUrl
          }));
          this.clonedFotos = [this.fotos[this.fotos.length - 1], ...this.fotos];
          this.cdr.detectChanges();
          this.resetCarouselPosition();
          this.startAutoSlide();
          console.log('✅ Banners cargados:', this.fotos);
          return;
        }

        this.fotos = [];
        this.clonedFotos = [];
        this.stopAutoSlide();
        this.resetCarouselPosition();
        this.cdr.detectChanges();
      });
    
    // 📡 Conectar WebSocket para actualizaciones en tiempo real
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
    const slides = this.elementRef.nativeElement.querySelector('.slides') as HTMLElement | null;
    if (!slides) {
      console.warn('⚠️ Elemento .slides no encontrado');
      return;
    }

    this.slidesElement = slides;
    this.startAutoSlide();
  }

  private startAutoSlide(): void {
    if (!this.slidesElement || this.clonedFotos.length <= 1) {
      return;
    }

    this.stopAutoSlide();

    this.intervalId = setInterval(() => {
      this.currentIndex++;
      if (!this.slidesElement) {
        return;
      }

      if (this.currentIndex >= this.clonedFotos.length) {
        this.currentIndex = 0;
        this.slidesElement.style.transition = 'none';
        this.slidesElement.style.transform = 'translateX(0)';
      } else {
        this.slidesElement.style.transition = 'transform 0.5s ease-in-out';
        this.slidesElement.style.transform = `translateX(-${this.currentIndex * 100}%)`;
      }
    }, 3000);
  }

  private stopAutoSlide(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private resetCarouselPosition(): void {
    this.currentIndex = 0;
    if (!this.slidesElement) {
      return;
    }

    this.slidesElement.style.transition = 'none';
    this.slidesElement.style.transform = 'translateX(0)';
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
    this.stopAutoSlide();
  }
}