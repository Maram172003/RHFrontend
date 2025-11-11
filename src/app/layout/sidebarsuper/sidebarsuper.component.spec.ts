import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarsuperComponent } from './sidebarsuper.component';

describe('SidebarsuperComponent', () => {
  let component: SidebarsuperComponent;
  let fixture: ComponentFixture<SidebarsuperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarsuperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarsuperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
