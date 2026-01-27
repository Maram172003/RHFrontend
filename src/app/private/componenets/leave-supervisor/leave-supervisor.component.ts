import { Component } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';

import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { LeavePart, LeaveRow, LeavesService, LeaveStatus } from '../../services/leaves.service';

type Tab = 'demands' | 'credit' | 'team-demand';
@Component({
  selector: 'app-leave-supervisor',
  standalone: false,
  templateUrl: './leave-supervisor.component.html',
  styleUrl: './leave-supervisor.component.css'
})
export class LeaveSupervisorComponent {

  apiBase = 'http://localhost:4000';
  editId: string | null = null;
  picking: 'start' | 'end' = 'start';

  activeTab: Tab = 'demands';
  activeFilter: 'onhold' | 'valid' | 'canceled' | 'all' | 'category' = 'all';

  showOverlay = false;
  submitted = false;

  apiError: string | null = null;

  today = new Date().toISOString().slice(0, 10);

  file: File | null = null;
  fileName: string | null = null;

  LeavePart = LeavePart;

  myLeaves: LeaveRow[] = [];

  selectedCategory: string = '';

  leaveForm!: FormGroup;

  availableLeaves = 12;
  lastUpdated: Date = new Date();

  constructor(
    private fb: FormBuilder,
    private leavesService: LeavesService,
    public authService: AuthService,
  ) { }
  setFilter(f: any) {
    this.activeFilter = f;

    if (f !== 'category') {
      this.selectedCategory = '';
    }

    this.currentPage = 1;
  }

  onCategoryChange(value: string) {
    this.selectedCategory = value;
    this.activeFilter = 'category';
    this.currentPage = 1;
  }

  private getFilteredMyLeaves(): LeaveRow[] {
    const norm = (s: any) => String(s || '').toLowerCase();
    let list = [...(this.myLeaves || [])];


    if (this.activeFilter === 'onhold') {
      list = list.filter(l => norm(l.status) === 'pending');
    } else if (this.activeFilter === 'valid') {
      list = list.filter(l => norm(l.status) === 'approved');
    } else if (this.activeFilter === 'canceled') {
      list = list.filter(l => ['refused', 'canceled'].includes(norm(l.status)));
    }


    if (this.selectedCategory) {
      list = list.filter(l => norm(l.leaveType) === norm(this.selectedCategory));
    }

    return list;
  }


  ngOnInit(): void {
    this.leaveForm = this.fb.group(
      {
        leaveType: ['', Validators.required],
        startDate: [this.today, Validators.required],
        endDate: [this.today, Validators.required],
        startPart: [LeavePart.Full, Validators.required],
        endPart: [LeavePart.Full, Validators.required],
        otherReason: [''],
      },
      { validators: [this.endAfterStartValidator] }
    );
    this.leaveForm.get('leaveType')?.valueChanges.subscribe(() => {
      this.applyLeaveTypeRules();
    });

    this.loadMyLeaves();
    this.loadBlockedDatesForYear(new Date().getFullYear());


  }

  private applyLeaveTypeRules() {
    const type = this.leaveForm.get('leaveType')?.value;


    const other = this.leaveForm.get('otherReason');
    if (type === 'other') {
      other?.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      other?.clearValidators();
      other?.setValue('');
    }
    other?.updateValueAndValidity({ emitEvent: false });


    const mustHaveAttachment =
      type === 'sickness' && !this.file && !this.existingAttachmentUrl;

    const current = { ...(this.leaveForm.errors || {}) };

    if (mustHaveAttachment) current['attachmentRequired'] = true;
    else delete current['attachmentRequired'];

    this.leaveForm.setErrors(Object.keys(current).length ? current : null);
  }


  openOverlay() {

    this.mode = 'create';
    this.currentLeaveId = null;

    this.showOverlay = true;
    this.apiError = null;
    this.submitted = false;

    const year = new Date().getFullYear();
    this.loadBlockedDatesForYear(year);
    const next = this.getNextSelectableDate(this.todayDate);
    const ymd = this.formatYMD(next);

    this.leaveForm.patchValue({
      startDate: ymd,
      endDate: ymd,
    });
    this.file = null;
    this.fileName = '';

    this.existingAttachmentUrl = null;
    this.existingAttachmentName = null;

    this.leaveForm.reset({
      leaveType: '',
      startDate: this.today,
      endDate: this.today,
      startPart: LeavePart.Full,
      endPart: LeavePart.Full,
    });
    this.loadBlockedDatesForYear(new Date().getFullYear());
  }

