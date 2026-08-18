
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { defaultIfEmpty, Observable, of } from 'rxjs';
import { Producto } from '../interface/productos';
import { Busqueda } from '../interface/busqueda';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  constructor(private firestore: AngularFirestore) { }

  private parsePhotoUrl(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private parsePrice(value: unknown): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return 0;
    }

    const raw = value.trim().replace(/\$/g, '').replace(/\s/g, '');
    if (!raw) {
      return 0;
    }

    const hasDot = raw.includes('.');
    const hasComma = raw.includes(',');
    let normalized = raw;

    if (hasDot && hasComma) {
      // Si la coma aparece al final, suele ser decimal: 9.000,50
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
      } else {
        // Caso 9,000.50
        normalized = raw.replace(/,/g, '');
      }
    } else if (hasDot) {
      // Caso miles con punto: 9.000
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
        normalized = raw.replace(/\./g, '');
      }
    } else if (hasComma) {
      // Caso miles con coma: 9,000
      if (/^\d{1,3}(,\d{3})+$/.test(raw)) {
        normalized = raw.replace(/,/g, '');
      } else {
        normalized = raw.replace(',', '.');
      }
    }

    const parsed = Number(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  getAllProducts(): Observable<Producto[]> {
    return this.firestore
      .collection<Producto>('productos')
      .valueChanges()
      .pipe(
        map((productos: Producto[]) =>
          productos.map((producto: any) => ({
            ...producto,
            price: this.parsePrice(producto?.price),
            photoUrl: this.parsePhotoUrl(producto?.photoUrl || producto?.photo),
            extras: producto?.extras || [],
            ingredients: producto?.ingredients || '',
          }))
        )
      );
  }

  getByCategory(categoryId: string): Observable<Producto[]> {
    // console.log('Buscando productos con categoryId:', categoryId);
    if (!categoryId) {
      console.warn('El ID de la categoría es undefined o vacío');
      return of([]); // Retorna un observable vacío en caso de categoría no definida
    }
    // Consulta Firestore si el categoryId es válido
    return this.firestore
      .collection<Producto>('productos', (ref) => ref.where('category', '==', categoryId))
      .snapshotChanges()
      .pipe(
        map((actions) => {
          // console.log('Datos recibidos desde Firestore:', actions);
          return actions.map((a) => {
            const data = a.payload.doc.data() as any;
            return {
              id: a.payload.doc.id,
              ...data,
              price: this.parsePrice(data.price),
              photoUrl: this.parsePhotoUrl(data.photoUrl || data.photo),
              extras: data.extras || [],
              ingredients: data.ingredients || '',
            }; // Retorna los productos con sus IDs
          });
        })
      );
  }

  getById(id: string): Observable<Producto> {
    // console.log(`Buscando en la colección 'productos' donde el campo 'category' sea igual a: ${id}`);
    if (!id) {
      console.warn(`El ID proporcionado es inválido: ${id}`);
      return of({
        category: '',
        _id: 0,
        name: '',
        price: 0,
        esVegano: false,
        esCeliaco: false,
        photoUrl: '',
        ingredients: '',
        extras: [],
      } as Producto);
    }
    return this.firestore
      .collection<Producto>('productos', (ref) => ref.where('category', '==', id))
      .valueChanges({ idField: '_id' }) // Incluye el ID del documento
      .pipe(
        map((productos: Producto[]) => {
          if (productos.length === 0) {
            console.warn(`No se encontraron productos con la categoría: ${id}`);
            return {
              category: '',
              _id: 0,
              name: '',
              price: 0,
              esVegano: false,
              esCeliaco: false,
              photoUrl: '',
              ingredients: '',
              extras: [],
            } as Producto;
          }
          // console.log('Productos encontrados:', productos);
  
          const producto = productos[0] as any;
          return {
            ...producto,
            _id: Number(producto._id) || 0,
            price: this.parsePrice(producto.price),
            photoUrl: this.parsePhotoUrl(producto.photoUrl || producto.photo),
            extras: producto.extras || [],
            ingredients: producto.ingredients || '',
          };
        })
      );
  }
  getRawDocumentById(id: string) {
    return this.firestore.doc(`productos/${id}`).get();
  }

  // Búsqueda de productos por parámetros
  buscar(parametros: Busqueda): Observable<Producto[]> {
    return this.firestore
      .collection<Producto>('productos', ref =>
        ref.where('name', '>=', parametros.texto)
          .where('name', '<=', parametros.texto + '\uf8ff') // Filtro de búsqueda por nombre
      )
      .valueChanges()
      .pipe(
        map((productos: Producto[]) =>
          productos.map((producto: any) => ({
            ...producto,
            price: this.parsePrice(producto?.price),
            photoUrl: this.parsePhotoUrl(producto?.photoUrl || producto?.photo),
            extras: producto?.extras || [],
            ingredients: producto?.ingredients || '',
          }))
        )
      );
  }
}

