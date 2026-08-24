import { Injectable } from '@angular/core';
import { environment } from 'src/environmets/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  private readonly apiBaseUrl = this.normalize(environment.apiBaseUrl);
  private readonly wsBaseUrl = this.normalize(environment.wsBaseUrl);

  api(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBaseUrl}${cleanPath}`;
  }

  ws(): string {
    return this.wsBaseUrl;
  }

  private normalize(value: string): string {
    return (value || '').replace(/\/+$/, '');
  }
}