import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface TitleBackground {
  id?: string;
  cloudinaryId?: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  updatedBy?: string;
  uploadedAt?: any;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HeaderBackgroundService {
  private apiUrl = 'http://localhost:3001/api/title-background'; // Ajusta según tu backend
  private currentBackground$ = new BehaviorSubject<TitleBackground | null>(null);

  constructor(private http: HttpClient) {
    // Cargar fondo del header al inicializar
    this.loadBackgroundFromAPI();
  }

  // Cargar fondo desde la API del backend
  private loadBackgroundFromAPI(): void {
    this.http.get<any>(`${this.apiUrl}/current`)
      .pipe(
        tap((response) => {
          console.log('Response del API title-background:', response);
        }),
        map((response) => {
          // El backend puede devolver: { imageUrl: '...' } o directamente la interfaz
          if (response && response.imageUrl) {
            return response as TitleBackground;
          }
          console.warn('No hay fondo de header en la API');
          return null;
        }),
        catchError((error) => {
          console.error('Error cargando fondo del header desde API:', error);
          return of(null);
        })
      )
      .subscribe((background) => {
        this.currentBackground$.next(background);
        if (background?.imageUrl) {
          console.log('Fondo del header cargado desde API:', background.imageUrl);
        }
      });
  }

  // Obtener el fondo actual (Observable)
  getCurrentBackground(): Observable<TitleBackground | null> {
    return this.currentBackground$.asObservable();
  }

  // Actualizar el fondo actual (desde WebSocket)
  updateBackgroundFromWebSocket(imageUrl: string): void {
    const current = this.currentBackground$.value;
    const updated: TitleBackground = {
      ...current,
      imageUrl,
      updatedAt: new Date().toISOString(),
    };
    this.currentBackground$.next(updated);
    console.log('Fondo del header actualizado:', imageUrl);
  }
}
