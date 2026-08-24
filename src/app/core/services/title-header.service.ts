import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ApiConfigService } from './api-config.service';

export interface TitleHeader {
  id?: string;
  title: string;
  isActive?: boolean;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TitleHeaderService {
  private readonly apiUrl: string;
  private currentTitle$ = new BehaviorSubject<TitleHeader | null>(null);

  constructor(
    private http: HttpClient,
    private tenantContextService: TenantContextService,
    private firestore: AngularFirestore,
    private apiConfigService: ApiConfigService
  ) {
    this.apiUrl = this.apiConfigService.api('/title-header/current');
    this.loadTitle();
  }

  private getCacheKey(tenantId: string): string {
    return `title-header-current:${tenantId}`;
  }

  private normalizeTitle(raw: any): TitleHeader | null {
    const titleCandidate =
      raw?.title ||
      raw?.headerTitle ||
      raw?.data?.title ||
      raw?.data?.headerTitle;
    const title = typeof titleCandidate === 'string' ? titleCandidate.trim() : '';
    if (!title) {
      return null;
    }

    return {
      ...raw,
      title,
      isActive: raw?.isActive === true || raw?.data?.isActive === true,
    } as TitleHeader;
  }

  private guardarCache(tenantId: string, title: TitleHeader): void {
    try {
      localStorage.setItem(this.getCacheKey(tenantId), JSON.stringify(title));
    } catch (error) {
      console.warn('No se pudo guardar cache de titulo del header:', error);
    }
  }

  private leerCache(tenantId: string): TitleHeader | null {
    try {
      const raw = localStorage.getItem(this.getCacheKey(tenantId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.title === 'string') {
        return parsed as TitleHeader;
      }
      return null;
    } catch (error) {
      console.warn('No se pudo leer cache de titulo del header:', error);
      return null;
    }
  }

  private cargarTituloDesdeFirestore(tenantId: string): Observable<TitleHeader | null> {
    return this.firestore
      .doc(`configuracion/${tenantId}__title-header`)
      .valueChanges()
      .pipe(
        tap((doc: any) => {
          console.log(`Fallback Firestore configuracion/${tenantId}__title-header:`, doc);
        }),
        map((doc: any) => this.normalizeTitle(doc)),
        switchMap((title) => {
          if (title?.title) {
            return of(title);
          }

          return this.firestore.doc('configuracion/title-header').valueChanges().pipe(
            map((legacyDoc: any) => {
              const legacyTitle = this.normalizeTitle(legacyDoc);
              if (legacyTitle?.title) {
                return legacyTitle;
              }
              return this.leerCache(tenantId);
            }),
            catchError(() => of(this.leerCache(tenantId)))
          );
        }),
        catchError((error) => {
          console.error('Error cargando titulo desde Firestore fallback:', error);
          return of(this.leerCache(tenantId));
        })
      );
  }

  private loadTitle(): void {
    const tenantId = this.tenantContextService.getTenantId();
    const params = new HttpParams().set('tenantId', tenantId);
    const headers = new HttpHeaders().set('x-tenant-id', tenantId);

    this.http
      .get<any>(this.apiUrl, { params, headers })
      .pipe(
        tap((response: any) => {
          console.log('Response title-header/current:', response);
        }),
        map((response: any) => this.normalizeTitle(response)),
        switchMap((title) => {
          if (title?.title) {
            return of(title);
          }
          console.warn('No hay titulo de header en title-header/current');
          return this.cargarTituloDesdeFirestore(tenantId);
        }),
        catchError((error) => {
          console.error('Error cargando titulo del header desde API, aplicando fallback Firestore:', error);
          return this.cargarTituloDesdeFirestore(tenantId);
        })
      )
      .subscribe((title) => {
        this.currentTitle$.next(title);
        if (title?.title) {
          this.guardarCache(tenantId, title);
          console.log('Titulo del header cargado desde API:', title.title, '- isActive:', title.isActive);
        }
      });
  }

  getCurrentTitle(): Observable<TitleHeader | null> {
    return this.currentTitle$.asObservable();
  }

  updateTitleFromWebSocket(titleData: TitleHeader): void {
    const tenantId = this.tenantContextService.getTenantId();
    this.currentTitle$.next(titleData);
    this.guardarCache(tenantId, titleData);
    console.log('Título del header actualizado:', titleData.title);
  }
}
