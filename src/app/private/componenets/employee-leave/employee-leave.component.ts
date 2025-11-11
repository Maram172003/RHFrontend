import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-leave',
  standalone: false,
  templateUrl: './employee-leave.component.html',
  styleUrl: './employee-leave.component.css'
})
export class EmployeeLeaveComponent {
    showOverlay = false;

selectedStart: 'full'|'morning'|'afternoon'|null = null;
selectedEnd: 'full'|'morning'|null = null;

openOverlay(){
  this.showOverlay = true;
 
  this.selectedStart = null;
  this.selectedEnd = null;
}

closeOverlay(){
  this.showOverlay = false;
}

file?: File | null = null;
fileName: string | null = null;

private setFile(f: File){
  this.file = f;
  this.fileName = f.name;
}

clearFile(ev?: Event){
  ev?.stopPropagation(); // évite d’ouvrir le sélecteur si la box est cliquable
  this.file = null;
  this.fileName = null;
}

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.setFile(input.files[0]);
    input.value = ''; // permet de re-sélectionner le même fichier plus tard
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

onDragLeave(ev: DragEvent){
  (ev.currentTarget as HTMLElement).classList.remove('is-dragover');
}

activeFilter: 'onhold'|'valid'|'canceled'|'all'|'category'|null = null;
setFilter(f: typeof this.activeFilter){ this.activeFilter = (this.activeFilter===f ? null : f); }


  activeTab: 'demands' | 'credit' | 'team' = 'demands';

  selectTab(tab: 'demands' | 'credit' | 'team') {
    this.activeTab = tab;
  }
    ngOnInit() {
    this.activeTab = 'demands';
  }

  availableLeaves = 24;
  lastUpdated: Date = new Date();
}
