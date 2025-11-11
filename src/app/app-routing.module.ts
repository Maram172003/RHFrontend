import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeeLeaveComponent } from './private/componenets/employee-leave/employee-leave.component';
import { DashboardEmployeeComponent } from './private/componenets/dashboard-employee/dashboard-employee.component';
import { DashboardAdminstrationComponent } from './private/componenets/dashboard-adminstration/dashboard-adminstration.component';
import { EmployeeComponent } from './private/componenets/employee/employee.component';
import { LeaveAdminstrationComponent } from './private/componenets/leave-adminstration/leave-adminstration.component';
import { LeaveSupervisorComponent } from './private/componenets/leave-supervisor/leave-supervisor.component';
import { DashboardSupervisorComponent } from './private/componenets/dashboard-supervisor/dashboard-supervisor.component';
import { LoginComponent } from './auth/components/login/login.component';
import { ResetAccessCodeComponent } from './auth/components/reset-access-code/reset-access-code.component';





const routes: Routes = [
 
  
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  

  { path: 'login', component: LoginComponent },


  { path: 'dashboard-employee', component: DashboardEmployeeComponent },
  { path: 'dashboard-admin', component: DashboardAdminstrationComponent },
  { path: 'dashboard-super', component: DashboardSupervisorComponent },

  { path: 'reset-access-code', component: ResetAccessCodeComponent },
  

  {
    path: 'leave',
    children: [
      { path: '', redirectTo: 'demands', pathMatch: 'full' },   
      { path: 'demands', component: EmployeeLeaveComponent },
      { path: 'credit', component: EmployeeLeaveComponent },
      { path: 'team', component: EmployeeLeaveComponent },
    ],
  },


  { path: 'employees', component: EmployeeComponent },


  { path: 'leave-admin', component: LeaveAdminstrationComponent },


  { path: 'leave-super', component: LeaveSupervisorComponent },


  { path: '**', redirectTo: 'login' }
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
