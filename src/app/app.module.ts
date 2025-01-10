import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TabsComponent } from './core/components/tabs/tabs.component';
import { HeaderComponent } from './core/components/header/header.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { environment } from 'src/environmets/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';



@NgModule({
    declarations: [
        AppComponent,
        TabsComponent,
        HeaderComponent,
    ],
    bootstrap: [AppComponent],
    imports: [BrowserModule, AppRoutingModule, AngularFireModule.initializeApp(environment.firebase),
        AngularFireDatabaseModule,],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }
