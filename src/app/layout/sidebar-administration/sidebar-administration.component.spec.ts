import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarAdministrationComponent } from './sidebar-administration.component';

describe('SidebarAdministrationComponent', () => {
  let component: SidebarAdministrationComponent;
  let fixture: ComponentFixture<SidebarAdministrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarAdministrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarAdministrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
