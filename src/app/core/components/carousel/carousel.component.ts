import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { UiConfigService } from '../../services/ui-config.service';
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
  fotos: Array<{ url: string }> = [];
  clonedFotos: Array<{ url: string }> = [];
  intervalId: any;
  private slidesElement: HTMLElement | null = null;
  private currentIndex = 0;
  private destroy$ = new Subject<void>();

  // clonedFotos = [última, ...fotos]: el índice 0 es el clon de la última foto.
  get dotActivo(): number {
    const n = this.fotos.length;
    return n === 0 ? 0 : (this.currentIndex - 1 + n) % n;
  }

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private uiConfigService: UiConfigService
  ) { }

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
    // Las actualizaciones en tiempo real llegan vía BannerService (RealtimeService).
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
        this.slidesElement.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
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
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoSlide();
  }
}