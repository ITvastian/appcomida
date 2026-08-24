import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Banner, BannerService } from './banner.service';
import { HeaderBackgroundService } from './header-background.service';
import { TitleHeaderService } from './title-header.service';

export interface UiConfig {
  banners: Banner[];
  titleBackgroundUrl: string;
  headerTitle: string;
  headerTitleActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UiConfigService {
  constructor(
    private bannerService: BannerService,
    private headerBackgroundService: HeaderBackgroundService,
    private titleHeaderService: TitleHeaderService
  ) {}

  getCurrentUiConfig(): Observable<UiConfig> {
    return combineLatest([
      this.bannerService.getAllBanners(),
      this.headerBackgroundService.getCurrentBackground(),
      this.titleHeaderService.getCurrentTitle(),
    ]).pipe(
      map(([banners, background, title]) => ({
        banners,
        titleBackgroundUrl: background?.imageUrl || '',
        headerTitle: title?.title || '',
        headerTitleActive: title?.isActive === true,
      }))
    );
  }
}
