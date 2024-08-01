import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, Observable } from 'rxjs';
import { ProductService } from 'src/app/core/services/admin.service';
import { of } from 'rxjs';

interface Product {
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [FormsModule, CommonModule],
  standalone: true,
})
export class AdminComponent implements OnInit {
  products$: Observable<Product[]> = new Observable<Product[]>();
  selectedFile: File | null = null;

  constructor(private productService: ProductService) {
    this.products$ = new Observable<Product[]>();
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.products$ = this.productService.getProducts().pipe(
      catchError(error => {
        console.error('Error fetching products', error);
        return of([]);
      })
    );
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] || null;
  }

  addProduct(): void {
  const productForm = document.forms.namedItem('productForm') as HTMLFormElement | null;

  if (!productForm) {
    console.error('Form not found');
    return;
  }

  const formData = new FormData(productForm);

  if (this.selectedFile) {
    formData.append('imagen', this.selectedFile);
  }

  const product: Product = {
    nombre: formData.get('nombre') as string || '',
    precio: parseFloat(formData.get('precio') as string) || 0,
    descripcion: formData.get('descripcion') as string || '',
    imagen: '' // La imagen se manejará de manera diferente
  };

  this.productService.addProduct(product).pipe(
    catchError(error => {
      console.error('Error adding product', error);
      return of(null);
    })
  ).subscribe(response => {
    if (response) {
      alert('Producto añadido exitosamente');
      this.loadProducts();
    }
  });
}
}
