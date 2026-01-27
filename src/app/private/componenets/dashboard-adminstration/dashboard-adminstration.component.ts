import { Component, HostListener, OnInit } from '@angular/core';
import { EmployeesService } from '../../services/employees.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';
import { LeavesService } from '../../services/leaves.service';

@Component({
  selector: 'app-dashboard-adminstration',
  standalone: false,
  templateUrl: './dashboard-adminstration.component.html',
  styleUrl: './dashboard-adminstration.component.css'
})
export class DashboardAdminstrationComponent implements OnInit {

  leaveDate: Date = new Date();
  todoDate: Date = new Date();
  openMenu: 'leave' | 'todo' | null = null;

  yesterday!: Date;
  twoDaysAgo!: Date;

  lastUpdated: Date = new Date();


  totalEmployees = 0;
  pendingTimeOff = 0;
  todayAttendance = 0;
  totalDepartments = 0;

  updateLabel = '';


  leavesCache: any[] = [];

  leaveTotalAbsence = 0;

  leaveTypes = [
    { key: 'paid leave', label: 'Paid leave' },
    { key: 'sickness', label: 'Sickness' },
    { key: 'remote', label: 'Remote' },
    { key: 'maternity', label: 'Maternity' },
    { key: 'unpaid leave', label: 'unpaid leave' },
  ];

  leaveTypeCount: Record<string, number> = {};
  leaveTypePercent: Record<string, number> = {};

  constructor(
    private employeesService: EmployeesService,
    private leavesService: LeavesService
  ) { }

  ngOnInit(): void {
    const today = new Date();

    this.yesterday = new Date(today);
    this.yesterday.setDate(today.getDate() - 1);

    this.twoDaysAgo = new Date(today);
    this.twoDaysAgo.setDate(today.getDate() - 2);

    this.leaveDate = new Date();
    this.todoDate = new Date();

    this.loadCards();
  }



  setCardDate(menu: 'leave' | 'todo', d: Date): void {
    if (menu === 'leave') {
      this.leaveDate = d;
      this.computeLeaveOverviewForDate(this.leaveDate);
    } else {
      this.todoDate = d;
      // ici tu peux calculer / filtrer les todos par date plus tard
    }
    this.openMenu = null;
  }

  toggleDateMenu(menu: 'leave' | 'todo'): void {
    this.openMenu = this.openMenu === menu ? null : menu;
  }
  @HostListener('document:click')
  closeOnOutsideClick(): void {
    this.openMenu = null;
  }

  private loadCards() {
    const employees$ = this.employeesService.list();

    const leaves$ = this.leavesService.getTeamLeaves();


    forkJoin({ employees: employees$, leaves: leaves$ }).subscribe({
      next: ({ employees, leaves }) => {
        const emps = employees ?? [];
        const lvs = leaves ?? [];


        this.totalEmployees = emps.length;


        const departments = emps
          .map((e: any) => (e.department || '').trim())
          .filter((d: string) => !!d);
        this.totalDepartments = new Set(departments).size;


        this.pendingTimeOff = lvs.filter((l: any) => this.isStatus(l?.status, 'pending')).length;


        const today = this.toYmd(new Date());
        const employeesOnLeaveToday = new Set(
          lvs
            .filter((l: any) => this.isStatus(l?.status, 'approved') && this.isTodayInRange(today, l))
            .map((l: any) => l.employeeId)
            .filter((id: any) => !!id)
        );

        this.todayAttendance = Math.max(0, this.totalEmployees - employeesOnLeaveToday.size);

        this.updateLabel = this.formatDate(new Date());

        this.leavesCache = lvs;
        this.computeLeaveOverviewForDate(this.lastUpdated);
      },
      error: (err) => {
        console.error('Dashboard cards error', err);
      }
    });
  }

  private isStatus(value: any, expected: 'pending' | 'approved' | 'rejected') {
    const v = String(value || '').trim().toLowerCase();
    return v === expected;
  }

  private isTodayInRange(todayYmd: string, leave: any) {

    const sRaw = leave?.startDate ? new Date(leave.startDate) : null;
    const eRaw = leave?.endDate ? new Date(leave.endDate) : null;
    if (!sRaw || isNaN(sRaw.getTime()) || !eRaw || isNaN(eRaw.getTime())) return false;

    const start = this.toYmd(sRaw);
    const end = this.toYmd(eRaw);
    return todayYmd >= start && todayYmd <= end;
  }

  private toYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDate(d: Date) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
  }


  private computeLeaveOverviewForDate(date: Date) {
    const day = this.toYmd(date);


    this.leaveTypeCount = {};
    this.leaveTypePercent = {};
    this.leaveTypes.forEach(t => (this.leaveTypeCount[t.key] = 0));

    const approvedThatDay = (this.leavesCache || []).filter(l =>
      this.isStatus(l?.status, 'approved') && this.isTodayInRange(day, l)
    );


    const uniqueEmployees = new Set(
      approvedThatDay.map(l => l.employeeId).filter(Boolean)
    );
    this.leaveTotalAbsence = uniqueEmployees.size;


    for (const l of approvedThatDay) {
      const typeKey = this.normalizeLeaveType(l?.leaveType);
      if (typeKey && this.leaveTypeCount[typeKey] !== undefined) {
        this.leaveTypeCount[typeKey]++;
      }
    }

    const total = this.leaveTotalAbsence || 0;
    this.leaveTypes.forEach(t => {
      const c = this.leaveTypeCount[t.key] || 0;
      this.leaveTypePercent[t.key] = total === 0 ? 0 : Math.round((c / total) * 100);
    });
  }

  private normalizeLeaveType(raw: any): string {
    const v = String(raw || '').trim().toLowerCase();


    if (v.includes('paid')) return 'paid leave';
    if (v.includes('sick')) return 'sickness';
    if (v.includes('remote')) return 'remote';
    if (v.includes('maternity')) return 'maternity';
    if (v.includes('unpaid')) return 'unpaid leave';

    return '';
  }
}
