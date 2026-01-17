import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { EmployeesService } from '../../services/employees.service';

import { LookupsService } from '../../services/lookups.service';
import { Role } from '../../types/role.enum';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-employee',
  standalone: false,
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.css'],
})
export class EmployeeComponent implements OnInit {
  activeTab: 'employees' | 'demands' | 'credit' | 'team' = 'employees';

  showOverlay = false;
  showAddEmployee = false;

  selectedStart = '';
  selectedEnd = '';
  fileName = '';
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;

  availableLeaves = 12;
  lastUpdated: Date = new Date();


  activeTabs: 'preview' | 'contracts' | 'role' = 'preview';
  previewStep = 1;
  previewMaxStep = 2;

  selectedRole: 'employee' | 'supervisor' | 'admin' | 'hr' = 'employee';

  draftToken: string | null = null;
  draftEmail: string | null = null;
  draftAccessCode: string | null = null;
  proForm!: FormGroup;

  constructor(private fb: FormBuilder, private employeesService: EmployeesService, private lookups: LookupsService, private cdRef: ChangeDetectorRef,) { }

  states: string[] = [];
  cities: string[] = [];
  nationalities: string[] = [];
  maritalStatuses: string[] = [];
  genders: string[] = [];
  contractTypes: string[] = [];
  relationships: string[] = [];
  departments: string[] = [];
  designations: string[] = [];


