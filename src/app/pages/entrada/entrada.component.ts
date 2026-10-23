import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AvatarService } from 'src/app/core/services/avatar.service';
import { PerfilService } from 'src/app/core/services/perfil.service';
import { PaymentsService, TransferInitializationResponse } from 'src/app/core/services/payments.service';
import { RealtimeService } from 'src/app/core/services/realtime.service';
import { TenantContextService } from 'src/app/core/services/tenant-context.service';
import { WaiterRequestsService } from 'src/app/core/services/waiter-requests.service';

@Component({
  selector: 'app-entrada',
  templateUrl: './entrada.component.html',
  styleUrls: ['./entrada.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class EntradaComponent implements OnDestroy {
  private static readonly FALLBACK_AVATAR_URL = 'assets/img/dynologo.png';
  private static readonly PAYMENT_RETURN_URL = 'https://dyno.web.app';

  private readonly perfilService = inject(PerfilService);
  private readonly waiterRequestsService = inject(WaiterRequestsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly avatarService = inject(AvatarService);
  private readonly tenantContextService = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  solicitandoMozo = signal(false);
  solicitandoCuenta = signal(false);
  iniciandoTransferencia = signal(false);
  procesandoPago = signal(false);
  transferenciaResumen = signal<TransferInitializationResponse | null>(null);
  mediosPagoVisibles = signal(false);
  mozoAvisado = signal(false);
  cuentaSolicitada = signal(false);
  avatarCargando = signal(true);
  avatarUrl = signal<string | null>(null);
  introAvatarLoaded = signal(false);
  tieneNumeroMesa = signal(false);
  modalAbierto = signal(false);
  modalMensaje = signal('');
  introVisible = signal(true);
  private paymentIdPendiente: string | null = null;
  private introTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.hidratarContextoDesdeQr();
    // Con el tenant del QR ya guardado, (re)abre el canal en tiempo real del local.
    this.realtimeService.conectar();
    this.actualizarDisponibilidadMesa();
    this.cargarAvatarActual();

    this.realtimeService
      .on('avatar_updated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.imageUrl) {
          this.avatarUrl.set(RealtimeService.conVersion(event.imageUrl, event.timestamp));
        }
      });
    this.realtimeService.resync$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarAvatarActual());
  }

  ngOnDestroy(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
  }

  solicitarMozo(): void {
    const tenantId = this.tenantContextService.getTenantId();

    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tableNumber) {
      this.mostrarModal('No encontramos el número de mesa.');
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

  alternarMediosPago(): void {
    this.mediosPagoVisibles.update((visible) => !visible);
  }

  pedirCuenta(medioPago: string): void {
    if (medioPago === 'Transferencia') {
      this.iniciarTransferencia();
      return;
    }

    const tenantId = this.tenantContextService.getTenantId();

    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tableNumber) {
      this.mostrarModal('No encontramos el número de mesa.');
      return;
    }

    this.solicitandoCuenta.set(true);
    this.waiterRequestsService
      .createBillRequest({
        tenantId,
        tableNumber,
        message: `El cliente pide cuenta. Medio de pago: ${medioPago}`,
      })
      .pipe(finalize(() => this.solicitandoCuenta.set(false)))
      .subscribe({
        next: () => {
          this.cuentaSolicitada.set(true);
          this.mediosPagoVisibles.set(false);
        },
        error: (error) => {
          console.error('Error al pedir cuenta:', error);
          this.mostrarModal('No se pudo enviar el pedido de cuenta. Intenta de nuevo.');
        },
      });
  }

  iniciarTransferencia(): void {
    const tenantId = this.tenantContextService.getTenantId();
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tenantId || !tableNumber) {
      this.mostrarModal('No encontramos los datos de la mesa para iniciar la transferencia.');
      return;
    }

    this.paymentIdPendiente ??= `pago_${crypto.randomUUID()}`;
    this.iniciandoTransferencia.set(true);
    this.paymentsService
      .initializeTransfer({
        paymentId: this.paymentIdPendiente,
        tenantId,
        tableNumber,
        paymentMethod: 'transfer',
      })
      .pipe(finalize(() => this.iniciandoTransferencia.set(false)))
      .subscribe({
        next: (response) => {
          const amount = Number(response.amount ?? response.order?.total);
          if (!response.success || !response.orderId || !response.order || !Number.isFinite(amount)) {
            this.mostrarModal('El servidor no devolvió los datos completos de la orden.');
            return;
          }

          this.paymentIdPendiente = null;
          this.transferenciaResumen.set({ ...response, amount });
          this.mediosPagoVisibles.set(false);
        },
        error: (error) => {
          console.error('Error al iniciar la transferencia:', error);
          this.mostrarModal('No se pudo cargar la orden para transferir. Intenta de nuevo.');
        },
      });
  }

  continuarConPago(): void {
    const resumen = this.transferenciaResumen();
    if (!resumen) {
      return;
    }

    this.procesandoPago.set(true);
    this.paymentsService
      .createMercadoPagoCheckout({
        paymentId: resumen.paymentId,
        tenantId: resumen.tenantId,
        orderId: resumen.orderId,
        tableNumber: Number(resumen.tableNumber),
        amount: Number(resumen.amount),
        back_urls: {
          success: EntradaComponent.PAYMENT_RETURN_URL,
          failure: EntradaComponent.PAYMENT_RETURN_URL,
          pending: EntradaComponent.PAYMENT_RETURN_URL,
        },
        auto_return: 'approved',
      })
      .pipe(finalize(() => this.procesandoPago.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.success || !response.checkoutUrl) {
            this.mostrarModal('El servidor no devolvió el enlace de pago.');
            return;
          }

          try {
            const checkoutUrl = new URL(response.checkoutUrl);
            if (checkoutUrl.protocol !== 'https:') {
              throw new Error('La URL de pago debe usar HTTPS.');
            }
            window.location.assign(checkoutUrl.toString());
          } catch (error) {
            console.error('URL de pago inválida:', error);
            this.mostrarModal('El enlace de pago recibido no es válido.');
          }
        },
        error: (error) => {
          console.error('Error al crear el checkout de Mercado Pago:', error);
          this.mostrarModal('No se pudo continuar con el pago. Intenta de nuevo.');
        },
      });
  }

  volverAtras(): void {
    this.transferenciaResumen.set(null);
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
          const avatarUrl = remoteUrl || EntradaComponent.FALLBACK_AVATAR_URL;
          this.avatarUrl.set(avatarUrl);
        },
        error: (error) => {
          console.error('Error al cargar avatar actual:', error);
          this.avatarUrl.set(EntradaComponent.FALLBACK_AVATAR_URL);
        },
      });
  }

  onIntroAvatarLoad(): void {
    this.introAvatarLoaded.set(true);
    this.iniciarPermanenciaIntro();
  }

  onIntroAvatarError(): void {
    this.iniciarPermanenciaIntro();
  }

  private iniciarPermanenciaIntro(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
    this.introTimer = setTimeout(() => this.introVisible.set(false), 5000);
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
