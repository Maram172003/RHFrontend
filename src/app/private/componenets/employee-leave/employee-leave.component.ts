import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveItem, LeavesService } from '../../services/leaves.service';

@Component({
  selector: 'app-employee-leave',
  standalone: false,
  templateUrl: './employee-leave.component.html',
  styleUrl: './employee-leave.component.css'
})
export class EmployeeLeaveComponent implements OnInit {

  showOverlay = false;

  selectedStart: 'full' | 'morning' | 'afternoon' | null = null;
  selectedEnd: 'full' | 'morning' | null = null;

  file?: File | null = null;
  fileName: string | null = null;

  leaveForm!: FormGroup;
  submitting = false;

  myLeaves: LeaveItem[] = [];
  isListLoading = false;

  constructor(private fb: FormBuilder, private leaves: LeavesService) { }

  ngOnInit(): void {
    this.activeTab = 'demands';
    this.leaveForm = this.fb.group({
      leaveType: ['', Validators.required],
      startDate: ['', Validators.required],
      startPart: ['full', Validators.required],
      endDate: ['', Validators.required],
      endPart: ['full', Validators.required],
      attachment: [null]
    });
    this.selectedStart = 'full';
    this.selectedEnd = 'full';
    this.loadMyLeaves();
  }

  loadMyLeaves() {
    this.isListLoading = true;
    this.leaves.listMyLeaves().subscribe({
      next: (rows) => { this.myLeaves = rows; },
      error: (err) => { console.error(err); },
      complete: () => { this.isListLoading = false; }
    });
  }

  openOverlay() {
    this.fileName = '';
    this.file = null;
    this.leaveForm.reset({
      leaveType: '',
      startDate: '',
      startPart: 'full',
      endDate: '',
      endPart: 'full',
      attachment: null
    });
    this.selectedStart = 'full';
    this.selectedEnd = 'full';
    this.showOverlay = true;
  }
  closeOverlay() { this.showOverlay = false; }

  private setFile(f: File) {
    this.file = f;
    this.fileName = f.name;
    this.leaveForm.patchValue({ attachment: f }); 
  }
  clearFile(ev?: Event) {
    ev?.stopPropagation();
    this.file = null;
    this.fileName = null;
    this.leaveForm.patchValue({ attachment: null });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
      input.value = '';
    }
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).classList.remove('is-dragover');
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) {
      this.setFile(files[0]);
    }
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).classList.add('is-dragover');
  }

  onDragLeave(ev: DragEvent) {
    (ev.currentTarget as HTMLElement).classList.remove('is-dragover');
  }

  activeFilter: 'onhold' | 'valid' | 'canceled' | 'all' | 'category' | null = null;
  setFilter(f: typeof this.activeFilter) { this.activeFilter = (this.activeFilter === f ? null : f); }


  activeTab: 'demands' | 'credit' | 'team' = 'demands';

  selectTab(tab: 'demands' | 'credit' | 'team') {
    this.activeTab = tab;
  }


  availableLeaves = 24;
  lastUpdated: Date = new Date();

  setStart(part: 'full'|'morning'|'afternoon') {
    this.selectedStart = part;
    this.leaveForm.patchValue({ startPart: part });
  }
  setEnd(part: 'full'|'morning') {
    this.selectedEnd = part;
    this.leaveForm.patchValue({ endPart: part });
  }
    submit() {
    if (this.leaveForm.invalid) return;
    this.submitting = true;

    const v = this.leaveForm.value;
    const fd = new FormData();
    fd.append('leaveType', v.leaveType);
    fd.append('startDate', v.startDate);
    fd.append('startPart', v.startPart);
    fd.append('endDate', v.endDate);
    fd.append('endPart', v.endPart);
    if (v.attachment) fd.append('attachment', v.attachment);

    this.leaves.createLeave(fd).subscribe({
      next: () => {
        this.submitting = false;
        this.closeOverlay();
        this.loadMyLeaves();
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
      }
    });
  }

}
