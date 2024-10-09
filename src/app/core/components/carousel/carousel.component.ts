import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class CarruselComponent implements AfterViewInit {
  fotos = [
    { url: 'https://www.baccredomatic.com/sites/default/files/2023-01/GT-BANNER-PR-PEDIDOS-YA-190123.jpg' },
    { url: 'https://images.squarespace-cdn.com/content/v1/5f849c09a42e5b65481ec27e/445249c4-db0b-4a05-bf77-3d39c2c30de5/Promo-restaurante.jpg' },
    { url: 'https://images.squarespace-cdn.com/content/v1/5f849c09a42e5b65481ec27e/445249c4-db0b-4a05-bf77-3d39c2c30de5/Promo-restaurante.jpg' },
  ];

  clonedFotos = [this.fotos[this.fotos.length - 1], ...this.fotos];// Clonar fotos para efecto circular

  intervalId: any;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    const slides = this.elementRef.nativeElement.querySelector('.slides');
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

    // Change slide every 3 seconds
    this.intervalId = setInterval(changeSlide, 3000);

    // If you want to add buttons, keep this code
    // const nextButton = this.elementRef.nativeElement.querySelector('.next');
    // nextButton.addEventListener('click', () => {
    //   clearInterval(this.intervalId); // Stop automatic sliding
    //   changeSlide(); // Manually change slide
    //   this.intervalId = setInterval(changeSlide, 3000); // Restart automatic sliding
    // });
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
