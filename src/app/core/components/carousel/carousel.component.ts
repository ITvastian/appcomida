import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { BannerService } from '../../services/banner.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

  constructor(
    private elementRef: ElementRef, 
    private cdr: ChangeDetectorRef,
    private bannerService: BannerService
  ) {}

  ngOnInit() {
    // 📸 Cargar banners reactivamente (Observable)
    this.bannerService
      .getAllBanners()
      .pipe(takeUntil(this.destroy$))
      .subscribe((banners: any[]) => {
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
    this.websocket = new WebSocket('ws://localhost:3001');

    this.websocket.onopen = () => {
      console.log('✅ WebSocket conectado');
    };

    this.websocket.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      
      // ✅ Cambio: Ahora recibe 'banners' (array) en lugar de 'imageUrl'
      if (data.type === 'banner_updated' && data.banners) {
        console.log(`🖼️ Banners actualizados - Slot ${data.slot}:`, data.banners[data.slot]?.imageUrl);
        
        // Actualizar todas las fotos
        this.fotos = data.banners.map((b: any) => ({ 
          url: b.imageUrl || 'https://via.placeholder.com/1200x400' 
        }));
        
        // Reclonar para efecto circular
        this.clonedFotos = [this.fotos[this.fotos.length - 1], ...this.fotos];
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        console.log(`✅ Carousel actualizado`);
      }
    };

    this.websocket.onerror = (error: any) => {
      console.error('❌ Error WebSocket:', error);
    };

    this.websocket.onclose = () => {
      console.log('🔴 WebSocket desconectado - Reconectando...');
      setTimeout(() => this.conectarWebSocket(), 3000);
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
    if (this.websocket) {
      this.websocket.close();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}