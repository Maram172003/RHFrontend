import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../types/login-response';
import { ResetAccessCodeDto } from '../types/reset-access-code-dto';
import { ResetAccessCodeResponse } from '../types/reset-access-code-response';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  login(email: string, accessCode: string): Observable<LoginResponse> {

    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { email, accessCode });
  }
  resetAccessCode(dto: ResetAccessCodeDto): Observable<ResetAccessCodeResponse> {
    return this.http.post<ResetAccessCodeResponse>(`${this.base}/auth/reset-code`, dto);
  }
  private decodeTokenPayload(): any | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payloadPart = token.split('.')[1];
      const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  getMainRole(): 'admin' | 'hr' | 'supervisor' | 'employee' {
    const p = this.decodeTokenPayload();
    const raw = p?.roles ?? [];
    const list = Array.isArray(raw) ? raw : [raw];

    const roles = list
      .map((x: any) => String(x?.name ?? x).trim().toLowerCase())
      .filter(Boolean);

    if (roles.includes('admin')) return 'admin';
    if (roles.includes('hr') || roles.includes('rh')) return 'hr'; 
    if (roles.includes('supervisor')) return 'supervisor';
    return 'employee';
  }

  isEmployee(): boolean { return this.getMainRole() === 'employee'; }
  isSupervisor(): boolean { return this.getMainRole() === 'supervisor'; }
  isAdmin(): boolean { return this.getMainRole() === 'admin'; }
}
