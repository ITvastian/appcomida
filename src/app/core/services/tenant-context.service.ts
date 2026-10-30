import { Injectable } from '@angular/core';

const CLAVE_MESA = 'tableNumber';
const CLAVE_MESA_FECHA = 'tableNumberSetAt';
// La mesa guardada vale 2 horas desde que se escaneó el QR (o se ingresó a mano).
const VIGENCIA_MESA_MS = 2 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class TenantContextService {

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

    return '';
  }

  /** Guarda la mesa (desde el QR o ingresada a mano) con la hora, para que venza sola. */
  setTableNumber(mesa: number): void {
    localStorage.setItem(CLAVE_MESA, String(mesa));
    localStorage.setItem(CLAVE_MESA_FECHA, String(Date.now()));
  }

  getTableNumber(profileAddress: unknown): number {
    const fromLocalStorage = Number(localStorage.getItem(CLAVE_MESA));
    if (Number.isFinite(fromLocalStorage) && fromLocalStorage > 0) {
      // Vencida (o guardada antes de existir el vencimiento): se descarta para no ver ni
      // pagar la cuenta de quien esté hoy en esa mesa.
      const guardadaEn = Number(localStorage.getItem(CLAVE_MESA_FECHA));
      if (!Number.isFinite(guardadaEn) || Date.now() - guardadaEn > VIGENCIA_MESA_MS) {
        localStorage.removeItem(CLAVE_MESA);
        localStorage.removeItem(CLAVE_MESA_FECHA);
        return 0;
      }
      return fromLocalStorage;
    }

    const fromPerfil = Number(profileAddress);
    if (Number.isFinite(fromPerfil) && fromPerfil > 0) {
      return fromPerfil;
    }

    return 0;
  }
}