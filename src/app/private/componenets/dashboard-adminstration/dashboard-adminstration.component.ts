import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-dashboard-adminstration',
  standalone: false,
  templateUrl: './dashboard-adminstration.component.html',
  styleUrl: './dashboard-adminstration.component.css'
})
export class DashboardAdminstrationComponent {
  lastUpdated: Date = new Date();
   dateMenuOpen = false;
  yesterday!: Date;
  twoDaysAgo!: Date;

  ngOnInit(): void {
    const today = new Date();

    this.yesterday = new Date(today);
    this.yesterday.setDate(today.getDate() - 1);

    this.twoDaysAgo = new Date(today);
    this.twoDaysAgo.setDate(today.getDate() - 2);
  }

  toggleDateMenu(): void {
    this.dateMenuOpen = !this.dateMenuOpen;
  }

  setLastUpdated(d: Date): void {
    this.lastUpdated = d;
    this.dateMenuOpen = false;
  }
    @HostListener('document:click')
  closeOnOutsideClick(): void {
    this.dateMenuOpen = false;
  }

}
