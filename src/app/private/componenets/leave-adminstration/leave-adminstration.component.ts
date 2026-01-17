import { Component } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { LeavePart, LeaveRow, LeavesService, LeaveStatus } from '../../services/leaves.service';
type Tab = 'demands' | 'credit' | 'team-demand';
@Component({
  selector: 'app-leave-adminstration',
  standalone: false,
  templateUrl: './leave-adminstration.component.html',
  styleUrl: './leave-adminstration.component.css'
})
export class LeaveAdminstrationComponent {
   apiBase = 'http://localhost:4000';
  editId: string | null = null;

  activeTab: Tab = 'demands';
  activeFilter: 'onhold' | 'valid' | 'canceled' | 'all' | 'category' = 'all';

  showOverlay = false;
  submitted = false;

  apiError: string | null = null;

  today = new Date().toISOString().slice(0, 10);

  file: File | null = null;
  fileName: string | null = null;

  LeavePart = LeavePart; // pour HTML

  myLeaves: LeaveRow[] = [];

  leaveForm!: FormGroup;

  availableLeaves = 24;
  lastUpdated: Date = new Date();

  constructor(
    private fb: FormBuilder,
    private leavesService: LeavesService,
    public authService: AuthService,
  ) { }
  setFilter(f: any) {
    this.activeFilter = f;
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


    if (type === 'sickness' && !this.file) {
      this.leaveForm.setErrors({ ...(this.leaveForm.errors || {}), attachmentRequired: true });
    } else {
      const errs = { ...(this.leaveForm.errors || {}) };
      delete errs['attachmentRequired'];
      this.leaveForm.setErrors(Object.keys(errs).length ? errs : null);
    }
  }
  selectTab(tab: Tab) {
    this.activeTab = tab;

    if (tab === 'team-demand') {
      this.loadTeamLeaves();
    }
  }

  openOverlay() {
    this.mode = 'create';
    this.currentLeaveId = null;

    this.showOverlay = true;
    this.apiError = null;
    this.submitted = false;
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
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); }
  onDragLeave(ev: DragEvent) { ev.preventDefault(); }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const f = ev.dataTransfer?.files?.[0];
    if (!f) return;
    this.file = f;
    this.fileName = f.name;
  }
  existingAttachmentUrl: string | null = null;
  existingAttachmentName: string | null = null;
  mode: 'create' | 'edit' = 'create';
  currentLeaveId: string | null = null;
  onApply() {
    this.submitted = true;
    this.apiError = null;

    this.leaveForm.markAllAsTouched();
    if (this.leaveForm.invalid) return;
    this.applyLeaveTypeRules();
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
      next: (rows) => (this.myLeaves = rows || []),
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
    return this.myLeaves?.length ?? 0;
  }



  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pagedLeaves(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.myLeaves ?? []).slice(start, start + this.pageSize);
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
    this.fileName = this.existingAttachmentUrl ? (this.existingAttachmentUrl.split('/').pop() || '') : '';

    this.existingAttachmentUrl = r.attachmentUrl ?? null;
    this.existingAttachmentName = this.existingAttachmentUrl
      ? this.existingAttachmentUrl.split('/').pop() ?? 'attachment'
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

  loadTeamLeaves() {
    this.leavesService.getTeamLeaves().subscribe({
      next: (rows) => (this.teamLeaves = rows || []),
      error: (err) => this.handleApiError(err),
    });
  }
  LeaveStatus = LeaveStatus;
  updatingStatus = false;
  updateSelectedStatus(status: LeaveStatus) {
    if (!this.selectedLeave) return;

    this.updatingStatus = true;

    this.leavesService.updateLeaveStatus(this.selectedLeave.id, status).subscribe({
      next: (res) => {
        const updated = res.leave;

        this.selectedLeave = { ...this.selectedLeave!, status: updated.status };

        this.teamLeaves = (this.teamLeaves ?? []).map(l =>
          l.id === updated.id ? { ...l, status: updated.status } : l
        );

        this.myLeaves = (this.myLeaves ?? []).map(l =>
          l.id === updated.id ? { ...l, status: updated.status } : l
        );

        this.loadTeamLeaves();
        this.loadMyLeaves();

        this.updatingStatus = false;
        this.closeDetails();
      },
      error: (err) => {
        this.updatingStatus = false;
        this.handleApiError(err);
      },
    });
  }

  pageSizeTeam = 10;
currentPageTeam = 1;

get totalTeamRecords(): number {
  return this.teamLeaves?.length ?? 0;
}

get totalTeamPages(): number {
  return Math.max(1, Math.ceil(this.totalTeamRecords / this.pageSizeTeam));
}

get teamStartIndex(): number {
  if (this.totalTeamRecords === 0) return 0;
  return (this.currentPageTeam - 1) * this.pageSizeTeam + 1;
}

get teamEndIndex(): number {
  if (this.totalTeamRecords === 0) return 0;
  return Math.min(this.currentPageTeam * this.pageSizeTeam, this.totalTeamRecords);
}

get teamPages(): number[] {
  return Array.from({ length: this.totalTeamPages }, (_, i) => i + 1);
}

get pagedTeamLeaves(): LeaveRow[] {
  const start = (this.currentPageTeam - 1) * this.pageSizeTeam;
  return (this.teamLeaves ?? []).slice(start, start + this.pageSizeTeam);
}

teamGoToPage(p: number) {
  if (p < 1 || p > this.totalTeamPages) return;
  this.currentPageTeam = p;
}

teamPrevPage() {
  if (this.currentPageTeam > 1) this.currentPageTeam--;
}

teamNextPage() {
  if (this.currentPageTeam < this.totalTeamPages) this.currentPageTeam++;
}
}

