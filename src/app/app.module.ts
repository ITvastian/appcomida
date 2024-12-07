// import { NgModule } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { AppRoutingModule } from './app-routing.module';
// import { AppComponent } from './app.component';
// import { TabsComponent } from './core/components/tabs/tabs.component';
// import { HeaderComponent } from './core/components/header/header.component';
// import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';



// @NgModule({ declarations: [
//         AppComponent,
//         TabsComponent,
//         HeaderComponent,
//     ],
//     bootstrap: [AppComponent], imports: [BrowserModule,
//     AppRoutingModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
// export class AppModule { }
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TabsComponent } from './core/components/tabs/tabs.component';
import { HeaderComponent } from './core/components/header/header.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// Importaciones de Firebase y Firestore
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environmets/environment';

@NgModule({
  declarations: [
    AppComponent,
    TabsComponent,
    HeaderComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)), // Inicializa Firebase
    provideFirestore(() => getFirestore()), // Configura Firestore
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule { }
