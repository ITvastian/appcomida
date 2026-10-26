import { animate, group, query, style, transition, trigger } from '@angular/animations';

const SALIDA = '240ms cubic-bezier(0.4, 0, 1, 1)';
// Curva con overshoot: la página entra, se pasa un poco y vuelve (rebote en X).
const ENTRADA = '520ms cubic-bezier(0.34, 1.4, 0.64, 1)';

function deslizar(direccion: 1 | -1) {
  return [
    query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), { optional: true }),
    query(':enter', style({ opacity: 0, transform: `translateX(${direccion * 22}%)` }), { optional: true }),
    group([
      query(
        ':leave',
        animate(SALIDA, style({ opacity: 0, transform: `translateX(${direccion * -12}%) scale(0.98)` })),
        { optional: true }
      ),
      query(':enter', animate(ENTRADA, style({ opacity: 1, transform: 'none' })), { optional: true }),
    ]),
  ];
}

export const routeAnimations = trigger('routeAnimations', [
  transition(':increment', deslizar(1)),
  transition(':decrement', deslizar(-1)),
]);
