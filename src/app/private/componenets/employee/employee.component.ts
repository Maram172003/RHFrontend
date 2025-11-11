import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeesService } from '../../services/employees.service';

import { LookupsService } from '../../services/lookups.service';
import { Role } from '../../types/role.enum';

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

  availableLeaves = 12;
  lastUpdated: Date = new Date();


  activeTabs: 'preview' | 'contracts' | 'role' = 'preview';
  previewStep = 1;
  previewMaxStep = 2;

  selectedRole: 'employee' | 'supervisor' | 'admin' = 'employee';


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
    this.activeTabs = 'preview';
    this.proForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', Validators.required],
      dob: [''],
      address: ['', Validators.required],
      maritalStatus: [''],
      gender: [''],
      nationality: [''],
      state: [''],
      city: [''],
      zip: ['', Validators.required],
      bankAccountHolder: ['', Validators.required],
      rib: ['', [Validators.required, Validators.minLength(10)]],
      cnss: ['', Validators.required],
      emergencyFirstName: [''],
      emergencyLastName: [''],
      emergencyNumber: ['', Validators.required],
      relationship: [''],

      // Pro
      id: [''],
      department: ['', Validators.required],
      designation: ['', Validators.required],
      accessCode: [''],

      // Contracts
      contractType: ['', Validators.required],
      weeklyWork: ['', Validators.required],
      contractStart: ['', Validators.required],
      trialEnd: ['', Validators.required],
      grossSalary: ['', Validators.required],
      grossHourlyRate: ['', Validators.required],

    });
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



  }
  onPrimaryAction() {

    const email = this.proForm.get('email')?.value?.trim();
    if (!email) return alert('Email requis');

    this.employeesService.create({ email }).subscribe({
      next: (res) => {
        const empId = res?.employee?.id ?? null;
        const plainCode = res?.plainAccessCode ?? null;
        this.proForm.patchValue({ id: empId, accessCode: plainCode });
        this.previewStep = 2;
        console.log('Créé:', { empId, plainCode, res });
      },
      error: (err) => {
        console.error('Erreur création:', err);
        alert(err?.error?.message || 'Erreur lors de la création');
      },
    });


    if (this.activeTabs === 'role') {
      this.onSubmitAll();
    }
  }



  createdId: string | null = null;
  plainAccessCode: string | null = null;
  onSubmitAll() {
    const id = (this.createdId ?? this.proForm.get('id')?.value) as string | null;
    if (!id) return;


    const v = this.proForm.getRawValue();

    const detailsPayload = {

      firstName: v.firstName,
      lastName: v.lastName,
      mobile: v.mobile,
      dob: v.dob,
      address: v.address,
      city: v.city,
      state: v.state,
      zip: v.zip,
      maritalStatus: v.maritalStatus || undefined,
      gender: v.gender || undefined,
      nationality: v.nationality || undefined,


      bankAccountHolder: v.bankAccountHolder,
      rib: String(v.rib ?? '').trim(),
      cnss: String(v.cnss ?? '').trim(),
      emergencyFirstName: v.emergencyFirstName,
      emergencyLastName: v.emergencyLastName,
      emergencyNumber: String(v.emergencyNumber ?? '').trim(),
      relationship: v.relationship || undefined,


      department: v.department,
      designation: v.designation,


      contractType: v.contractType,
      weeklyWork: String(v.weeklyWork ?? '').trim(),
      contractStart: v.contractStart,
      trialEnd: v.trialEnd,
      grossSalary: String(v.grossSalary ?? '').trim(),
      grossHourlyRate: String(v.grossHourlyRate ?? '').trim(),
    };

    const roles: Role[] =
      this.selectedRole === 'admin' ? [Role.Admin] :
      this.selectedRole === 'supervisor' ? [Role.Supervisor] :
      [Role.Employee];


    this.employeesService.saveDetails(id, detailsPayload).subscribe({
      next: () => {

        this.employeesService.updateRoles(id, roles).subscribe({
          next: () => {

            this.showAddEmployee = false;
            this.activeTab = 'employees';
            this.activeTabs = 'preview';
            this.previewStep = 1;
            this.proForm.reset();
            this.cities = [];
            this.designations = [];
            this.selectedRole = 'employee';
            this.createdId = null;
            this.plainAccessCode = null;
          },
          error: (err) => {
            console.error('update roles error', err);

          }
        });
      },
      error: (err: any) => {
        console.error('save details error', err);

      },
    });
  }



  selectTab(tab: 'preview' | 'contracts' | 'role') {
    this.activeTabs = tab;
  }

  openAddEmployee(): void {
    this.activeTab = 'employees';
    this.showAddEmployee = true;
  }
  closeAddEmployee(): void {
    this.showAddEmployee = false;
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
    if (file) this.fileName = file.name;
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
    const files = event.dataTransfer?.files;
    if (files?.length) this.fileName = files[0].name;
  }
  clearFile(event: Event): void {
    event.stopPropagation();
    this.fileName = '';
  }

  openDate(input: HTMLInputElement) {
    if ((input as any).showPicker) {
      (input as any).showPicker();
    } else {
      input.focus();
      input.click();
    }
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
  private resetAddFlow(): void {
    this.previewStep = 1;
    this.activeTabs = 'preview';
    this.fileName = '';
    this.showAddEmployee = false;
  }
  onCancelAdd(): void {
    if (this.previewStep > 1) {
      this.previewStep--;
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




}