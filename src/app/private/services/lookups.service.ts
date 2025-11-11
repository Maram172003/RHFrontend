import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LookupsService {

  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  getStates() { return this.http.get<string[]>(`${this.base}/lookups/states`); }
  getNationalities() { return this.http.get<string[]>(`${this.base}/lookups/nationalities`); }
  getCities(state: string) {
    return this.http.get<string[]>(`${this.base}/lookups/cities`, { params: { state } });
  }

  getMarital() { return this.http.get<string[]>(`${this.base}/lookups/marital-statuses`); }
  getGenders() { return this.http.get<string[]>(`${this.base}/lookups/genders`); }
  getContractTypes() { return this.http.get<string[]>(`${this.base}/lookups/contract-types`); }
  getRelationships() { return this.http.get<string[]>(`${this.base}/lookups/relationships`); }
  
  getDepartments() { return this.http.get<string[]>(`${this.base}/lookups/departments`); }
  getDesignations(department: string) {
    return this.http.get<string[]>(`${this.base}/lookups/designations`, { params: { department } });
  }

}
