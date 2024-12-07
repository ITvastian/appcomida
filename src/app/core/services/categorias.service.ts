// import { Injectable } from '@angular/core';
// import { Categoria } from '../interface/categorias';
// import { Producto } from '../interface/productos';
// import { Observable } from 'rxjs';
// import { HttpClient } from '@angular/common/http';

// @Injectable({
//   providedIn: 'root',
// })
// export class CategoriasService {
//   // private apiUrl = 'http://localhost:3001';
//   private apiUrl = 'https://mvp-admin.onrender.com/api/categorias';

//   constructor(private http: HttpClient) {}

//   getAll(): Observable<Categoria[]> {
//     return this.http.get<Categoria[]>(this.apiUrl);
//   }

//   getById(id: number): Observable<Categoria> {
//     return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
//   }

//   create(categoria: Categoria): Observable<Categoria> {
//     return this.http.post<Categoria>(this.apiUrl, categoria);
//   }
// }
import { Injectable } from '@angular/core';
import { Categoria } from '../interface/categorias';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  CollectionReference,
} from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  private categoriasCollection: CollectionReference;

  constructor(private firestore: Firestore) {
    // Inicializa la referencia a la colección "categorias"
    this.categoriasCollection = collection(this.firestore, 'categorias');
  }

  // Obtener todas las categorías
  getAll(): Observable<Categoria[]> {
    return new Observable((observer) => {
      getDocs(this.categoriasCollection)
        .then((querySnapshot) => {
          const categorias: Categoria[] = [];
          querySnapshot.forEach((doc) => {
            categorias.push({ id: doc.id, ...doc.data() } as Categoria);
          });
          observer.next(categorias);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  // Obtener categoría por ID
  getById(id: string): Observable<Categoria> {
    const categoriaDocRef = doc(this.firestore, `categorias/${id}`);
    return new Observable((observer) => {
      getDoc(categoriaDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            observer.next({ id: docSnap.id, ...docSnap.data() } as Categoria);
          } else {
            observer.error('La categoría no existe.');
          }
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  // Crear una nueva categoría
  // create(categoria: Categoria): Observable<Categoria> {
  //   return new Observable((observer) => {
  //     addDoc(this.categoriasCollection, categoria)
  //       .then((docRef) => {
  //         observer.next({ id: docRef.id, ...categoria });
  //         observer.complete();
  //       })
  //       .catch((error) => {
  //         observer.error(error);
  //       });
  //   });
  // }
}
