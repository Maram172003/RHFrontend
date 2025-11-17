import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeaveItem {
  id: string;
  leaveType: string;
  startDate: string;
  startPart: 'full'|'morning'|'afternoon';
  endDate: string;
  endPart: 'full'|'morning'|'afternoon';
  status: 'onhold'|'valid'|'canceled';
  attachmentPath?: string | null;
  createdAt: string;
}

export interface CreateLeaveResponse {
  ok: boolean;
  leave: LeaveItem;
}
@Injectable({
  providedIn: 'root'
})
export class LeavesService {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {

  }

  createLeave(fd: FormData): Observable<CreateLeaveResponse> {
   
    return this.http.post<CreateLeaveResponse>(`${this.base}/leaves`, fd);
  }

  listMyLeaves(): Observable<LeaveItem[]> {
    return this.http.get<LeaveItem[]>(`${this.base}/leaves/me`);
  }

}
