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

  { path: 'reset-access-code', component: ResetAccessCodeComponent },

  { path: 'dashboard-employee', component: DashboardEmployeeComponent },
  { path: 'leave-employee', component: EmployeeLeaveComponent },

  { path: 'dashboard-super', component: DashboardSupervisorComponent },
  { path: 'leave-super', component: LeaveSupervisorComponent },

  { path: 'dashboard-admin', component: DashboardAdminstrationComponent },
  { path: 'leave-admin', component: LeaveAdminstrationComponent },
  { path: 'employees', component: EmployeeComponent },



  { path: '**', redirectTo: 'login' }
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
