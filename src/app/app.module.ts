import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


import { EmployeeLeaveComponent } from './private/componenets/employee-leave/employee-leave.component';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { DashboardEmployeeComponent } from './private/componenets/dashboard-employee/dashboard-employee.component';
import { SidebarAdministrationComponent } from './layout/sidebar-administration/sidebar-administration.component';
import { DashboardAdminstrationComponent } from './private/componenets/dashboard-adminstration/dashboard-adminstration.component';
import { EmployeeComponent } from './private/componenets/employee/employee.component';
import { LeaveAdminstrationComponent } from './private/componenets/leave-adminstration/leave-adminstration.component';
import { LeaveSupervisorComponent } from './private/componenets/leave-supervisor/leave-supervisor.component';
import { DashboardSupervisorComponent } from './private/componenets/dashboard-supervisor/dashboard-supervisor.component';
import { SidebarsuperComponent } from './layout/sidebarsuper/sidebarsuper.component';
import { LoginComponent } from './auth/components/login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ResetAccessCodeComponent } from './auth/components/reset-access-code/reset-access-code.component';
import { JwtInterceptor } from './auth/services/jwt.interceptor';




@NgModule({
  declarations: [
    AppComponent,
    EmployeeLeaveComponent,
    DashboardAdminstrationComponent,
    NavbarComponent,
    SidebarComponent,
    DashboardEmployeeComponent,
    SidebarAdministrationComponent,
    EmployeeComponent,
    LeaveAdminstrationComponent,
    LeaveSupervisorComponent,
    DashboardSupervisorComponent,
    SidebarsuperComponent,
    LoginComponent,
    ResetAccessCodeComponent,
    

    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,

  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },],
  bootstrap: [AppComponent]
})
export class AppModule { }
