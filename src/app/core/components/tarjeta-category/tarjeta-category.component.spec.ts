import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaCategoryComponent } from './tarjeta-category.component';

describe('TarjetaCategoryComponent', () => {
  let component: TarjetaCategoryComponent;
  let fixture: ComponentFixture<TarjetaCategoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TarjetaCategoryComponent]
    });
    fixture = TestBed.createComponent(TarjetaCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
