import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ArticuloComponent } from './articulo.component';
import { ProductosService } from 'src/app/core/services/productos.service';
import { HeaderService } from 'src/app/core/services/header.service';
import { CartService } from 'src/app/core/services/cart.service';
import { Router } from '@angular/router';

describe('ArticuloComponent', () => {
  let fixture: ComponentFixture<ArticuloComponent>;
  let component: ArticuloComponent;
  let productosService: jasmine.SpyObj<ProductosService>;
  let cartService: jasmine.SpyObj<CartService>;

  beforeEach(async () => {
    productosService = jasmine.createSpyObj('ProductosService', ['getById', 'getByCategory']);
    productosService.getById.and.returnValue(of({
      _id: 'p-123',
      name: 'Pizza de muzza',
      price: 250,
      category: 'cat-1',
      photoUrl: 'https://example.com/pizza.png',
      ingredients: 'Tomate, queso',
      extras: [],
      esVegano: false,
      esCeliaco: false,
    }));
    cartService = jasmine.createSpyObj('CartService', ['addProd']);

    await TestBed.configureTestingModule({
      imports: [ArticuloComponent],
      providers: [
        { provide: HeaderService, useValue: { titulo: { set: () => { } } } },
        { provide: ProductosService, useValue: productosService },
        { provide: CartService, useValue: cartService },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p-123' })) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticuloComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar el producto por id cuando llega la ruta con id', () => {
    expect(productosService.getById).toHaveBeenCalledWith('p-123');
    expect(component.producto?._id).toBe('p-123');
    expect(component.producto?.name).toBe('Pizza de muzza');
  });

  it('debe actualizar el total y enviar la cantidad seleccionada al carrito', () => {
    component.actualizarNum(2);

    expect(component.cantidad).toBe(3);
    expect(component.total).toBe(750);

    component.agregarAlCarrito();

    expect(cartService.addProd).toHaveBeenCalledWith('p-123', 3, '', []);
  });
});
