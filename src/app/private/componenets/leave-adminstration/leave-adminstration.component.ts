import { Component } from '@angular/core';

@Component({
  selector: 'app-leave-adminstration',
  standalone: false,
  templateUrl: './leave-adminstration.component.html',
  styleUrl: './leave-adminstration.component.css'
})
export class LeaveAdminstrationComponent {
 activeTab: 'team-demand'  = 'team-demand';

  selectTab(tab: 'team-demand' ) {
    this.activeTab = tab;
  }
}
