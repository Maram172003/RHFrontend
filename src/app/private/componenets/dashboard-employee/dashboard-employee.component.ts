import { Component } from '@angular/core';
interface DayData {
  label: string;
  hours: number | null;
}

@Component({
  selector: 'app-dashboard-employee',
  standalone: false,
  templateUrl: './dashboard-employee.component.html',
  styleUrl: './dashboard-employee.component.css'
})
export class DashboardEmployeeComponent {
    days: DayData[] = [];

  private dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  ngOnInit(): void {
    this.generateCurrentWeekDays();
  }

  generateCurrentWeekDays(): void {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculer le lundi de la semaine courante (début de semaine)
    const startOfWeek = new Date(today);
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1; // Si dimanche (0), on remonte à 6 jours
    startOfWeek.setDate(today.getDate() - daysSinceMonday);
    
    this.days = [];
    
    // Générer les 5 jours ouvrables (Lundi à Vendredi)
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
  lastUpdated: Date = new Date();


}
