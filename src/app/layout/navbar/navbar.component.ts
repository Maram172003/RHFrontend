import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { interval, map, Observable, startWith, Subject, switchMap, take, takeUntil } from 'rxjs';
import { EmployeesService } from '../../private/services/employees.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppNotification, NotificationService } from '../../private/services/NotificationService';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  userFirstName = 'User';
  userRoleLabel = 'Employee';





  composerForm!: FormGroup;


  private userId?: string;
  private lineManagerId?: string;

  isNotifOpen = false;
  showComposer = false;


  notifications$!: Observable<AppNotification[]>;
  unreadCount$!: Observable<number>;


  recipients: any[] = [];



  now$ = interval(1000).pipe(startWith(0), map(() => new Date()));

  greeting$ = this.now$.pipe(
    map(d => {
      const h = d.getHours();
      if (h < 5) return 'Good Night';
      if (h < 12) return 'Good Morning';
      if (h < 17) return 'Good Afternoon';
      if (h < 22) return 'Good Evening';
      return 'Good Night';
    })
  );
  

  constructor(private employeesService: EmployeesService,
    private notificationsService: NotificationService,
    private fb: FormBuilder) { }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  ngOnInit(): void {

    this.composerForm = this.fb.group({
      recipientId: [null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(80)]],
      message: ['', [Validators.required, Validators.maxLength(1000)]],
    });


    this.notifications$ = this.notificationsService.items$;
    this.unreadCount$ = this.notifications$.pipe(
      map(list => (list ?? []).filter(n => !n.readAt).length)
    );

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;

    this.notificationsService.loadMine().pipe(take(1)).subscribe();
    interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationsService.loadMine()),
        takeUntil(this.destroy$)
      )
      .subscribe();

    const payload = this.decodeJwt(token);
    const userId = payload?.id;
    const roles = payload?.roles || [];

    this.userRoleLabel = this.roleLabelFromRoles(roles);


    if (userId) {
      this.employeesService.getById(userId).pipe(take(1)).subscribe({
        next: (emp: any) => {
          this.userFirstName = emp?.firstName || emp?.name || 'User';

          this.lineManagerId = emp?.lineManagerId || emp?.managerId || emp?.line_manager_id;
        },
        error: () => {

        }
      });
    }




  }

  toggleNotif(): void {
    this.isNotifOpen = !this.isNotifOpen;
    if (this.isNotifOpen) {

      this.notificationsService.loadMine().pipe(take(1)).subscribe();
    } else {
      this.showComposer = false;
    }
  }

  openComposer(): void {
    this.showComposer = true;
    this.composerForm.reset({ recipientId: null, title: '', message: '' });


    this.notificationsService.getRecipients().pipe(take(1)).subscribe({
      next: (list: any[]) => this.recipients = list || [],
      error: () => this.recipients = [],
    });
  }
  closeComposer(): void {
    this.showComposer = false;
  }

  sendNotification(): void {
    if (this.composerForm.invalid) {
      this.composerForm.markAllAsTouched();
      return;
    }

    const v = this.composerForm.value;
    this.notificationsService.send({
      recipientId: v.recipientId,
      title: String(v.title || '').trim(),
      message: String(v.message || '').trim(),
    }).pipe(take(1)).subscribe({
      next: () => {
        // reload list
        this.notificationsService.loadMine().pipe(take(1)).subscribe();
        this.showComposer = false;
      }
    });
  }

  clickNotifItem(n: AppNotification): void {
    if (!n.readAt) {
      this.notificationsService.markRead(n.id).pipe(take(1)).subscribe();
    }
  }
  @HostListener('document:click')
  onDocClick() {
    if (this.isNotifOpen) {
      this.isNotifOpen = false;
      this.showComposer = false;
    }
  }



  private decodeJwt(token: string): any | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private roleLabelFromRoles(roles: any[]): string {
    const list = (roles || []).map((r: any) =>
      String(r?.name ?? r).toLowerCase()
    );

    if (list.includes('admin')) return 'Admin';
    if (list.includes('hr')) return 'HR';
    if (list.includes('supervisor')) return 'Supervisor';
    return 'Employee';
  }




}
