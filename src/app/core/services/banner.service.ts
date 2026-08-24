import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ApiConfigService } from './api-config.service';

export interface Banner {
  imageUrl: string;
  cloudinaryId?: string;
  uploadedAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private readonly apiUrl: string;
  private banners$ = new BehaviorSubject<Banner[]>([]);

  constructor(
    private http: HttpClient,
    private tenantContextService: TenantContextService,
    private firestore: AngularFirestore,
    private apiConfigService: ApiConfigService
  ) {
    this.apiUrl = this.apiConfigService.api('/banner/current');
    this.loadBanners();
  }

  private getCacheKey(tenantId: string): string {
    return `banner-current:${tenantId}`;
  }

  private normalizeBanners(raw: unknown): Banner[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item: any) => ({
        imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '',
        cloudinaryId: item?.cloudinaryId,
        uploadedAt: item?.uploadedAt,
        updatedAt: item?.updatedAt,
        updatedBy: item?.updatedBy,
      }))
      .filter((item) => item.imageUrl.length > 0);
  }

  private extractBannersFromResponse(response: any): Banner[] {
    const candidates = [
      response?.banners,
      response?.data?.banners,
      response?.data,
      response,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeBanners(candidate);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return [];
  }

  private guardarCache(tenantId: string, banners: Banner[]): void {
    try {
      localStorage.setItem(this.getCacheKey(tenantId), JSON.stringify(banners));
    } catch (error) {
      console.warn('No se pudo guardar cache de banners:', error);
    }
  }

  private leerCache(tenantId: string): Banner[] {
    try {
      const raw = localStorage.getItem(this.getCacheKey(tenantId));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Banner[]) : [];
    } catch (error) {
      console.warn('No se pudo leer cache de banners:', error);
      return [];
    }
  }

  private cargarBannersDesdeFirestore(tenantId: string): Observable<Banner[]> {
    return this.firestore
      .doc(`configuracion/${tenantId}__banner`)
      .valueChanges()
      .pipe(
        tap((doc: any) => {
          console.log(`Fallback Firestore configuracion/${tenantId}__banner:`, doc);
        }),
        map((doc: any) => {
          const bannersFromDoc = Array.isArray(doc) ? doc : doc?.banners;
          return this.normalizeBanners(bannersFromDoc);
        }),
        switchMap((banners) => {
          if (banners.length > 0) {
            return of(banners);
          }

          return this.firestore.doc('configuracion/banner').valueChanges().pipe(
            map((legacyDoc: any) => {
              const legacyBanners = Array.isArray(legacyDoc) ? legacyDoc : legacyDoc?.banners;
              const normalized = this.normalizeBanners(legacyBanners);
              if (normalized.length > 0) {
                return normalized;
              }
              return this.leerCache(tenantId);
            }),
            catchError(() => of(this.leerCache(tenantId)))
          );
        }),
        catchError((error) => {
          console.error('Error cargando banners desde Firestore fallback:', error);
          return of(this.leerCache(tenantId));
        })
      );
  }

  private loadBanners(): void {
    const tenantId = this.tenantContextService.getTenantId();
    const params = new HttpParams().set('tenantId', tenantId);
    const headers = new HttpHeaders().set('x-tenant-id', tenantId);

    this.http
      .get<any>(this.apiUrl, { params, headers })
      .pipe(
        tap((response: any) => {
          console.log('Response banner/current:', response);
        }),
        map((response: any) => {
          return this.extractBannersFromResponse(response);
        }),
        switchMap((banners) => {
          if (banners.length > 0) {
            return of(banners);
          }
          console.warn('No se encontro array banners en banner/current');
          return this.cargarBannersDesdeFirestore(tenantId);
        }),
        catchError((error) => {
          console.error('Error cargando banners desde API, aplicando fallback Firestore:', error);
          return this.cargarBannersDesdeFirestore(tenantId);
        })
      )
      .subscribe((banners) => {
        this.banners$.next(banners);
        if (banners.length > 0) {
          this.guardarCache(tenantId, banners);
        }
        console.log('Banners cargados desde API:', banners.length);
      });
  }

  getAllBanners(): Observable<Banner[]> {
    return this.banners$.asObservable();
  }

  updateBannersFromWebSocket(rawBanners: unknown): void {
    const tenantId = this.tenantContextService.getTenantId();
    const banners = this.normalizeBanners(rawBanners);
    if (banners.length === 0) {
      return;
    }

    this.banners$.next(banners);
    this.guardarCache(tenantId, banners);
  }
}
