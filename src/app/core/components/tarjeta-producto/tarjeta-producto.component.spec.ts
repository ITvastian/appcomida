import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaProductoComponent } from './tarjeta-producto.component';

describe('TarjetaProductoComponent', () => {
  let component: TarjetaProductoComponent;
  let fixture: ComponentFixture<TarjetaProductoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TarjetaProductoComponent]
    });
    fixture = TestBed.createComponent(TarjetaProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
