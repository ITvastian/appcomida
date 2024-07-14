import { Injectable, WritableSignal, signal } from '@angular/core';
import { Perfil } from '../interface/perfil';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  constructor() {
    const perfilLStorege = localStorage.getItem('perfil');
    if (perfilLStorege)this.perfil.set(JSON.parse(perfilLStorege))
  }

  perfil:WritableSignal<Perfil | undefined> = signal(undefined);

  guardarDatos(perfil: Perfil) {
    localStorage.setItem('perfil', JSON.stringify(perfil));
    this.perfil.set(perfil)
  }
}
