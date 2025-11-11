import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveSupervisorComponent } from './leave-supervisor.component';

describe('LeaveSupervisorComponent', () => {
  let component: LeaveSupervisorComponent;
  let fixture: ComponentFixture<LeaveSupervisorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeaveSupervisorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveSupervisorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
