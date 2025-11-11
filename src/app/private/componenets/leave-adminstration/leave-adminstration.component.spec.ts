import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveAdminstrationComponent } from './leave-adminstration.component';

describe('LeaveAdminstrationComponent', () => {
  let component: LeaveAdminstrationComponent;
  let fixture: ComponentFixture<LeaveAdminstrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeaveAdminstrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveAdminstrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
