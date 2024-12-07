// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, tap } from 'rxjs';
// import { Producto } from '../interface/productos';
// import { Busqueda } from '../interface/busqueda';

// @Injectable({
//   providedIn: 'root',
// })
// export class ProductosService {
//   // private apiUrl = 'http://localhost:3001/api';
//   private apiUrl = 'https://mvp-admin.onrender.com/api';

//   constructor(private http: HttpClient) {}

//   getByCategory(id: number): Observable<Producto[]> {
//     return this.http.get<Producto[]>(
//       `${this.apiUrl}/categorias/${id}/productos`
//     );
//   }

//   getAllProducts(): Observable<Producto[]> {
//     return this.http.get<Producto[]>(`${this.apiUrl}/productos`);
//   }

//   getById(id: number): Observable<Producto> {
//     return this.http
//       .get<Producto>(`${this.apiUrl}/productos/${id}`)
//       .pipe
//       // tap(producto => console.log('Producto recibido:', producto)) // Depuración
//       ();
//   }

//   buscar(parametros: Busqueda): Observable<Producto[]> {
//     return this.http.get<Producto[]>(`${this.apiUrl}/productos`, {
//       params: {
//         texto: parametros.texto,
//         aptoCeliaco: parametros.aptoCeliaco.toString(),
//         aptoVegano: parametros.aptoVegano.toString(),
//       },
//     });
//   }
// }
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Producto } from '../interface/productos';
import { Firestore, collectionData, doc, docData, query, where, getDocs, CollectionReference, DocumentData } from '@angular/fire/firestore';
import { collection } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private productosCollection: CollectionReference<DocumentData>;

  constructor(private firestore: Firestore) {
    // Obtén una referencia a la colección "productos"
    this.productosCollection = collection(this.firestore, 'productos');
  }

  // Obtiene todos los productos
  getAllProducts(): Observable<Producto[]> {
    return collectionData(this.productosCollection, { idField: 'id' }).pipe(
      map((productos: any[]) =>
        productos.map((producto) => ({
          ...producto,
          _id: Number(producto.id), // Asigna el `id` de Firestore a `_id`
        }))
      )
    );
  }

  // Obtiene productos por categoría
  getByCategory(categoriaId: number): Observable<Producto[]> {
    const categoriaQuery = query(
      this.productosCollection,
      where('categoriaId', '==', categoriaId)
    );
    return collectionData(categoriaQuery, { idField: 'id' }) as Observable<Producto[]>;
  }

  // Obtiene un producto por su ID
 getById(id: number): Observable<Producto> {
  const productoDoc = doc(this.firestore, `productos/${id}`);
  return docData(productoDoc, { idField: 'id' }).pipe(
    map((producto: any) => {
      console.log('Producto recibido desde Firestore:', producto); // Depuración
      return {
        ...producto,
        _id: id,
      };
    })
  );
}
}