  closeOverlay() {
    this.showOverlay = false;
    this.submitted = false;

    this.mode = 'create';
    this.currentLeaveId = null;
    this.file = null;
  }


  endAfterStartValidator = (c: AbstractControl): ValidationErrors | null => {
    const start = c.get('startDate')?.value;
    const end = c.get('endDate')?.value;
    if (!start || !end) return null;
    return end < start ? { endBeforeStart: true } : null;
  };

  isInvalid(name: string): boolean {
    const ctrl = this.leaveForm.get(name);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitted);
  }

  getErrorMessage(name: string): string {
    const c = this.leaveForm.get(name);
    if (!c?.errors) return '';
    if (c.errors['required']) return `${name} is required`;
    return 'Invalid value';
  }

  // ===== Upload =====
  onFileSelected(e: any) {
    const f = e?.target?.files?.[0] as File;
    if (!f) return;
    this.file = f;
    this.fileName = f.name;
    this.applyLeaveTypeRules();
  }

  clearFile(e?: Event) {
    e?.stopPropagation();
    this.file = null;
    this.fileName = '';
    this.existingAttachmentUrl = null;
    this.existingAttachmentName = null;
    this.applyLeaveTypeRules();
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); }
  onDragLeave(ev: DragEvent) { ev.preventDefault(); }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const f = ev.dataTransfer?.files?.[0];
    if (!f) return;
    this.file = f;
    this.fileName = f.name;
    this.applyLeaveTypeRules();
  }
  existingAttachmentUrl: string | null = null;
  existingAttachmentName: string | null = null;
  mode: 'create' | 'edit' = 'create';
  currentLeaveId: string | null = null;
  onApply() {
    this.submitted = true;
    this.apiError = null;


    this.leaveForm.updateValueAndValidity({ emitEvent: false });
    this.leaveForm.markAllAsTouched();

    this.applyLeaveTypeRules();
    if (this.leaveForm.invalid) return;
    if (this.leaveForm.errors?.['attachmentRequired']) return;

    const v = this.leaveForm.getRawValue();
    const fd = new FormData();
    fd.append('leaveType', v.leaveType);
    fd.append('startDate', v.startDate);
    fd.append('endDate', v.endDate);
    fd.append('startPart', v.startPart);
    fd.append('endPart', v.endPart);
    if (v.leaveType === 'other') {
      fd.append('otherReason', v.otherReason);
    }

    const s = this.leaveForm.value.startDate;
    const e = this.leaveForm.value.endDate;

    if (s && this.disabledDates.has(s)) {
      this.apiError = 'Start date is not available (holiday or already has leave).';
      return;
    }
    if (e && this.disabledDates.has(e)) {
      this.apiError = 'End date is not available (holiday or already has leave).';
      return;
    }

    if (this.file) fd.append('attachment', this.file);

    const req$ =
      this.mode === 'edit' && this.currentLeaveId
        ? this.leavesService.updateLeave(this.currentLeaveId, fd)
        : this.leavesService.createLeave(fd);

    req$.subscribe({
      next: () => {
        this.mode = 'create';
        this.currentLeaveId = null;
        this.closeOverlay();
        this.loadMyLeaves();
      },
      error: (err) => this.handleApiError(err),
    });

  }

  loadMyLeaves() {
    this.leavesService.getMyLeaves().subscribe({
      next: (rows) => {
        this.myLeaves = rows || [];
        this.recomputeLeaveBalance();
        this.lastUpdated = new Date();
        this.loadBlockedDatesForYear(new Date().getFullYear());
      },
      error: (err) => this.handleApiError(err),
    });
  }

  private handleApiError(err: any) {
    const status = err?.status;
    const msg = err?.error?.message ?? err?.message ?? 'Unexpected error';


    const msgStr = Array.isArray(msg) ? msg.join(' • ') : String(msg);


    this.apiError =
      status === 0 ? 'Backend unreachable' :
        status >= 500 ? 'Internal server error' :
          msgStr;
  }

  pageSize = 5;
  currentPage = 1;
  get totalRecords(): number {
    return this.getFilteredMyLeaves().length;
  }



  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pagedLeaves(): any[] {
    const filtered = this.getFilteredMyLeaves();
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    const safe = Math.min(Math.max(1, page), this.totalPages);
    this.currentPage = safe;
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }


  selectedLeave: LeaveRow | null = null;
  showDetails = false;


  onView(r: any) {
    this.selectedLeave = r;
    this.existingAttachmentUrl = this.buildFileUrl(r.attachmentUrl);
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
    this.selectedLeave = null;
  }

  onEdit(r: any) {
    if (r.status !== 'pending') return;

    this.mode = 'edit';
    this.currentLeaveId = r.id;


    this.existingAttachmentUrl = this.buildFileUrl(r.attachmentUrl);


    this.existingAttachmentName = r.attachmentUrl
      ? r.attachmentUrl.split('/').pop() ?? 'attachment'
      : null;

    this.fileName = this.existingAttachmentName;

    this.showOverlay = true;

    this.leaveForm.patchValue({
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      startPart: r.startPart,
      endPart: r.endPart,
    });
    this.applyLeaveTypeRules();
  }
  private buildFileUrl(path?: string | null) {
    if (!path) return null;
    return path.startsWith('http') ? path : this.apiBase + path;
  }
  onDelete(r: LeaveRow) {
    if (r.status !== 'pending') return;

    this.leavesService.deleteLeave(r.id).subscribe({
      next: () => this.loadMyLeaves(),
      error: (err) => this.handleApiError(err),
    });
  }
  teamLeaves: LeaveRow[] = [];


  LeaveStatus = LeaveStatus;



  teamPage = 1;
  teamPageSize = 5;

  get teamTotalRecords() {
    return this.teamLeaves.length;
  }
  get teamTotalPages() {
    return Math.max(1, Math.ceil(this.teamTotalRecords / this.teamPageSize));
  }
  get teamPages(): number[] {
    return Array.from({ length: this.teamTotalPages }, (_, i) => i + 1);
  }
  get teamStartIndex() {
    return this.teamTotalRecords === 0 ? 0 : (this.teamPage - 1) * this.teamPageSize + 1;
  }
  get teamEndIndex() {
    return Math.min(this.teamPage * this.teamPageSize, this.teamTotalRecords);
  }
  get teamPagedLeaves() {
    const start = (this.teamPage - 1) * this.teamPageSize;
    return this.teamLeaves.slice(start, start + this.teamPageSize);
  }

  loadTeamLeaves() {
    this.leavesService.getTeamLeaves().subscribe({
      next: (rows) => {
        this.teamLeaves = rows || [];
        this.teamPage = 1;
      },
      error: (err) => this.handleApiError(err),
    });
  }


  selectTab(tab: Tab) {
    this.activeTab = tab;

    if (tab === 'demands') this.loadMyLeaves();
    if (tab === 'team-demand') this.loadTeamLeaves();
  }


  teamPrevPage() { if (this.teamPage > 1) this.teamPage--; }
  teamNextPage() { if (this.teamPage < this.teamTotalPages) this.teamPage++; }
  teamGoToPage(p: number) { this.teamPage = p; }

  updatingStatus = false;

  updateSelectedStatus(status: LeaveStatus) {
    if (!this.selectedLeave?.id) return;

    this.updatingStatus = true;
    this.leavesService.updateLeaveStatus(this.selectedLeave.id, status).subscribe({
      next: (res: any) => {

        const updated = res.leave;


        this.selectedLeave = {
          ...this.selectedLeave,
          ...updated,
          employeeName: updated.employeeName ?? this.selectedLeave?.employeeName
        };


        const idx = this.teamLeaves.findIndex(x => x.id === updated.id);
        if (idx !== -1) {
          this.teamLeaves[idx] = {
            ...this.teamLeaves[idx],
            ...updated,
            employeeName: updated.employeeName ?? this.teamLeaves[idx].employeeName
          };
        }

        this.loadMyLeaves();

        this.updatingStatus = false;
      },
      error: (err) => {
        this.updatingStatus = false;
        this.handleApiError(err);
      }
    });
  }

  holidayDates = new Set<string>();
  busyDates = new Set<string>();
  disabledDates = new Set<string>();

  private toKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    return !this.disabledDates.has(this.toKey(d));
  };

  dateClass = (d: Date): string => {
    const k = this.toKey(d);
    if (this.holidayDates.has(k)) return 'day-holiday';
    if (this.busyDates.has(k)) return 'day-busy';
    return '';
  };

  loadBlockedDatesForYear(year: number) {
    this.leavesService.getBlockedDates(year).subscribe({
      next: (res: any) => {
        this.holidayDates = new Set(res.holidays || []);
        this.busyDates = new Set(res.busy || []);
        this.disabledDates = new Set(res.disabled || []);
        const next = this.getNextSelectableDate(this.todayDate);
        const ymd = this.formatYMD(next);
        this.leaveForm.patchValue({ startDate: ymd, endDate: ymd });
      },
      error: (err) => this.handleApiError(err),
    });
  }
  get calendarSelected(): Date | null {
    const v = this.leaveForm.get(this.picking === 'start' ? 'startDate' : 'endDate')?.value;
    return v ? new Date(v) : null;
  }

  get displayStartDate(): string {
    const v = this.leaveForm.get('startDate')?.value;
    return v ? this.toKey(new Date(v)) : '';
  }

  get displayEndDate(): string {
    const v = this.leaveForm.get('endDate')?.value;
    return v ? this.toKey(new Date(v)) : '';
  }
  onCalendarPick(d: Date | null) {
    if (!d) return;

    // si tu utilises dateFilter
    if (!this.dateFilter(d)) return;

    const key = this.toKey(d);

    if (this.picking === 'start') {
      this.leaveForm.patchValue({ startDate: key });

      const end = this.leaveForm.get('endDate')?.value;
      if (!end || end < key) this.leaveForm.patchValue({ endDate: key });
    } else {
      this.leaveForm.patchValue({ endDate: key });
    }
  }
  todayDate: Date = new Date();

  sideCalendarOpen = false;
  sideTarget: 'start' | 'end' = 'start';

  openSideCalendar(target: 'start' | 'end') {
    this.sideTarget = target;
    this.sideCalendarOpen = true;
  }

  closeSideCalendar() {
    this.sideCalendarOpen = false;
  }

  onSideDateSelected(d: Date | null) {
    if (!d) return;

    const ymd = this.formatYMD(d); // ✅ "2026-01-20"

    if (this.sideTarget === 'start') {
      this.leaveForm.patchValue({ startDate: ymd });
    } else {
      this.leaveForm.patchValue({ endDate: ymd });
    }
  }

  private formatYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  parseYMD(s: string | null | undefined): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  private isSelectableDate(d: Date): boolean {
    return this.dateFilter(d);
  }

  private getNextSelectableDate(from: Date): Date {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);


    for (let i = 0; i < 366; i++) {
      if (this.isSelectableDate(d)) return d;
      d.setDate(d.getDate() + 1);
    }
    return new Date(from);
  }


  /////
  private readonly PAID_TYPES = new Set(['paid']);
  private readonly ACCRUAL_PER_MONTH = 1;
  private readonly YEAR_CAP_DAYS = 12;

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  private monthsWorkedInYear(hireDate: Date, year: number): number {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const start = hireDate > startOfYear ? hireDate : startOfYear;
    const end = new Date() < endOfYear ? new Date() : endOfYear;

    if (end < start) return 0;


    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }

  private accruedDaysForYear(hireDate: Date, year: number): number {
    const startOfYear = new Date(year, 0, 1);


    if (hireDate <= startOfYear) return this.YEAR_CAP_DAYS;


    const months = this.monthsWorkedInYear(hireDate, year);
    const acquired = months * this.ACCRUAL_PER_MONTH;
    return Math.min(acquired, this.YEAR_CAP_DAYS);
  }

  private parseDateSafe(d: any): Date | null {
    if (!d) return null;

    if (typeof d === 'string') {
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }



  private getHireDate(): Date {
    const fromAuth =
      (this.authService as any)?.currentUser?.contractStart ||
      (this.authService as any)?.me?.contractStart ||
      (this.authService as any)?.currentUser?.createdAt;

    const d = this.parseYMD(fromAuth);
    return d ?? new Date(new Date().getFullYear(), 0, 1);
  }

  private recomputeLeaveBalance(): void {
    const year = new Date().getFullYear();
    const hireDate = this.getHireDate();

    const acquired = this.accruedDaysForYear(hireDate, year);
    const taken = this.takenApprovedPaidDaysForYear(year);

    this.availableLeaves = Math.max(0, acquired - taken);
  }
  private takenApprovedPaidDaysForYear(year: number): number {
    return (this.myLeaves || [])
      .filter(l => (l.status || '').toLowerCase() === 'approved')
      .filter(l => (l.leaveType || '').toLowerCase() === 'paid')
      .filter(l => {
        const sd = this.parseYMD(l.startDate);
        return sd && sd.getFullYear() === year;
      })
      .reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
  }



}

