import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';
import { ApiConfigService } from './api-config.service';
import { RealtimeService } from './realtime.service';

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
    private apiConfigService: ApiConfigService,
    private realtimeService: RealtimeService
  ) {
    this.apiUrl = this.apiConfigService.api('/banner/current');
    this.loadBanners();

    this.realtimeService
      .on('banner_updated')
      .subscribe((event) => this.updateBannersFromWebSocket(event.banners, event.timestamp));
    this.realtimeService.resync$.subscribe(() => this.loadBanners());
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

  private loadBanners(): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.banners$.next([]);
      return;
    }

    const params = new HttpParams().set('tenantId', tenantId);
    const headers = new HttpHeaders().set('x-tenant-id', tenantId);

    this.http
      .get<any>(this.apiUrl, { params, headers })
      .pipe(
        // Sin banners: carrusel vacío (se oculta). Nunca se usan banners de otro local.
        map((response: any) => this.extractBannersFromResponse(response)),
        catchError((error) => {
          // API caída: últimos banners conocidos de este mismo local.
          console.error('Error cargando banners:', error);
          return of(this.leerCache(tenantId));
        })
      )
      .subscribe((banners) => {
        this.banners$.next(banners);
        this.guardarCache(tenantId, banners);
      });
  }

  getAllBanners(): Observable<Banner[]> {
    return this.banners$.asObservable();
  }

  updateBannersFromWebSocket(rawBanners: unknown, timestamp?: string): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.banners$.next([]);
      return;
    }

    const banners = this.normalizeBanners(rawBanners).map((banner) => ({
      ...banner,
      imageUrl: RealtimeService.conVersion(banner.imageUrl, timestamp),
    }));
    if (banners.length === 0) {
      return;
    }

    this.banners$.next(banners);
    this.guardarCache(tenantId, banners);
  }
}
