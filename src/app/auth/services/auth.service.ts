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
  constructor(private http: HttpClient) {}

  login(email: string, accessCode: string): Observable<LoginResponse> {
 
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { email, accessCode });
  }
    resetAccessCode(dto: ResetAccessCodeDto): Observable<ResetAccessCodeResponse> {
    return this.http.post<ResetAccessCodeResponse>(`${this.base}/auth/reset-code`, dto);
  }
}
