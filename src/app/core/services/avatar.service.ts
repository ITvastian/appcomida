import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface CurrentAvatarResponse {
  success: boolean;
  imageUrl: string;
  uploadedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  getCurrentAvatar(tenantId: string): Observable<CurrentAvatarResponse> {
    return this.http.get<CurrentAvatarResponse>(this.apiConfig.api('/avatar/current'), {
      params: { tenantId },
    });
  }
}
