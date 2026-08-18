import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface Banner {
  id?: string;
  slot: number;
  imageUrl: string;
  title?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private apiUrl = 'http://localhost:3001/api/banner'; // Ajusta según tu backend
  private banners$ = new BehaviorSubject<Banner[]>([]); 

  constructor(private http: HttpClient) {
    // Cargar banners al inicializar
    this.loadBannersFromAPI();
  }

  // Cargar banners desde la API del backend
  private loadBannersFromAPI(): void {
    this.http.get<any>(`${this.apiUrl}/current`)
      .pipe(
        tap((response) => {
          console.log('Response del API banner:', response);
        }),
        map((response) => {
          // El backend puede devolver: { banners: [...] } o directamente [...]
          const banners = Array.isArray(response) ? response : response.banners || [];
          return banners;
        }),
        catchError((error) => {
          console.error('Error cargando banners desde API:', error);
          return of([]);
        })
      )
      .subscribe((banners) => {
        this.banners$.next(banners);
        console.log('Banners cargados desde API:', banners.length);
      });
  }

  // Obtener todos los banners - devuelve Observable que reemite datos
  getAllBanners(): Observable<Banner[]> {
    return this.banners$.asObservable();
  }
}
