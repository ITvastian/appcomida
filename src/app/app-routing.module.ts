import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { ArticuloComponent } from './pages/articulo/articulo.component';
import { BuscarComponent } from './pages/buscar/buscar.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { RubroComponent } from './pages/rubro/rubro.component';
import { HomeComponent } from './pages/home/home.component';

const routes: Routes = [
  { path: 'carrito', component: CarritoComponent },
  { path: 'articulo/:category', component: ArticuloComponent },
  { path: 'buscar', component: BuscarComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'categoria/:id', component: RubroComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
