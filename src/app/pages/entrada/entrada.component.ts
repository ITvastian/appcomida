import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AvatarService } from 'src/app/core/services/avatar.service';
import { PerfilService } from 'src/app/core/services/perfil.service';
import { PaymentsService, TransferenciaResponse } from 'src/app/core/services/payments.service';
import { RealtimeService } from 'src/app/core/services/realtime.service';
import { PedidoActivoItem, PedidoActivoService } from 'src/app/core/services/pedido-activo.service';
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
  // 409 "Ya se está generando el pago": reintentos cada 2,5 s antes de mostrar error.
  private static readonly MAX_REINTENTOS_PAGO = 4;

  private readonly perfilService = inject(PerfilService);
  private readonly waiterRequestsService = inject(WaiterRequestsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly avatarService = inject(AvatarService);
  private readonly tenantContextService = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly realtimeService = inject(RealtimeService);
  private readonly pedidoActivoService = inject(PedidoActivoService);
  private readonly destroyRef = inject(DestroyRef);
  solicitandoMozo = signal(false);
  solicitandoCuenta = signal(false);
  procesandoPago = signal(false);
  revisandoCuenta = signal(false);
  // Medios online del local (GET /payments/methods). También se apagan si create/init
  // responden 400. Si la consulta falla: Mercado Pago visible y transferencia oculta.
  mercadoPagoDisponible = signal(true);
  transferenciaDisponible = signal(false);
  readonly hayPagoOnline = computed(() => this.mercadoPagoDisponible() || this.transferenciaDisponible());

  iniciandoTransferencia = signal(false);
  datosTransferencia = signal<TransferenciaResponse | null>(null);
  copiado = signal<'alias' | 'cbu' | null>(null);
  private copiadoTimer?: ReturnType<typeof setTimeout>;

  readonly pedidoActivo = this.pedidoActivoService.pedido;
  readonly confirmandoPago = this.pedidoActivoService.confirmandoPago;
  readonly esperandoPago = this.pedidoActivoService.esperandoPago;
  readonly pagoRecibido = this.pedidoActivoService.pagoRecibido;
  mediosPagoVisibles = signal(false);
  mozoAvisado = signal(false);
  // Paso intermedio: "Solicitar mozo" pide confirmación antes de enviar el llamado.
  confirmandoMozo = signal(false);

  mesaActual(): number {
    return this.tenantContextService.getTableNumber(undefined);
  }
  cuentaSolicitada = signal(false);
  avatarCargando = signal(true);
  avatarUrl = signal<string | null>(null);
  introAvatarLoaded = signal(false);
  tieneNumeroMesa = signal(false);
  modalAbierto = signal(false);
  modalMensaje = signal('');
  introVisible = signal(true);
  private introTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.hidratarContextoDesdeQr();
    // Con el tenant del QR ya guardado, (re)abre el canal en tiempo real del local.
    this.realtimeService.conectar();
    this.procesarRegresoDeMercadoPago();
    this.actualizarDisponibilidadMesa();
    // Desde la tarjeta "Pedido en curso": abrir directamente la cuenta.
    if (this.route.snapshot.queryParamMap.get('pagar') === '1') {
      this.introVisible.set(false);
      this.abrirResumenCuenta();
    }
    this.cargarAvatarActual();
    this.cargarMetodosDePago();

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
    clearTimeout(this.copiadoTimer);
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

    this.confirmandoMozo.set(false);
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
    if (medioPago === 'Mercado Pago' || medioPago === 'Transferencia') {
      this.abrirResumenCuenta();
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

  private cargarMetodosDePago(): void {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      return;
    }
    this.paymentsService.getMetodos(tenantId).subscribe({
      next: (metodos) => {
        this.mercadoPagoDisponible.set(metodos?.mercadopago === true);
        this.transferenciaDisponible.set(metodos?.transfer === true);
      },
      error: (error) => console.warn('No se pudieron consultar los medios de pago:', error),
    });
  }

  /** Muestra la cuenta de la mesa (todos los pedidos pendientes) con los medios online disponibles. */
  abrirResumenCuenta(): void {
    if (!this.tenantContextService.getTenantId() || !this.tenantContextService.getTableNumber(undefined)) {
      this.mostrarModal('No encontramos los datos de la mesa para pagar.');
      return;
    }
    this.pedidoActivoService.refrescar();
    this.mediosPagoVisibles.set(false);
    this.revisandoCuenta.set(true);
  }

  continuarConPago(intento = 0): void {
    const tenantId = this.tenantContextService.getTenantId();
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tenantId || !tableNumber) {
      this.mostrarModal('No encontramos los datos de la mesa para pagar.');
      return;
    }

    this.procesandoPago.set(true);
    this.paymentsService.createMercadoPagoCheckout({ tenantId, tableNumber }).subscribe({
      next: (response) => {
        try {
          const checkoutUrl = new URL(response?.checkoutUrl ?? '');
          if (checkoutUrl.protocol !== 'https:') {
            throw new Error('La URL de pago debe usar HTTPS.');
          }
          // Se queda en "procesando" mientras el navegador navega al checkout.
          window.location.assign(checkoutUrl.toString());
        } catch (error) {
          console.error('URL de pago inválida:', error);
          this.procesandoPago.set(false);
          this.mostrarModal('El enlace de pago recibido no es válido.');
        }
      },
      error: (error) => this.manejarErrorDePago(error, intento),
    });
  }

  private manejarErrorDePago(error: any, intento: number): void {
    const mensaje: string = error?.error?.message ?? error?.error?.error ?? '';

    // Otra persona de la mesa está generando el pago: reintentar en unos segundos.
    if (error?.status === 409 && intento < EntradaComponent.MAX_REINTENTOS_PAGO) {
      setTimeout(() => this.continuarConPago(intento + 1), 2500);
      return;
    }

    this.procesandoPago.set(false);

    if (error?.status === 400 && /mercado ?pago/i.test(mensaje)) {
      this.mercadoPagoDisponible.set(false);
      this.revisandoCuenta.set(false);
      this.mostrarModal('Este local no acepta pagos con Mercado Pago. Pedí la cuenta al mozo.');
      return;
    }

    if (error?.status === 404) {
      this.pedidoActivoService.refrescar();
      this.revisandoCuenta.set(false);
      this.mostrarModal('No hay nada pendiente de pago: la cuenta ya está paga.');
      return;
    }

    console.error('Error al crear el checkout de Mercado Pago:', error);
    this.mostrarModal(mensaje || 'No se pudo continuar con el pago. Intenta de nuevo.');
  }

  /** Pide el monto y los datos bancarios; luego espera a que el staff confirme el pago. */
  pagarPorTransferencia(): void {
    const tenantId = this.tenantContextService.getTenantId();
    const tableNumber = this.tenantContextService.getTableNumber(undefined);
    if (!tenantId || !tableNumber) {
      this.mostrarModal('No encontramos los datos de la mesa para pagar.');
      return;
    }

    this.iniciandoTransferencia.set(true);
    this.paymentsService
      .initializeTransfer({ tenantId, tableNumber })
      .pipe(finalize(() => this.iniciandoTransferencia.set(false)))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta?.success || !respuesta.transfer || !Number.isFinite(Number(respuesta.amount))) {
            this.mostrarModal('No pudimos obtener los datos para transferir. Intentá de nuevo.');
            return;
          }
          this.datosTransferencia.set(respuesta);
          this.pedidoActivoService.esperarConfirmacionDePago('transferencia');
        },
        error: (error) => {
          const mensaje: string = error?.error?.message ?? error?.error?.error ?? '';
          if (error?.status === 400) {
            this.transferenciaDisponible.set(false);
            this.mostrarModal(mensaje || 'Este local no acepta pagos por transferencia.');
            return;
          }
          if (error?.status === 404) {
            this.pedidoActivoService.refrescar();
            this.mostrarModal('No hay nada pendiente de pago: la cuenta ya está paga.');
            return;
          }
          console.error('Error al iniciar la transferencia:', error);
          this.mostrarModal(mensaje || 'No pudimos obtener los datos para transferir. Intentá de nuevo.');
        },
      });
  }

  async copiar(valor: string | undefined, campo: 'alias' | 'cbu'): Promise<void> {
    if (!valor) {
      return;
    }
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      // Fallback para navegadores sin Clipboard API (o sin HTTPS).
      const input = document.createElement('textarea');
      input.value = valor;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    this.copiado.set(campo);
    clearTimeout(this.copiadoTimer);
    this.copiadoTimer = setTimeout(() => this.copiado.set(null), 1800);
  }

  // El backend manda el CUIT solo con dígitos: 30712345678 → 30-71234567-8.
  formatearCuit(cuit: string | undefined): string {
    const digitos = (cuit ?? '').replace(/\D/g, '');
    return digitos.length === 11 ? `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}` : cuit ?? '';
  }

  volverAtras(): void {
    // Desde los datos bancarios se vuelve a la cuenta; desde la cuenta, al inicio.
    if (this.datosTransferencia()) {
      this.datosTransferencia.set(null);
      return;
    }
    this.revisandoCuenta.set(false);
    this.pedidoActivoService.descartarPagoRecibido();
  }

  // Solo para mostrar la línea; el total de la cuenta viene del servidor.
  totalItem(item: PedidoActivoItem): number {
    const extras = (item.extras ?? []).reduce((suma, extra) => suma + (Number(extra.price) || 0), 0);
    return ((Number(item.price) || 0) + extras) * (Number(item.quantity) || 0);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalMensaje.set('');
  }

  // Mercado Pago agrega estos parámetros al redirigir a la back_url. Volver del checkout no
  // confirma nada: el pago se da por hecho solo cuando el GET de la mesa deja de mostrar pendientes.
  private procesarRegresoDeMercadoPago(): void {
    const params = this.route.snapshot.queryParamMap;
    const volvio = params.has('payment_id') || params.has('collection_status') || params.has('preference_id');
    if (!volvio) {
      this.pedidoActivoService.refrescar();
      return;
    }

    const estado = (params.get('collection_status') || params.get('status') || '').toLowerCase();
    if (estado === 'approved' || estado === 'pending' || estado === 'in_process') {
      this.pedidoActivoService.esperarConfirmacionDePago();
      return;
    }

    // rejected, cancelled, null (el cliente volvió sin pagar)...
    this.pedidoActivoService.refrescar();
    this.mostrarModal('El pago no se completó. Podés intentar de nuevo desde "Medios de pago".');
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
      this.tenantContextService.setTableNumber(tableNumber);
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
