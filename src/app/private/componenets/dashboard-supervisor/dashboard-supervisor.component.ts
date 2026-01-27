import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { LeavesService } from '../../services/leaves.service';
interface DayData {
  label: string;
  hours: number | null;
}

@Component({
  selector: 'app-dashboard-supervisor',
  standalone: false,
  templateUrl: './dashboard-supervisor.component.html',
  styleUrl: './dashboard-supervisor.component.css'
})
export class DashboardSupervisorComponent {
  days: DayData[] = [];
  lastUpdated: Date = new Date();
  lastLeaveStatus: string = '-';
  lastLeaveUpdated: Date | null = null;
  private dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  constructor(private leavesService: LeavesService,) { }
  ngOnInit(): void {
    this.generateCurrentWeekDays();
    this.loadLastLeaveDemand();

  }
  private loadLastLeaveDemand() {
    this.leavesService.getMyLeaves().subscribe({
      next: (rows: any[]) => {
        const list = rows ?? [];
        if (!list.length) {
          this.lastLeaveStatus = '-';
          this.lastLeaveUpdated = null;
          return;
        }

        const last = [...list].sort((a, b) => {
          const da = new Date(a.updatedAt || a.createdAt || a.startDate || a.createdDate || 0).getTime();
          const db = new Date(b.updatedAt || b.createdAt || b.startDate || b.createdDate || 0).getTime();
          return db - da;
        })[0];

        
        this.lastLeaveStatus = String(last?.status ?? '-');
        this.lastLeaveUpdated = new Date(last?.updatedAt || last?.createdAt || last?.startDate || last?.createdDate);
      },
      error: () => {
        this.lastLeaveStatus = '-';
        this.lastLeaveUpdated = null;
      }
    });
  }
  generateCurrentWeekDays(): void {
    const today = new Date();
    const currentDay = today.getDay();


    const startOfWeek = new Date(today);
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    startOfWeek.setDate(today.getDate() - daysSinceMonday);

    this.days = [];


    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const day = date.getDate();
      const dayName = this.dayNames[date.getDay()];

      this.days.push({
        label: `${day} ${dayName}`,
        hours: null
      });
    }
  }

}
