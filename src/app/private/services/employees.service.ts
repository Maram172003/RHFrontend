import { HttpClient } from '@angular/common/http';

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Role } from '../types/role.enum';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  create(body: { email: string }) {
    return this.http.post<{ employee: any; plainAccessCode: string }>(
      `${this.base}/employees`,
      body
    );
  }

  //
  saveDetails(id: string, body: any) {
    return this.http.post<{ ok: boolean; employee: any }>(`${this.base}/employees/${id}/details`, body);
  }

  updateRoles(id: string, roles: Role[]) {
    return this.http.patch<{ ok: boolean; employee: any }>(
      `${this.base}/employees/${id}/roles`,
      { roles }
    );
  }
  list() {
    return this.http.get<any[]>(`${this.base}/employees`);
  }

  createDraft(body: { email: string }) {
    return this.http.post<{ draftToken: string; plainAccessCode: string }>(
      `${this.base}/employees/draft`,
      body
    );
  }

  submitDraft(body: { draftToken: string; details: any; roles: Role[] }) {
    return this.http.post<{ employee: any; plainAccessCode?: string }>(
      `${this.base}/employees/submit`,
      body
    );
  }

  deleteDraft(token: string) {
    return this.http.delete(`${this.base}/employees/draft/${token}`);
  }
  getById(id: string) {
    return this.http.get<any>(`${this.base}/employees/${id}`);
  }

  deleteEmployee(id: string) {
    return this.http.delete<void>(`${this.base}/employees/${id}`);
  }

  
  //  
  /*
  
    updateProfile(id: string, body: any) {
      return this.http.patch<{ ok: boolean; employee: any }>(`${this.base}/employees/${id}/profile`, body);
    }
  
    markSeen(id: string) {
      return this.http.patch<{ ok: boolean }>(`${this.base}/employees/${id}/seen`, {});
    }
  
    delete(id: string) {
      return this.http.delete<{ ok: boolean }>(`${this.base}/employees/${id}`);
    }
  
  */
}