import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { ArticuloComponent } from './pages/articulo/articulo.component';
import { BuscarComponent } from './pages/buscar/buscar.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { RubroComponent } from './pages/rubro/rubro.component';
import { HomeComponent } from './pages/home/home.component';
import { EntradaComponent } from './pages/entrada/entrada.component';

// `orden` define la dirección de la transición: ir a un valor mayor desliza hacia la izquierda.
const routes: Routes = [
  { path: 'entrada', component: EntradaComponent, data: { orden: 0 } },
  { path: 'home', component: HomeComponent, data: { orden: 1 } },
  { path: 'categoria/:id', component: RubroComponent, data: { orden: 1.1 } },
  { path: 'articulo/:id', component: ArticuloComponent, data: { orden: 1.2 } },
  { path: 'buscar', component: BuscarComponent, data: { orden: 2 } },
  { path: 'carrito', component: CarritoComponent, data: { orden: 3 } },
  { path: 'perfil', component: PerfilComponent, data: { orden: 4 } },
  { path: '', redirectTo: '/entrada', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
