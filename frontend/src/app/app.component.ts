import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

/**
 * Main App Component
 * 
 * This component handles:
 * - Application initialization
 * - Authentication state management
 * - Theme management
 * - Navigation structure
 */

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'Domain-Driven Microservices';
  isAuthenticated = false;
  currentUser: any = null;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize authentication state
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Initialize theme
    this.themeService.initializeTheme();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
