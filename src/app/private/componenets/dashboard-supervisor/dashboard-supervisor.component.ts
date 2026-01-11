import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
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
  
  private dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  ngOnInit(): void {
    this.generateCurrentWeekDays();


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
