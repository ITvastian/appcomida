import { HeaderService } from 'src/app/core/services/header.service';
import { Component, effect, inject, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  headerService = inject(HeaderService);
  claseAplicada = signal('');
  tituloMostrado = signal('');

  esconderTitulo = effect(
    () => {
      if (this.headerService.titulo()) {
        this.claseAplicada.set('fade-out');
      }
    },
    { allowSignalWrites: true }
  );
  mostrarTituloNuevo(e: AnimationEvent) {
    // console.log(e);
    if (e.animationName.includes('fade-out')) {
      this.tituloMostrado.set(this.headerService.titulo());
      this.claseAplicada.set('fade-in');

        setTimeout(()=>this.claseAplicada.set(''),250)
    }
  }
}
