import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminstrationComponent } from './dashboard-adminstration.component';

describe('DashboardAdminstrationComponent', () => {
  let component: DashboardAdminstrationComponent;
  let fixture: ComponentFixture<DashboardAdminstrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardAdminstrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardAdminstrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
