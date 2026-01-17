import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum LeavePart {
  Full = 'full',
  Morning = 'morning',
  Afternoon = 'afternoon',
}

export enum LeaveStatus {
  Pending = 'pending',
  Approved = 'approved',
  Refused = 'refused',
}

export interface LeaveRow {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  startPart: LeavePart;
  endPart: LeavePart;
  status: LeaveStatus;
  attachmentPath?: string | null;
  createdAt: string;
  duration: number;
  attachmentUrl?: string;
  otherReason?: string;
  employeeId?: string;
  employeeName?: string;
}

@Injectable({ providedIn: 'root' })
export class LeavesService {

  base = `${environment.apiBaseUrl}/leaves`;

  constructor(private http: HttpClient) {

  }

  createLeave(fd: FormData): Observable<{ ok: boolean; leave: LeaveRow }> {
    return this.http.post<{ ok: boolean; leave: LeaveRow }>(this.base, fd);
  }

  getMyLeaves(): Observable<LeaveRow[]> {
    return this.http.get<LeaveRow[]>(`${this.base}/my`);
  }


  getLeaveById(id: string) {
    return this.http.get(`${this.base}/${id}`);
  }

  updateLeave(id: string, fd: FormData) {
    return this.http.patch(`${this.base}/${id}`, fd);
  }

  deleteLeave(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }


  getTeamLeaves(): Observable<LeaveRow[]> {
    return this.http.get<LeaveRow[]>(`${this.base}/team`);
  }

  updateLeaveStatus(id: string, status: LeaveStatus) {
    return this.http.patch<{ ok: boolean; leave: LeaveRow }>(
      `${this.base}/${id}/status`,
      { status }
    );
  }
}
