import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Perfil } from 'src/app/core/interface/perfil';
import { HeaderService } from 'src/app/core/services/header.service';
import { PerfilService } from 'src/app/core/services/perfil.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class PerfilComponent {
  headerService = inject(HeaderService);
  perfilService = inject(PerfilService);
  router = inject(Router)

  ngOnInit(): void {
    this.headerService.titulo.set('Profile');
    if(this.perfilService.perfil()){
      this.perfil = {...this.perfilService.perfil()!}
    }
  }
  perfil: Perfil = {
    nombre: '',
    direccion: '',
    telefono: '',
    detalleEntrega: '',
  };
  guardarDatosPerfil() {
    this.perfilService.guardarDatos(this.perfil)
    this.router.navigate(["/carrito"])
  }

}
