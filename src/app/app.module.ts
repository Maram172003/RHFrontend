import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';



import { NavbarComponent } from './layout/navbar/navbar.component';

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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {  NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SettingsComponent } from './private/componenets/settings/settings.component';





@NgModule({
  declarations: [
    AppComponent,

    DashboardAdminstrationComponent,
    NavbarComponent,

    SidebarAdministrationComponent,
    EmployeeComponent,
    LeaveAdminstrationComponent,
    LeaveSupervisorComponent,
    DashboardSupervisorComponent,
    SidebarsuperComponent,
    LoginComponent,
    ResetAccessCodeComponent,
    SettingsComponent,



  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NoopAnimationsModule,
    

  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },],
  bootstrap: [AppComponent]
})
export class AppModule { }
