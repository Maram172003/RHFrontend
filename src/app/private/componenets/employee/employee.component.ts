import { Component, OnInit } from '@angular/core';
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

  selectedRole: 'employee' | 'supervisor' | 'admin' = 'employee';

  draftId: string | null = null;
  draftEmail: string | null = null;
  draftAccessCode: string | null = null;
  proForm!: FormGroup;

  constructor(private fb: FormBuilder, private employeesService: EmployeesService, private lookups: LookupsService,) { }

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
      this.proForm.get('trialEnd')?.updateValueAndValidity();
      this.proForm.updateValueAndValidity();
    });

    this.proForm.get('trialEnd')?.valueChanges.subscribe(() => {
      this.proForm.get('contractStart')?.updateValueAndValidity();
      this.proForm.updateValueAndValidity();
    });

  }
  onPrimaryAction() {
    const emailCtrl = this.proForm.get('email');
    emailCtrl?.markAsTouched();

    if (!emailCtrl || emailCtrl.invalid) {
      this.submitted = true;
      return;
    }

    const email = String(emailCtrl.value).trim().toLowerCase();

    // ✅ 1) même email + draft existe => ne recrée rien, juste ré-affiche
    if (this.draftId && this.draftEmail === email) {
      this.proForm.patchValue({
        id: this.draftId,
        accessCode: this.draftAccessCode ?? this.proForm.get('accessCode')?.value
      });
      this.previewStep = 2;
      return;
    }

    const oldDraftId = this.draftId;

    const callCreateDraft = () => {
      this.employeesService.createDraft({
        email,
        previousDraftId: oldDraftId ?? undefined,
      }).subscribe({
        next: (res) => {
          const empId = res?.employee?.id ?? null;
          const plainCode = res?.plainAccessCode ?? null;

          this.draftId = empId;
          this.draftEmail = email;

          // ✅ IMPORTANT: ne pas écraser le code par null
          if (plainCode) this.draftAccessCode = plainCode;

          this.createdId = empId;
          this.plainAccessCode = plainCode;

          this.proForm.patchValue({
            id: empId,
            accessCode: this.draftAccessCode
          });
          if (this.selectedFile) {
            this.persistPhotoForEmployee(empId, this.selectedFile);
          }

          this.previewStep = 2;
        },

        // ✅ ton error handler inchangé
        error: (err) => {
          if (err?.status === 409) {
            emailCtrl.setErrors({ ...(emailCtrl.errors ?? {}), emailTaken: true });
            return;
          }
          this.handleApiError(err);
        },
      });
    };

    // ✅ 2) si email changé et on avait un draft => supprimer l’ancien pour éviter 2 emails en DB
    if (oldDraftId) {
      this.employeesService.deleteDraft(oldDraftId).subscribe({
        next: () => {
          this.draftId = null;
          this.draftEmail = null;
          this.draftAccessCode = null;
          this.proForm.patchValue({ id: '', accessCode: '' });
          callCreateDraft();
        },
        error: () => {
          // même si delete échoue, on continue
          callCreateDraft();
        }
      });
    } else {
      callCreateDraft();
    }



  }





  createdId: string | null = null;
  plainAccessCode: string | null = null;
  employees: any[] = [];
  loadEmployees(): void {
    this.employeesService.list().subscribe({
      next: (rows) => {
        this.employees = rows ?? [];
        this.goToPage(this.currentPage); // garde currentPage dans les limites
      },
      error: (err) => console.error('load employees error', err),
    });
  }

  submitted = false;
  ///////////////////////////
  isInvalidRequired(name: string): boolean { const c = this.proForm.get(name); return !!c && c.hasError('required') && (c.touched || this.submitted); }
  apiError: string | null = null;
  private handleApiError(err: any) {
    const msg = err?.error?.message;

    if (Array.isArray(msg)) this.apiError = msg.join(' • ');
    else if (typeof msg === 'string') this.apiError = msg;
    else this.apiError = 'Unexpected error, please try again';

    console.error('API error:', err);
  }

  isInvalid(name: string): boolean {
    const c = this.proForm.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  getErrorMessage(name: string): string {
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

    console.log('SUBMIT CLICKED ');

    const id = this.draftId ?? this.createdId ?? this.proForm.get('id')?.value;
    if (!id) {
      alert('Please click Next on Email step first.');
      return;
    }

    const v = this.proForm.getRawValue();

    // 1) payload details (enlever les "" pour éviter validations backend)
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
    };

    // 2) payload roles
    const roles: Role[] = [
      this.selectedRole === 'admin' ? Role.Admin :
        this.selectedRole === 'supervisor' ? Role.Supervisor :
          Role.Employee
    ];

    this.employeesService.saveDetails(id, detailsPayload).pipe(
      switchMap(() => this.employeesService.updateRoles(id, roles))
    ).subscribe({
      next: () => {
        this.draftId = null;
        this.draftEmail = null;
        this.createdId = null;
        this.plainAccessCode = null;
        console.log('Saved details + roles');
        this.apiError = null;
        this.showAddEmployee = false;

        this.resetAddFlow();
        this.activeTab = 'employees';
        this.loadEmployees();

      },
      error: (err) => this.handleApiError(err),
    });
  }
  private resetAddFlow() {
    this.submitted = false;

    // vider les listes qui conditionnent des selects (sinon l'ancien choix reste visible)
    this.cities = [];
    this.designations = [];

    // reset + valeurs explicites des selects à ''
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
    });

    this.proForm.markAsPristine();
    this.proForm.markAsUntouched();
    this.proForm.updateValueAndValidity();

    this.previewStep = 1;
    this.activeTabs = 'preview';

    // reset upload preview
    this.fileName = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;

    // reset draft/id/code si tu veux un nouveau flow propre
    this.createdId = null;
    this.draftId = null;
    this.draftEmail = null;
    this.plainAccessCode = null;
  }




  selectTab(tab: 'preview' | 'contracts' | 'role') {
    this.activeTabs = tab;
  }

  openAddEmployee(): void {
    this.resetAddFlow();      
    this.activeTab = 'employees';
    this.showAddEmployee = true;
  }
  closeAddEmployee(): void {
    this.resetAddFlow();
    this.showAddEmployee = false;
    this.deleteDraftIfAny();
  }

  private deleteDraftIfAny() {
    const id = this.draftId ?? this.createdId ?? this.proForm.get('id')?.value;
    if (!id) return;

    this.employeesService.deleteDraft(id).subscribe({
      next: () => console.log('Draft deleted', id),
      error: (e) => console.error('Draft delete failed', e),
    });

    this.draftId = null;
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

    // optionnel: supprimer la photo sauvegardée pour ce draft
    const id = this.createdId || this.draftId || this.proForm.get('id')?.value;
    if (id) localStorage.removeItem(this.photoKey(id));
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
  private photoKey(id: string) {
    return `employee_photo_${id}`;
  }

  getEmployeePhoto(id: string): string | null {
    try { return localStorage.getItem(this.photoKey(id)); }
    catch { return null; }
  }

  private setSelectedFile(file: File) {
    this.selectedFile = file;
    this.fileName = file.name;

    // preview immédiat (rapide)
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = URL.createObjectURL(file);
    this.filePreviewUrl = this.previewObjectUrl;

    // si on a déjà un id (draft créé), on sauvegarde pour le tableau
    const id = this.createdId || this.draftId || this.proForm.get('id')?.value;
    if (id) this.persistPhotoForEmployee(id, file);
  }
  private persistPhotoForEmployee(id: string, file: File) {
    // Sauvegarde en base64 dans localStorage
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(this.photoKey(id), String(reader.result));
      } catch (e) {
        console.warn('localStorage full, photo not saved', e);
      }
    };
    reader.readAsDataURL(file);
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

  onCancelAdd(): void {
    if (this.previewStep > 1) {
      this.previewStep--;

      // ✅ si on revient à l'étape email, réafficher accessCode
      if (this.previewStep === 1 && this.draftId) {
        this.proForm.patchValue({
          id: this.draftId,
          accessCode: this.draftAccessCode
        });
      }
    } else {
      this.resetAddFlow();
    }
  }
  goNextFromContracts(): void {
    this.activeTabs = 'role';
  }
  cancelFromContracts(): void {
    this.activeTabs = 'preview';
    this.previewStep = this.previewMaxStep;
  }


  setRole(role: 'employee' | 'supervisor' | 'admin') {
    this.selectedRole = role;
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
    const c = this.proForm.get(name);
    const valueEmpty = !String(c?.value ?? '').trim();      // vide ?
    const showError = !!c && c.hasError('required') && (c.touched || this.submitted);
    return valueEmpty && !showError;
  }

}