import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { EmployeesService } from '../../services/employees.service';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { LookupsService } from '../../services/lookups.service';
import { ResetAccessCodeDto } from '../../../auth/types/reset-access-code-dto';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  activeTab: 'profile' | 'security' = 'profile';
  mode: 'view' | 'edit' = 'view';

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  apiError: string | null = null;
  apiSuccess: string | null = null;

  // lookups (comme employee.component.ts)
  states: string[] = [];
  cities: string[] = [];
  nationalities: string[] = [];
  maritalStatuses: string[] = [];
  genders: string[] = [];

  today = new Date().toISOString().slice(0, 10);

  // photo upload (comme employee)
  fileName = '';
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  private previewObjectUrl: string | null = null;
  viewPhotoUrl: string | null = null;
  photoRemoved = false;

  myId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private employeesService: EmployeesService,
    private lookups: LookupsService,
    public authService: AuthService,
    private cdRef: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.myId = this.authService.getUserId();
    if (!this.myId) {
      this.apiError = 'User not connected';
      return;
    }

    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dob: [''],
      maritalStatus: [''],
      gender: [''],
      nationality: [''],
      address: [''],
      state: [''],
      city: [''],
      zip: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentAccessCode: ['', Validators.required],
        newAccessCode: ['', [Validators.required, Validators.minLength(4)]],
        confirmAccessCode: ['', Validators.required],
      },
      { validators: [this.codeMatchValidator('newAccessCode', 'confirmAccessCode')] }
    );

    // load lookups
    this.lookups.getStates().subscribe(v => (this.states = v ?? []));
    this.lookups.getNationalities().subscribe(v => (this.nationalities = v ?? []));
    this.lookups.getMarital().subscribe(v => (this.maritalStatuses = v ?? []));
    this.lookups.getGenders().subscribe(v => (this.genders = v ?? []));

    // cities when state changes
    this.profileForm.get('state')?.valueChanges.subscribe((state: string) => {
      if (!state) {
        this.cities = [];
        this.profileForm.get('city')?.setValue('');
        return;
      }
      this.lookups.getCities(state).subscribe(v => {
        this.cities = v ?? [];
        this.profileForm.get('city')?.setValue('');
      });
    });

    // load my profile
    this.loadMyProfile();
  }

  selectTab(tab: 'profile' | 'security') {
    this.activeTab = tab;
    this.apiError = null;
    this.apiSuccess = null;
    this.cdRef.detectChanges();
  }

  private loadMyProfile() {
    if (!this.myId) return;

    this.employeesService.getById(this.myId).subscribe({
      next: (emp: any) => {
        const toYmd = (v: any) => (v ? String(v).slice(0, 10) : '');

        this.profileForm.patchValue(
          {
            firstName: emp?.firstName ?? '',
            lastName: emp?.lastName ?? '',
            mobile: emp?.mobile ?? '',
            email: emp?.email ?? '',
            dob: toYmd(emp?.dob),
            maritalStatus: emp?.maritalStatus ?? '',
            gender: emp?.gender ?? '',
            nationality: emp?.nationality ?? '',
            address: emp?.address ?? '',
            state: emp?.state ?? '',
            city: emp?.city ?? '',
            zip: emp?.zip ?? '',
          },
          { emitEvent: false }
        );

        const state = emp?.state ?? '';
        if (state) {
          this.lookups.getCities(state).subscribe(v => {
            this.cities = v ?? [];
            this.profileForm.get('city')?.setValue(emp?.city ?? '', { emitEvent: false });
          });
        }

        this.viewPhotoUrl = emp?.photoUrl ? this.toPhotoSrc(emp.photoUrl) : null;

        this.mode = 'view';
        this.profileForm.disable({ emitEvent: false });
      },
      error: (e) => {
        console.error(e);
        this.apiError = 'Failed to load profile';
      },
    });
  }

  onEdit() {
    this.mode = 'edit';
    this.apiError = null;
    this.apiSuccess = null;

    this.photoRemoved = false;
    this.fileName = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;

    this.profileForm.enable({ emitEvent: false });
  }

  onCancelEdit() {
    this.mode = 'view';
    this.apiError = null;
    this.apiSuccess = null;

    this.cleanupPreviewUrl();
    this.photoRemoved = false;
    this.fileName = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;

    this.loadMyProfile();
  }

  onSaveProfile() {
    this.apiError = null;
    this.apiSuccess = null;

    if (!this.myId) return;

    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    const v = this.profileForm.getRawValue();
    const detailsPayload: any = {
      firstName: v.firstName?.trim(),
      lastName: v.lastName?.trim(),
      mobile: v.mobile?.trim(),
      email: v.email?.trim(),
      dob: v.dob || undefined,
      maritalStatus: v.maritalStatus || undefined,
      gender: v.gender || undefined,
      nationality: v.nationality || undefined,
      address: v.address?.trim(),
      state: v.state || undefined,
      city: v.city || undefined,
      zip: v.zip?.trim(),
    };

    const save$ =
      (this.selectedFile || this.photoRemoved)
        ? this.employeesService.updateDetailsPhoto(this.myId, detailsPayload, this.selectedFile, this.photoRemoved)
        : this.employeesService.saveDetails(this.myId, detailsPayload);

    save$.subscribe({
      next: (res: any) => {
        const emp = res?.employee ?? res;
        this.viewPhotoUrl = emp?.photoUrl ? this.toPhotoSrc(emp.photoUrl) : null;

        this.mode = 'view';
        this.profileForm.disable({ emitEvent: false });

        this.cleanupPreviewUrl();
        this.photoRemoved = false;
        this.fileName = '';
        this.selectedFile = null;
        this.filePreviewUrl = null;

        this.apiSuccess = 'Profile updated successfully';
      },
      error: (e) => {
        console.error(e);
        this.apiError = e?.error?.message ?? 'Update failed';
      },
    });
  }

  // ===== Photo handlers (comme employee) =====
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

    // si j'avais déjà une photo -> je veux la supprimer côté backend
    if (this.mode === 'edit' && this.viewPhotoUrl) {
      this.viewPhotoUrl = null;
      this.photoRemoved = true;
    }

    this.cleanupPreviewUrl();
  }

  private setSelectedFile(file: File) {
    this.photoRemoved = false;
    this.selectedFile = file;
    this.fileName = file.name;

    this.cleanupPreviewUrl();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.filePreviewUrl = this.previewObjectUrl;
  }

  private cleanupPreviewUrl() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  // ===== Security (change password) =====
  onChangePassword() {
    this.apiError = null;
    this.apiSuccess = null;

    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    const v = this.passwordForm.getRawValue();
    this.authService.resetAccessCode({
      currentAccessCode: v.currentAccessCode,
      newAccessCode: v.newAccessCode,
    }).subscribe({
      next: (res: any) => {
        // backend renvoie token
        if (res?.token) localStorage.setItem('token', res.token);
        this.passwordForm.reset();
        this.apiSuccess = 'Password updated successfully';
      },
      error: (e) => {
        console.error(e);
        this.apiError = e?.error?.message ?? 'Password update failed';
      }
    });
  }

  codeMatchValidator(a: string, b: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const x = group.get(a)?.value;
      const y = group.get(b)?.value;
      if (!x || !y) return null;
      return x === y ? null : { codeMismatch: true };
    };
  }

  // UI helpers
  isInvalid(name: string): boolean {
    const c = this.profileForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  isInvalidPass(name: string): boolean {
    const c = this.passwordForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  toPhotoSrc(photoUrl?: string | null): string | null {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
    if (photoUrl.startsWith('/uploads')) return `http://localhost:4000${photoUrl}`;
    return photoUrl;
  }

}
