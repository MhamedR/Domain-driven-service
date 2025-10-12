import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Authentication Service
 * 
 * This service handles:
 * - User authentication and authorization
 * - JWT token management
 * - User session management
 * - Login/logout operations
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = localStorage.getItem(this.USER_KEY);

    if (token && user) {
      try {
        const userObj = JSON.parse(user);
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(userObj);
      } catch (error) {
        this.clearAuth();
      }
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    this.isLoadingSubject.next(true);

    try {
      const response = await this.http.post<LoginResponse>(
        `${this.API_URL}/auth/login`,
        credentials
      ).toPromise();

      if (response?.success && response.token) {
        this.setAuth(response.token, response.user);
        return response;
      } else {
        throw new Error(response?.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  /**
   * Register new user
   */
  async register(userData: any): Promise<any> {
    this.isLoadingSubject.next(true);

    try {
      const response = await this.http.post<any>(
        `${this.API_URL}/auth/register`,
        userData
      ).toPromise();

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Set authentication data
   */
  private setAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(user);
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.http.post<any>(
        `${this.API_URL}/auth/refresh`,
        { token: this.getToken() }
      ).toPromise();

      if (response?.success && response.token) {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Validate token
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await this.http.post<any>(
        `${this.API_URL}/auth/validate`,
        { token: this.getToken() }
      ).toPromise();

      return response?.success || false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}
