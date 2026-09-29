import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AvatarService } from 'src/app/core/services/avatar.service';
import { PerfilService } from 'src/app/core/services/perfil.service';
import { TenantContextService } from 'src/app/core/services/tenant-context.service';
import { WaiterRequestsService } from 'src/app/core/services/waiter-requests.service';

@Component({
  selector: 'app-entrada',
  templateUrl: './entrada.component.html',
  styleUrls: ['./entrada.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class EntradaComponent {
  private static readonly FALLBACK_AVATAR_URL = 'assets/img/mano.png';

  private readonly perfilService = inject(PerfilService);
  private readonly waiterRequestsService = inject(WaiterRequestsService);
  private readonly avatarService = inject(AvatarService);
  private readonly tenantContextService = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  solicitandoMozo = signal(false);
  solicitandoCuenta = signal(false);
  mozoAvisado = signal(false);
  cuentaSolicitada = signal(false);
  avatarCargando = signal(true);
  avatarUrl = signal<string | null>(null);
  tieneNumeroMesa = signal(false);
  modalAbierto = signal(false);
  modalMensaje = signal('');

  ngOnInit(): void {
    this.hidratarContextoDesdeQr();
    this.actualizarDisponibilidadMesa();
    this.cargarAvatarActual();
  }

  solicitarMozo(): void {
    const tenantId = this.tenantContextService.getTenantId();

    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tableNumber) {
      this.mostrarModal('No encontramos el numero de mesa.');
      return;
    }

    this.solicitandoMozo.set(true);
    this.waiterRequestsService
      .create({
        tenantId,
        tableNumber,
        message: 'El cliente pide mozo',
      })
      .pipe(finalize(() => this.solicitandoMozo.set(false)))
      .subscribe({
        next: () => {
          this.mozoAvisado.set(true);
        },
        error: (error) => {
          console.error('Error al solicitar mozo:', error);
          this.mostrarModal('No se pudo enviar la solicitud. Intenta de nuevo.');
        },
      });
  }

  pedirCuenta(): void {
    const tenantId = this.tenantContextService.getTenantId();

    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tableNumber) {
      this.mostrarModal('No encontramos el numero de mesa.');
      return;
    }

    this.solicitandoCuenta.set(true);
    this.waiterRequestsService
      .createBillRequest({
        tenantId,
        tableNumber,
        message: 'El cliente pide cuenta',
      })
      .pipe(finalize(() => this.solicitandoCuenta.set(false)))
      .subscribe({
        next: () => {
          this.cuentaSolicitada.set(true);
        },
        error: (error) => {
          console.error('Error al pedir cuenta:', error);
          this.mostrarModal('No se pudo enviar el pedido de cuenta. Intenta de nuevo.');
        },
      });
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalMensaje.set('');
  }

  private hidratarContextoDesdeQr(): void {
    const queryParams = this.route.snapshot.queryParamMap;

    const tenantId = queryParams.get('tenantId')?.trim();
    if (tenantId) {
      localStorage.setItem('activeTenantId', tenantId);
    }

    const tableParam =
      queryParams.get('tableNumber')?.trim() ||
      queryParams.get('table')?.trim() ||
      queryParams.get('mesa')?.trim() ||
      queryParams.get('numeroMesa')?.trim();
    const tableNumber = Number(tableParam);
    if (tableParam && Number.isFinite(tableNumber) && tableNumber > 0) {
      localStorage.setItem('tableNumber', String(tableNumber));
    }
  }

  private cargarAvatarActual(): void {
    const tenantId = this.tenantContextService.getTenantId();

    this.avatarCargando.set(true);
    this.avatarService
      .getCurrentAvatar(tenantId)
      .pipe(finalize(() => this.avatarCargando.set(false)))
      .subscribe({
        next: (response) => {
          const remoteUrl = response?.imageUrl?.trim();
          this.avatarUrl.set(remoteUrl || EntradaComponent.FALLBACK_AVATAR_URL);
        },
        error: (error) => {
          console.error('Error al cargar avatar actual:', error);
          this.avatarUrl.set(EntradaComponent.FALLBACK_AVATAR_URL);
        },
      });
  }

  onAvatarError(): void {
    if (this.avatarUrl() !== EntradaComponent.FALLBACK_AVATAR_URL) {
      this.avatarUrl.set(EntradaComponent.FALLBACK_AVATAR_URL);
    }
  }

  private actualizarDisponibilidadMesa(): void {
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    this.tieneNumeroMesa.set(Boolean(tableNumber));
  }

  private mostrarModal(mensaje: string): void {
    this.modalMensaje.set(mensaje);
    this.modalAbierto.set(true);
  }
}
