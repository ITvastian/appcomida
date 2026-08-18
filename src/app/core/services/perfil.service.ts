import { Injectable, WritableSignal, signal } from '@angular/core';
import { Perfil } from '../interface/perfil';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  constructor() {
    const perfilLStorege = localStorage.getItem('perfil');
    if (perfilLStorege) {
      const parsedPerfil = JSON.parse(perfilLStorege);
      // Compatibilidad con datos guardados antes del rename paraLlevar -> takeAway
      if (parsedPerfil?.takeAway === undefined && parsedPerfil?.paraLlevar !== undefined) {
        parsedPerfil.takeAway = parsedPerfil.paraLlevar;
        delete parsedPerfil.paraLlevar;
        localStorage.setItem('perfil', JSON.stringify(parsedPerfil));
      }
      this.perfil.set(parsedPerfil);
    }
  }

  perfil:WritableSignal<Perfil | undefined> = signal(undefined);

  guardarDatos(perfil: Perfil) {
    localStorage.setItem('perfil', JSON.stringify(perfil));
    this.perfil.set(perfil)
  }
}
