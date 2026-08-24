import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TenantContextService {
  private readonly defaultTenantId = 'big-pizza';

  getTenantId(): string {
    const keys = ['activeTenantId', 'tenantId', 'activeRestaurantTenantId'];

    for (const key of keys) {
      const value = localStorage.getItem(key)?.trim();
      if (value) {
        if (key !== 'activeTenantId') {
          localStorage.setItem('activeTenantId', value);
        }
        return value;
      }
    }

    const objectKeys = ['activeTenant', 'tenant', 'restaurant', 'activeRestaurant'];
    for (const key of objectKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as { tenantId?: unknown };
        const value = parsed?.tenantId;
        if (typeof value === 'string' && value.trim()) {
          localStorage.setItem('activeTenantId', value.trim());
          return value.trim();
        }
      } catch (error) {
        console.warn(`No se pudo parsear ${key} para obtener tenantId`, error);
      }
    }

    localStorage.setItem('activeTenantId', this.defaultTenantId);
    return this.defaultTenantId;
  }

  getTableNumber(profileAddress: unknown): number {
    const fromPerfil = Number(profileAddress);
    if (Number.isFinite(fromPerfil) && fromPerfil > 0) {
      return fromPerfil;
    }

    const fromLocalStorage = Number(localStorage.getItem('tableNumber'));
    if (Number.isFinite(fromLocalStorage) && fromLocalStorage > 0) {
      return fromLocalStorage;
    }

    return 0;
  }
}