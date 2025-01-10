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
import { AngularFirestore } from '@angular/fire/compat/firestore';  // Importar AngularFirestore
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  // Usamos Firebase Firestore en lugar de la API externa
  private collectionName = 'categorias';  // Nombre de la colección en Firestore

  constructor(private firestore: AngularFirestore) {}

  // Obtener todas las categorías (desde Firestore)
  getAll(): Observable<Categoria[]> {
    return this.firestore
      .collection<Categoria>(this.collectionName)
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as Categoria;
            // Agregar el ID de Firestore, pero sin sobrescribir
            return { ...data, id: a.payload.doc.id };  // Aquí, 'id' es el ID que proviene de Firestore
          })
        )
      );
  }
  getCategoryIdByName(name: string): Observable<string> {
      return this.firestore
        .collection('categorias', ref => ref.where('name', '==', name))
        .get()
        .pipe(
          map(snapshot => {
            if (!snapshot.empty) {
              return snapshot.docs[0].id; // ID de la categoría encontrada
            }
            throw new Error('Categoría no encontrada');
          })
        );
    }

  // Obtener una categoría por su ID (desde Firestore)
  getById(id: string): Observable<Categoria> {
    return this.firestore
      .doc<Categoria>(`${this.collectionName}/${id}`)
      .valueChanges()
      .pipe(
        map((data) => {
          return { id, ...data } as Categoria;  // Retornar la categoría con su ID
        })
      );
  }

  // Crear una nueva categoría (en Firestore)
  create(categoria: Categoria): Observable<any> {
    const id = this.firestore.createId();  // Crear un ID único para la categoría
    return new Observable((observer) => {
      this.firestore
        .doc(`${this.collectionName}/${id}`)
        .set(categoria)  // Usar set() para crear el documento
        .then(() => {
          observer.next({ id, categoria });  // Devolver el documento creado con el ID
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }
}
