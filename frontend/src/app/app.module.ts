import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { AppComponent } from './app.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { ObjectivesComponent } from './features/objectives/objectives.component';
import { TechUpdatesComponent } from './features/tech-updates/tech-updates.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/auth/login/login.component';

// Services
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

// Routes
const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'objectives', component: ObjectivesComponent },
  { path: 'tech-updates', component: TechUpdatesComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    CalendarComponent,
    ObjectivesComponent,
    TechUpdatesComponent,
    SettingsComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    
    // Angular Material
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatExpansionModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatTooltipModule
  ],
  providers: [
    AuthService,
    ThemeService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
