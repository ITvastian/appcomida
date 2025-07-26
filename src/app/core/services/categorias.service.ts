import { Injectable } from '@angular/core';
import { Categoria } from '../interface/categorias';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore'; 
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  // Usamos Firebase Firestore en lugar de la API externa
  private collectionName = 'categorias'; 

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
            return { ...data, id: a.payload.doc.id }; 
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
