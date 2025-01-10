
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
  getAllProducts(): Observable<Producto[]> {
    return this.firestore.collection<Producto>('productos').valueChanges();
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
            const data = a.payload.doc.data() as Producto;
            return { id: a.payload.doc.id, ...data }; // Retorna los productos con sus IDs
          });
        })
      );
  }
  // Nuevo método público para obtener un documento Firestore en bruto
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
  
          const producto = productos[0];
          return {
            ...producto,
            _id: Number(producto._id) || 0,
            price: Number(producto.price) || 0,
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
      ).valueChanges();
  }
}

