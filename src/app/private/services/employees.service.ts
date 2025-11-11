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

  updateRoles(id: string, roles: Role[])  {
    return this.http.patch<{ ok: boolean; employee: any }>(
      `${this.base}/employees/${id}/roles`,   
      { roles }                               
    );
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