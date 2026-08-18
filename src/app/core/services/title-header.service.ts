import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface TitleHeader {
  title: string;
  isActive?: boolean;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TitleHeaderService {
  private apiUrl = 'http://localhost:3001/api/title-header';
  private currentTitle$ = new BehaviorSubject<TitleHeader | null>(null);

  constructor(private http: HttpClient) {
    // Cargar título del header al inicializar
    this.loadTitleFromAPI();
  }

  // Cargar título desde la API del backend
  private loadTitleFromAPI(): void {
    this.http.get<TitleHeader>(`${this.apiUrl}/current`)
      .pipe(
        tap((response) => {
          console.log('Response del API title-header:', response);
        }),
        catchError((error) => {
          console.error('Error cargando título del header desde API:', error);
          return of(null);
        })
      )
      .subscribe((title) => {
        this.currentTitle$.next(title);
        if (title?.title) {
          console.log('Título del header cargado:', title.title);
        }
      });
  }

  // Obtener el título actual (Observable)
  getCurrentTitle(): Observable<TitleHeader | null> {
    return this.currentTitle$.asObservable();
  }

  // Actualizar el título (desde WebSocket)
  updateTitleFromWebSocket(titleData: TitleHeader): void {
    this.currentTitle$.next(titleData);
    console.log('Título del header actualizado:', titleData.title);
  }

  // Actualizar título en el backend
  async updateTitle(title: string): Promise<void> {
    try {
      const response = await this.http.post<any>(`${this.apiUrl}/update`, { title })
        .toPromise();
      console.log('Título actualizado en backend:', response);
    } catch (error) {
      console.error('Error actualizando título en backend:', error);
      throw error;
    }
  }
}
