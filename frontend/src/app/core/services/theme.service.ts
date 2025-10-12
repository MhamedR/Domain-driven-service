import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Theme Service
 * 
 * This service handles:
 * - Theme management (light/dark mode)
 * - Theme persistence
 * - Theme switching
 */

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app_theme';
  private readonly DARK_THEME = 'dark-theme';
  private readonly LIGHT_THEME = 'light-theme';

  private isDarkThemeSubject = new BehaviorSubject<boolean>(false);
  public isDarkTheme$ = this.isDarkThemeSubject.asObservable();

  constructor() {}

  /**
   * Initialize theme from localStorage or system preference
   */
  initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    
    if (savedTheme) {
      this.setTheme(savedTheme === this.DARK_THEME);
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark);
    }
  }

  /**
   * Toggle theme between light and dark
   */
  toggleTheme(): void {
    this.setTheme(!this.isDarkThemeSubject.value);
  }

  /**
   * Set theme
   */
  setTheme(isDark: boolean): void {
    const theme = isDark ? this.DARK_THEME : this.LIGHT_THEME;
    
    // Update class on document body
    document.body.classList.remove(this.DARK_THEME, this.LIGHT_THEME);
    document.body.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem(this.THEME_KEY, theme);
    
    // Update subject
    this.isDarkThemeSubject.next(isDark);
  }

  /**
   * Get current theme
   */
  get isDarkTheme(): boolean {
    return this.isDarkThemeSubject.value;
  }

  /**
   * Get current theme name
   */
  get currentTheme(): string {
    return this.isDarkTheme ? this.DARK_THEME : this.LIGHT_THEME;
  }
}
