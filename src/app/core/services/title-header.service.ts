import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';
import { ApiConfigService } from './api-config.service';
import { RealtimeService } from './realtime.service';

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
    private apiConfigService: ApiConfigService,
    private realtimeService: RealtimeService
  ) {
    this.apiUrl = this.apiConfigService.api('/title-header/current');
    this.loadTitle();

    this.realtimeService
      .on('header_title_updated')
      .subscribe((event) => {
        this.updateTitleFromWebSocket({
          title: event.title ?? '',
          isActive: event.isActive === true,
          updatedAt: event.timestamp,
        });
      });
    this.realtimeService.resync$.subscribe(() => this.loadTitle());
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

  private loadTitle(): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.currentTitle$.next(null);
      return;
    }

    const params = new HttpParams().set('tenantId', tenantId);
    const headers = new HttpHeaders().set('x-tenant-id', tenantId);

    this.http
      .get<any>(this.apiUrl, { params, headers })
      .pipe(
        // Sin título: no se muestra. Nunca se usa el de otro local.
        map((response: any) => {
          const title = this.normalizeTitle(response);
          if (title?.title) {
            this.guardarCache(tenantId, title);
          }
          return title;
        }),
        catchError((error) => {
          // API caída: último título conocido de este mismo local.
          console.error('Error cargando titulo del header:', error);
          return of(this.leerCache(tenantId));
        })
      )
      .subscribe((title) => this.currentTitle$.next(title));
  }

  getCurrentTitle(): Observable<TitleHeader | null> {
    return this.currentTitle$.asObservable();
  }

  updateTitleFromWebSocket(titleData: TitleHeader): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      this.currentTitle$.next(null);
      return;
    }

    this.currentTitle$.next(titleData);
    this.guardarCache(tenantId, titleData);
    console.log('Título del header actualizado:', titleData.title);
  }
}
