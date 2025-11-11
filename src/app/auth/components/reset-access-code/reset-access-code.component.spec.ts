import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetAccessCodeComponent } from './reset-access-code.component';

describe('ResetAccessCodeComponent', () => {
  let component: ResetAccessCodeComponent;
  let fixture: ComponentFixture<ResetAccessCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResetAccessCodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetAccessCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
