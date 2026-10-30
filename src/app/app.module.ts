import { NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TabsComponent } from './core/components/tabs/tabs.component';
import { HeaderComponent } from './core/components/header/header.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

registerLocaleData(localeEsAr);


@NgModule({
  declarations: [
    AppComponent,
    TabsComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HeaderComponent, // ← HeaderComponent es standalone
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }
