import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ApiConfigService } from './api-config.service';

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
  private readonly apiUrl: string;
  private currentBackground$ = new BehaviorSubject<TitleBackground | null>(null);

  constructor(
    private http: HttpClient,
    private tenantContextService: TenantContextService,
    private firestore: AngularFirestore,
    private apiConfigService: ApiConfigService
  ) {
    this.apiUrl = this.apiConfigService.api('/title-background/current');
    this.loadBackground();
  }

  private getCacheKey(tenantId: string): string {
    return `title-background-current:${tenantId}`;
  }

  private normalizeBackground(raw: any): TitleBackground | null {
    const imageUrlCandidate =
      raw?.imageUrl ||
      raw?.titleBackgroundUrl ||
      raw?.data?.imageUrl ||
      raw?.data?.titleBackgroundUrl;
    const imageUrl = typeof imageUrlCandidate === 'string' ? imageUrlCandidate.trim() : '';
    if (!imageUrl) {
      return null;
    }

    return {
      ...raw,
      imageUrl,
    } as TitleBackground;
  }

  private guardarCache(tenantId: string, background: TitleBackground): void {
    try {
      localStorage.setItem(this.getCacheKey(tenantId), JSON.stringify(background));
    } catch (error) {
      console.warn('No se pudo guardar cache de fondo del header:', error);
    }
  }

  private leerCache(tenantId: string): TitleBackground | null {
    try {
      const raw = localStorage.getItem(this.getCacheKey(tenantId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.imageUrl === 'string' && parsed.imageUrl.trim()) {
        return parsed as TitleBackground;
      }
      return null;
    } catch (error) {
      console.warn('No se pudo leer cache de fondo del header:', error);
      return null;
    }
  }

  private cargarBackgroundDesdeFirestore(tenantId: string): Observable<TitleBackground | null> {
    return this.firestore
      .doc(`configuracion/${tenantId}__title-background`)
      .valueChanges()
      .pipe(
        tap((doc: any) => {
          console.log(`Fallback Firestore configuracion/${tenantId}__title-background:`, doc);
        }),
        map((doc: any) => this.normalizeBackground(doc)),
        switchMap((background) => {
          if (background?.imageUrl) {
            return of(background);
          }

          return this.firestore.doc('configuracion/title-background').valueChanges().pipe(
            map((legacyDoc: any) => {
              const legacyBackground = this.normalizeBackground(legacyDoc);
              if (legacyBackground?.imageUrl) {
                return legacyBackground;
              }
              return this.leerCache(tenantId);
            }),
            catchError(() => of(this.leerCache(tenantId)))
          );
        }),
        catchError((error) => {
          console.error('Error cargando fondo desde Firestore fallback:', error);
          return of(this.leerCache(tenantId));
        })
      );
  }

  private loadBackground(): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.currentBackground$.next(null);
      return;
    }

    const params = new HttpParams().set('tenantId', tenantId);
    const headers = new HttpHeaders().set('x-tenant-id', tenantId);

    this.http
      .get<any>(this.apiUrl, { params, headers })
      .pipe(
        tap((response: any) => {
          console.log('Response title-background/current:', response);
        }),
        map((response: any) => this.normalizeBackground(response)),
        switchMap((background) => {
          if (background?.imageUrl) {
            return of(background);
          }
          console.warn('No hay fondo de header en title-background/current');
          return this.cargarBackgroundDesdeFirestore(tenantId);
        }),
        catchError((error) => {
          console.error('Error cargando fondo del header desde API, aplicando fallback Firestore:', error);
          return this.cargarBackgroundDesdeFirestore(tenantId);
        })
      )
      .subscribe((background) => {
        this.currentBackground$.next(background);
        if (background?.imageUrl) {
          this.guardarCache(tenantId, background);
          console.log('Fondo del header cargado desde API:', background.imageUrl);
        }
      });
  }

  getCurrentBackground(): Observable<TitleBackground | null> {
    return this.currentBackground$.asObservable();
  }

  updateBackgroundFromWebSocket(imageUrl: string): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.currentBackground$.next(null);
      return;
    }

    const current = this.currentBackground$.value;
    const updated: TitleBackground = {
      ...current,
      imageUrl,
      updatedAt: new Date().toISOString(),
    };
    this.currentBackground$.next(updated);
    this.guardarCache(tenantId, updated);
    console.log('Fondo del header actualizado:', imageUrl);
  }
}