  ngOnInit(): void {

    this.loadEmployees();
    this.activeTabs = 'preview';
    this.proForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', Validators.required],
      dob: ['', [Validators.required, this.dateNotInFuture()]],
      address: ['', Validators.required],
      maritalStatus: [''],
      gender: [''],
      nationality: [''],
      state: ['', Validators.required],
      city: ['', Validators.required],
      zip: ['', Validators.required],
      bankAccountHolder: ['', Validators.required],
      rib: ['', [Validators.required, Validators.minLength(10)]],
      cnss: ['', Validators.required],
      emergencyFirstName: ['', Validators.required],
      emergencyLastName: ['', Validators.required],
      emergencyNumber: ['', Validators.required],
      relationship: [''],

      // Pro
      id: [''],
      department: ['', Validators.required],
      designation: ['', Validators.required],
      accessCode: [''],

      // Contracts
      contractType: ['', Validators.required],
      weeklyWork: ['', [Validators.required, this.durationHHmm()]],
      contractStart: ['', Validators.required],
      trialEnd: ['', Validators.required],
      grossSalary: ['', Validators.required],
      grossHourlyRate: ['', Validators.required],
      lineManagerId: [''],

    }, { validators: [this.trialEndBeforeStartValidator('contractStart', 'trialEnd')] });
    this.lookups.getStates().subscribe({
      next: v => this.states = v ?? [],
      error: e => { console.error('states', e); this.states = []; }
    });

    this.lookups.getNationalities().subscribe({
      next: v => this.nationalities = v ?? [],
      error: e => { console.error('nationalities', e); this.nationalities = []; }
    });
    this.lookups.getMarital().subscribe(v => this.maritalStatuses = v);
    this.lookups.getGenders().subscribe(v => this.genders = v);
    this.lookups.getContractTypes().subscribe(v => this.contractTypes = v);
    this.lookups.getRelationships().subscribe(v => this.relationships = v);
    this.lookups.getDepartments().subscribe(v => this.departments = v ?? []);
    const dep = this.proForm.get('department')?.value as string;
    if (dep) {
      this.lookups.getDesignations(dep).subscribe(v => this.designations = v ?? []);
    }

    this.proForm.get('department')?.valueChanges.subscribe((department: string) => {
      if (!department) { this.designations = []; this.proForm.get('designation')?.setValue(''); return; }
      this.lookups.getDesignations(department).subscribe(v => {
        this.designations = v ?? [];
        this.proForm.get('designation')?.setValue('');
      });
    });

    const st = this.proForm.get('state')?.value as string;
    if (st) {
      this.lookups.getCities(st).subscribe({
        next: v => this.cities = v ?? [],
        error: e => { console.error('cities', e); this.cities = []; }
      });
    }


    this.proForm.get('state')?.valueChanges.subscribe((state: string) => {
      if (!state) { this.cities = []; this.proForm.get('city')?.setValue(''); return; }
      this.lookups.getCities(state).subscribe({
        next: v => { this.cities = v ?? []; this.proForm.get('city')?.setValue(''); },
        error: e => { console.error('cities', e); this.cities = []; }
      });
    });

    this.proForm.get('contractStart')?.valueChanges.subscribe(() => {
      this.proForm.get('trialEnd')?.updateValueAndValidity({ emitEvent: false });
      this.proForm.updateValueAndValidity({ emitEvent: false });
    });

    this.proForm.get('trialEnd')?.valueChanges.subscribe(() => {
      this.proForm.get('contractStart')?.updateValueAndValidity({ emitEvent: false });
      this.proForm.updateValueAndValidity({ emitEvent: false });
    });

    this.proForm.get('email')?.valueChanges.subscribe(() => {
      const c = this.proForm.get('email');
      if (!c?.errors) return;

      if (c.errors['emailTaken']) {
        const { emailTaken, ...rest } = c.errors;
        c.setErrors(Object.keys(rest).length ? rest : null);
      }

      this.apiError = null;
    });

    this.refreshFilteredManagers();
    this.updateLineManagerValidator();


  }
  onPrimaryAction() {
    if (this.mode === 'view') return;

    this.apiError = null;


    this.submitted = true;

    const emailCtrl = this.proForm.get('email');
    emailCtrl?.markAsTouched();
    emailCtrl?.updateValueAndValidity();


    if (!emailCtrl || emailCtrl.invalid) return;

    const email = String(emailCtrl.value || '').trim().toLowerCase();


    if (this.draftToken && this.draftEmail === email) {
      this.proForm.patchValue({ id: this.draftToken, accessCode: this.draftAccessCode });
      this.previewStep = 2;
      return;
    }

    this.employeesService.createDraft({ email }).subscribe({
      next: (res) => {
        this.draftToken = res.draftToken;
        this.draftEmail = email;
        this.draftAccessCode = res.plainAccessCode;

        this.proForm.patchValue({ id: this.draftToken, accessCode: this.draftAccessCode });

        this.previewStep = 2;


        this.submitted = false;
      },
      error: (err) => this.handleApiError(err),
    });
  }






  createdId: string | null = null;
  plainAccessCode: string | null = null;
  employees: any[] = [];
  loadEmployees(): void {
    this.employeesService.list().subscribe({
      next: (rows) => {
        this.employees = rows ?? [];
        this.refreshManagersAll();
        this.refreshFilteredManagers();
        this.goToPage(this.currentPage);
      },
      error: (err) => console.error('load employees error', err),
    });
  }

  submitted = false;
  ///////////////////////////
  isInvalidRequired(name: string): boolean { if (this.mode === 'view') return false; const c = this.proForm.get(name); return !!c && c.hasError('required') && (c.touched || this.submitted); }
  apiError: string | null = null;
  private handleApiError(err: any) {
    console.log('STATUS', err?.status);
    console.log('ERROR BODY', err?.error);
    console.log('ERROR MESSAGE', err?.error?.message);
    const emailCtrl = this.proForm?.get('email');

    const status = err?.status;
    const msg = err?.error?.message ?? err?.error?.error ?? err?.message;

    const msgStr =
      Array.isArray(msg) ? msg.join(' ') :
        typeof msg === 'string' ? msg : '';

    if (emailCtrl && (status === 409 || /already|exists|used|duplicate|taken/i.test(msgStr))) {
      emailCtrl.setErrors({ ...(emailCtrl.errors || {}), emailTaken: true });

      emailCtrl.markAsTouched();
      emailCtrl.markAsDirty();
      emailCtrl.updateValueAndValidity({ emitEvent: false });
      this.submitted = true;


      console.log('EXISTS DUPLICATE => setting emailTaken error');
      return;
    }

    if (Array.isArray(msg)) this.apiError = msg.join(' • ');
    else if (typeof msg === 'string') this.apiError = msg;
    else this.apiError = 'Unexpected error, please try again';
  }

  isInvalid(name: string): boolean {
    const c = this.proForm.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  getErrorMessage(name: string): string {
    if (this.mode === 'view') return '';
    const c = this.proForm.get(name);
    if (!c || !c.errors) return '';

    if (c.errors['required']) return 'This field is required';
    if (c.errors['email']) return 'Please enter a valid email address';
    if (c.errors['emailTaken']) return 'This email is already used';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters`;
    if (c.errors['futureDate']) return 'Date of birth cannot be in the future';
    if (c.errors['invalidDuration']) return 'Format must be HH:mm (e.g. 40:00)';

    return 'Invalid value';
  }

  // === erreurs "cross-field" (form-level) ===
  hasTrialAfterStartError(): boolean {
    return !!this.proForm.errors?.['trialAfterStart'] && (this.submitted || this.proForm.touched);
  }



  onSubmitAll() {
    this.submitted = true;
    this.proForm.markAllAsTouched();
    if (this.proForm.invalid) return;

    if (!this.draftToken) {
      alert('Please click Next on Email step first.');
      return;
    }

    const v = this.proForm.getRawValue();
    const detailsPayload: any = {
      firstName: v.firstName?.trim(),
      lastName: v.lastName?.trim(),
      email: v.email?.trim(),
      mobile: v.mobile?.trim(),
      dob: v.dob || undefined,
      address: v.address?.trim(),
      state: v.state || undefined,
      city: v.city || undefined,
      zip: v.zip?.trim(),

      maritalStatus: v.maritalStatus || undefined,
      gender: v.gender || undefined,
      nationality: v.nationality || undefined,

      bankAccountHolder: v.bankAccountHolder?.trim(),
      rib: v.rib?.trim(),
      cnss: v.cnss?.trim(),

      emergencyFirstName: v.emergencyFirstName?.trim() || undefined,
      emergencyLastName: v.emergencyLastName?.trim() || undefined,
      emergencyNumber: v.emergencyNumber?.trim() || undefined,
      relationship: v.relationship || undefined,

      department: v.department || undefined,
      designation: v.designation || undefined,

      contractType: v.contractType || undefined,
      weeklyWork: v.weeklyWork || undefined,
      contractStart: v.contractStart || undefined,
      trialEnd: v.trialEnd || undefined,
      grossSalary: v.grossSalary || undefined,
      grossHourlyRate: v.grossHourlyRate || undefined,
      lineManagerId: v.lineManagerId || undefined,
    };


    const roles: Role[] = [
      this.selectedRole === 'admin' ? Role.Admin :
        this.selectedRole === 'supervisor' ? Role.Supervisor :
          this.selectedRole === 'hr' ? Role.Hr :
            Role.Employee
    ];
    console.log('SUBMIT draftToken=', this.draftToken);

    const fd = new FormData();
    fd.append('draftToken', this.draftToken);
    fd.append('details', JSON.stringify(detailsPayload));
    fd.append('roles', JSON.stringify(roles));

    if (this.selectedFile) {
      fd.append('photo', this.selectedFile); // ✅ le nom doit être "photo"
    }

    this.employeesService.submitDraft(fd).subscribe({
      next: (res: any) => {




        this.draftToken = null;
        this.draftEmail = null;
        this.draftAccessCode = null;
        this.showAddEmployee = false;
        this.resetAddFlow();
        this.loadEmployees();

      },
      error: (err) => this.handleApiError(err),
    });
  }



  private resetAddFlow() {
    this.submitted = false;


    this.cities = [];
    this.designations = [];


    this.proForm.reset({
      email: '',
      firstName: '',
      lastName: '',
      mobile: '',
      dob: '',
      address: '',
      maritalStatus: '',
      gender: '',
      nationality: '',
      state: '',
      city: '',
      zip: '',
      bankAccountHolder: '',
      rib: '',
      cnss: '',
      emergencyFirstName: '',
      emergencyLastName: '',
      emergencyNumber: '',
      relationship: '',
      id: '',
      department: '',
      designation: '',
      accessCode: '',
      contractType: '',
      weeklyWork: '',
      contractStart: '',
      trialEnd: '',
      grossSalary: '',
      grossHourlyRate: '',
      lineManagerId: '',
    });

    this.proForm.markAsPristine();
    this.proForm.markAsUntouched();
    this.proForm.updateValueAndValidity();


    this.mode = 'create';
    this.selectedEmployeeId = null;
    this.proForm.enable({ emitEvent: false });

    this.previewStep = 1;
    this.activeTabs = 'preview';


    this.fileName = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;


    this.createdId = null;
    this.draftToken = null;
    this.draftEmail = null;
    this.draftAccessCode = null;
    this.showAddEmployee = false;
  }




  selectTab(tab: 'preview' | 'contracts' | 'role') {
    this.activeTabs = tab;
    this.cdRef.detectChanges();
  }

  openAddEmployee(): void {

    this.mode = 'create';
    this.selectedEmployeeId = null;

    this.resetAddFlow();
    this.proForm.enable({ emitEvent: false });

    this.activeTabs = 'preview';
    this.previewStep = 1;

    this.viewPhotoUrl = null;
    this.showAddEmployee = true;
    this.activeTab = 'employees';
  }
  closeAddEmployee(): void {
    this.mode = 'create';
    this.selectedEmployeeId = null;
    this.proForm.enable({ emitEvent: false });
    this.resetAddFlow();
    this.showAddEmployee = false;
    this.deleteDraftIfAny();
    this.activeTab = 'employees';
  }

  private deleteDraftIfAny() {
    const id = this.draftToken ?? this.createdId ?? this.proForm.get('id')?.value;
    if (!id) return;

    this.employeesService.deleteDraft(id).subscribe({
      next: () => console.log('Draft deleted', id),
      error: (e) => console.error('Draft delete failed', e),
    });

    this.draftToken = null;
    this.draftEmail = null;
    this.createdId = null;
    this.plainAccessCode = null;
  }


  openOverlay(): void { this.showOverlay = true; }
  closeOverlay(): void {
    this.showOverlay = false;
    this.selectedStart = '';
    this.selectedEnd = '';
    this.fileName = '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.setSelectedFile(file);

  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('is-dragover');
  }
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('is-dragover');
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('is-dragover');

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    this.setSelectedFile(file);
  }
  clearFile(event: Event): void {
    event.stopPropagation();
    this.fileName = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;

    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }


  }
  openDate(input: HTMLInputElement) {
    if ((input as any).showPicker) {
      (input as any).showPicker();
    } else {
      input.focus();
      input.click();
    }
  }
  private previewObjectUrl: string | null = null;


  private setSelectedFile(file: File) {
    this.selectedFile = file;
    this.fileName = file.name;

    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = URL.createObjectURL(file);

    this.filePreviewUrl = this.previewObjectUrl;
  }





  nextPreview() {
    if (this.previewStep < this.previewMaxStep) {
      this.previewStep++;
    }
  }
  prevPreview() {
    if (this.previewStep > 1) {
      this.previewStep--;
    }
  }
  goNextFromPreview() {
    this.activeTabs = 'contracts';
  }

  onCancelAdd() {
    if (this.draftToken) {
      this.employeesService.deleteDraft(this.draftToken).subscribe();
    }
    this.resetAddFlow();
    this.showAddEmployee = false;
    this.activeTab = 'employees';
  }
  goNextFromContracts(): void {
    this.activeTabs = 'role';
  }
  cancelFromContracts(): void {
    this.activeTabs = 'preview';
    this.previewStep = this.previewMaxStep;
  }


  setRole(role: 'employee' | 'supervisor' | 'admin' | 'hr') {
    this.selectedRole = role;

    const lm = this.proForm.get('lineManagerId');

    if (role === 'admin') {

      lm?.setValue('');
      lm?.clearValidators();
      lm?.setErrors(null);
      lm?.updateValueAndValidity({ emitEvent: false });
    } else {

      lm?.setValidators([Validators.required]);
      lm?.updateValueAndValidity({ emitEvent: false });
    }


    this.refreshFilteredManagers();

    this.cdRef.detectChanges();
  }
  cancelFromRole(): void {
    this.activeTabs = 'contracts';
  }

  pageSize = 5;
  currentPage = 1;
  get totalRecords(): number {
    return this.employees?.length ?? 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pagedEmployees(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.employees ?? []).slice(start, start + this.pageSize);
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
  today = new Date().toISOString().slice(0, 10);
  dateNotInFuture(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (!v) return null;
      const d = new Date(v);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return d > now ? { futureDate: true } : null;
    };
  }
  durationHHmm(): any {
    return (control: any) => {
      const v = control.value;
      if (!v) return null;
      return /^([0-9]{1,3}):[0-5][0-9]$/.test(v) ? null : { invalidDuration: true };
    };
  }

  trialEndBeforeStartValidator(startKey: string, trialKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const start = group.get(startKey)?.value;
      const trial = group.get(trialKey)?.value;
      if (!start || !trial) return null;

      const s = new Date(start); s.setHours(0, 0, 0, 0);
      const t = new Date(trial); t.setHours(0, 0, 0, 0);


      return t > s ? { trialAfterStart: true } : null;
    };
  }
  showStar(name: string): boolean {
    if (this.mode === 'view') return false;
    const c = this.proForm.get(name);
    const valueEmpty = !String(c?.value ?? '').trim();      // vide ?
    const showError = !!c && c.hasError('required') && (c.touched || this.submitted);
    return valueEmpty && !showError;
  }

  mode: 'create' | 'view' | 'edit' = 'create';
  viewPhotoUrl: string | null = null;
  selectedEmployeeId: string | null = null;
  private toDateInputValue(v: any): string {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private applyRoleFromBackend(emp: any) {
    const rawList = Array.isArray(emp?.roles) ? emp.roles : [];
    const rawSingle = emp?.role ? [emp.role] : [];

    const all = [...rawList, ...rawSingle]
      .map((r: any) => String(r?.name ?? r).trim().toLowerCase())
      .filter(Boolean);

    if (all.includes('admin')) this.selectedRole = 'admin';
    else if (all.includes('supervisor')) this.selectedRole = 'supervisor';
    else if (all.includes('hr')) this.selectedRole = 'hr';
    else this.selectedRole = 'employee';

  }
  selectedEmployee: any = null;
  onSeen(e: any) {
    this.selectedEmployee = e;
    const id = e?.id;
    if (!id) return;
    this.selectedEmployee = e;

    this.mode = 'view';
    this.selectedEmployeeId = id;

    this.showAddEmployee = true;
    this.activeTab = 'employees';

    this.activeTabs = 'preview';
    this.previewStep = 1;




    this.employeesService.getById(id).subscribe({
      next: (emp) => {

        const toYmd = (v: any) => {
          if (!v) return '';
          if (typeof v === 'string') return v.slice(0, 10);
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          return String(v).slice(0, 10);
        };

        const dob = toYmd(emp?.dob);
        const contractStart = toYmd(emp?.contractStart);
        const trialEnd = toYmd(emp?.trialEnd);

        const state = emp?.state ?? '';
        const department = emp?.department ?? '';


        this.proForm.enable({ emitEvent: false });

        this.applyRoleFromBackend(emp);
        this.refreshManagersAll();
        this.refreshFilteredManagers();
        this.updateLineManagerValidator();
        this.proForm.patchValue({
          email: emp?.email ?? '',
          firstName: emp?.firstName ?? '',
          lastName: emp?.lastName ?? '',
          mobile: emp?.mobile ?? '',
          dob,
          address: emp?.address ?? '',
          maritalStatus: emp?.maritalStatus ?? '',
          gender: emp?.gender ?? '',
          nationality: emp?.nationality ?? '',
          state,
          city: emp?.city ?? '',
          zip: emp?.zip ?? '',

          bankAccountHolder: emp?.bankAccountHolder ?? '',
          rib: emp?.rib ?? '',
          cnss: emp?.cnss ?? '',
          emergencyFirstName: emp?.emergencyFirstName ?? '',
          emergencyLastName: emp?.emergencyLastName ?? '',
          emergencyNumber: emp?.emergencyNumber ?? '',
          relationship: emp?.relationship ?? '',

          id: emp?.id ?? '',
          department,
          designation: emp?.designation ?? '',

          contractType: emp?.contractType ?? '',
          weeklyWork: emp?.weeklyWork ?? '',
          contractStart,
          trialEnd,
          grossSalary: emp?.grossSalary ?? '',
          grossHourlyRate: emp?.grossHourlyRate ?? '',

          lineManagerId: emp?.lineManagerId ?? '',
          accessCode: '',
        }, { emitEvent: false });


        if (state) {
          this.lookups.getCities(state).subscribe({
            next: (v) => {
              this.cities = v ?? [];
              this.proForm.get('city')?.setValue(emp?.city ?? '', { emitEvent: false });
            },
            error: () => { this.cities = []; }
          });
        } else {
          this.cities = [];
        }

        // Designations
        if (department) {
          this.lookups.getDesignations(department).subscribe({
            next: (v) => {
              this.designations = v ?? [];
              this.proForm.get('designation')?.setValue(emp?.designation ?? '', { emitEvent: false });
            },
            error: () => { this.designations = []; }
          });
        } else {
          this.designations = [];
        }


        if (emp?.photoUrl) {
          this.viewPhotoUrl = this.toPhotoSrc(emp.photoUrl); 
        } else {
          this.viewPhotoUrl = null;
        }


        this.proForm.disable({ emitEvent: false });
      },

      error: (err) => this.handleApiError(err),
    });
  }


  onDeleteEmployee(id: string) {
    if (!id) return;

    const ok = confirm('Are you sure you want to delete this employee?');
    if (!ok) return;

    this.employeesService.deleteEmployee(id).subscribe({
      next: () => {


        this.loadEmployees();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  shouldShowLineManager(): boolean {
    if (this.mode === 'view') return true;
    return this.selectedRole !== 'admin';
  }

  managersAll: any[] = [];
  filteredManagers: any[] = [];


  private normalizeRoleList(emp: any): string[] {
    const rawList = Array.isArray(emp?.roles) ? emp.roles : [];
    const rawSingle = emp?.role ? [emp.role] : [];

    return [...rawList, ...rawSingle]
      .map((r: any) => String(r?.name ?? r).trim().toLowerCase())
      .filter(Boolean);
  }

  private allowedManagerRoles(): string[] {

    if (this.selectedRole === 'employee') return ['admin', 'supervisor', 'hr'];
    if (this.selectedRole === 'hr') return ['admin', 'supervisor'];
    if (this.selectedRole === 'supervisor') return ['admin', 'hr'];
    return [];
  }

  private refreshManagersAll() {

    this.managersAll = (this.employees ?? []).filter(e => {
      const roles = this.normalizeRoleList(e);
      return roles.some(r => ['admin', 'supervisor', 'hr'].includes(r));
    });
  }

  private refreshFilteredManagers() {
    const allowed = this.allowedManagerRoles();
    this.filteredManagers = (this.managersAll ?? []).filter(m => {
      const roles = this.normalizeRoleList(m);
      return roles.some(r => allowed.includes(r));
    });
  }

  private updateLineManagerValidator() {
    const ctrl = this.proForm.get('lineManagerId');
    if (!ctrl) return;

    if (this.shouldShowLineManager()) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue('');
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }
  onEdit(e: any) {
    const id = e?.id;
    if (!id) return;

    this.mode = 'edit';
    this.selectedEmployeeId = id;

    this.showAddEmployee = true;
    this.activeTab = 'employees';
    this.activeTabs = 'preview';


    this.previewStep = 1;




    this.employeesService.getById(id).subscribe({
      next: (emp) => {
        const toYmd = (v: any) => (v ? String(v).slice(0, 10) : '');


        this.proForm.enable({ emitEvent: false });


        this.applyRoleFromBackend(emp);
        this.originalEmailEdit = String(e?.email || '').trim().toLowerCase();
        this.proForm.patchValue({
          id: emp?.id ?? '',
          email: emp?.email ?? '',
          firstName: emp?.firstName ?? '',
          lastName: emp?.lastName ?? '',
          mobile: emp?.mobile ?? '',
          dob: toYmd(emp?.dob),
          address: emp?.address ?? '',
          maritalStatus: emp?.maritalStatus ?? '',
          gender: emp?.gender ?? '',
          nationality: emp?.nationality ?? '',
          state: emp?.state ?? '',
          city: emp?.city ?? '',
          zip: emp?.zip ?? '',
          bankAccountHolder: emp?.bankAccountHolder ?? '',
          rib: emp?.rib ?? '',
          cnss: emp?.cnss ?? '',
          emergencyFirstName: emp?.emergencyFirstName ?? '',
          emergencyLastName: emp?.emergencyLastName ?? '',
          emergencyNumber: emp?.emergencyNumber ?? '',
          relationship: emp?.relationship ?? '',
          department: emp?.department ?? '',
          designation: emp?.designation ?? '',
          contractType: emp?.contractType ?? '',
          weeklyWork: emp?.weeklyWork ?? '',
          contractStart: toYmd(emp?.contractStart),
          trialEnd: toYmd(emp?.trialEnd),
          grossSalary: emp?.grossSalary ?? '',
          grossHourlyRate: emp?.grossHourlyRate ?? '',
          lineManagerId: emp?.lineManagerId ?? '',

        }, { emitEvent: false });


        const state = emp?.state ?? '';
        if (state) {
          this.lookups.getCities(state).subscribe(v => {
            this.cities = v ?? [];
            this.proForm.get('city')?.setValue(emp?.city ?? '', { emitEvent: false });
          });
        }

        const dep = emp?.department ?? '';
        if (dep) {
          this.lookups.getDesignations(dep).subscribe(v => {
            this.designations = v ?? [];
            this.proForm.get('designation')?.setValue(emp?.designation ?? '', { emitEvent: false });
          });
        }

        // managers list (si tu filtres)
        this.refreshManagersAll?.();
        this.refreshFilteredManagers?.();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  onUpdateEmployee() {
    this.apiError = null;
    this.submitted = true;
    this.proForm.markAllAsTouched();
    if (this.proForm.invalid) return;

    const id = this.selectedEmployeeId || this.proForm.get('id')?.value;
    if (!id) return;

    const v = this.proForm.getRawValue();

    const detailsPayload: any = {
      email: v.email?.trim(),
      firstName: v.firstName?.trim(),
      lastName: v.lastName?.trim(),
      mobile: v.mobile?.trim(),
      dob: v.dob || undefined,
      address: v.address?.trim(),
      state: v.state || undefined,
      city: v.city || undefined,
      zip: v.zip?.trim(),
      maritalStatus: v.maritalStatus || undefined,
      gender: v.gender || undefined,
      nationality: v.nationality || undefined,
      bankAccountHolder: v.bankAccountHolder?.trim(),
      rib: v.rib?.trim(),
      cnss: v.cnss?.trim(),
      emergencyFirstName: v.emergencyFirstName?.trim() || undefined,
      emergencyLastName: v.emergencyLastName?.trim() || undefined,
      emergencyNumber: v.emergencyNumber?.trim() || undefined,
      relationship: v.relationship || undefined,
      department: v.department || undefined,
      designation: v.designation || undefined,
      contractType: v.contractType || undefined,
      weeklyWork: v.weeklyWork || undefined,
      contractStart: v.contractStart || undefined,
      trialEnd: v.trialEnd || undefined,
      grossSalary: v.grossSalary || undefined,
      grossHourlyRate: v.grossHourlyRate || undefined,
      lineManagerId: v.lineManagerId || undefined,
    };

    const roles: Role[] = [
      this.selectedRole === 'admin' ? Role.Admin :
        this.selectedRole === 'supervisor' ? Role.Supervisor :
          this.selectedRole === 'hr' ? Role.Hr :
            Role.Employee
    ];
    this.employeesService.saveDetails(id, detailsPayload).pipe(
      switchMap(() => this.employeesService.updateRoles(id, roles))
    ).subscribe({
      next: () => {
        this.showAddEmployee = false;
        this.resetAddFlow();
        this.loadEmployees();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  onNextEmailStep() {
    // view => simple navigation
    if (this.mode === 'view') {
      this.nextPreview();
      return;
    }

    // create => ton flow draft actuel
    if (this.mode === 'create') {
      this.onPrimaryAction();
      return;
    }

    // edit => check email (si changé)
    this.checkEmailBeforeNextEdit();
  }
  originalEmailEdit: string | null = null;

  private checkEmailBeforeNextEdit() {
    this.apiError = null;
    this.submitted = true;

    const emailCtrl = this.proForm.get('email');
    emailCtrl?.markAsTouched();
    emailCtrl?.updateValueAndValidity();

    if (!emailCtrl || emailCtrl.invalid) return;

    const email = String(emailCtrl.value || '').trim().toLowerCase();
    const currentId = this.selectedEmployeeId || this.proForm.get('id')?.value;

    // ✅ si l’email n’a pas changé => laisser passer
    if (this.originalEmailEdit && email === this.originalEmailEdit) {
      this.nextPreview();
      return;
    }

    const exists = (this.employees || []).some(emp =>
      String(emp?.email || '').trim().toLowerCase() === email &&
      String(emp?.id || '') !== String(currentId || '')
    );

    if (exists) {
      emailCtrl.setErrors({ ...(emailCtrl.errors || {}), emailTaken: true });
      emailCtrl.markAsTouched();
      this.submitted = true;
      return;
    }


    this.nextPreview();
  }

  toPhotoSrc(photoUrl?: string | null): string | null {
    if (!photoUrl) return null;

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;

    if (photoUrl.startsWith('/uploads')) {
      return `http://localhost:4000${photoUrl}`;
    }

    return photoUrl;
  }
}