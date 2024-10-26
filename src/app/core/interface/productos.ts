// export interface Producto{
//   id :number,
//   nombre: string
//   precio: number
//   esVegano: boolean
//   esCeliaco: boolean
//   ingredientes: string[]
//   // fotoUrl: string
//   productoFotoUrl:string
//   extras: Extra[]
// }
// export interface Extra {
//   nombre: string;
//   precio: number;
//   seleccionado?: boolean; // Asegúrate de que esta propiedad exista
// }

export interface Producto {
  _id: number;
  name: string;
  price: number;
  esVegano: boolean;
  esCeliaco: boolean;
  ingredients: string[];
  photoUrl: string;
  extras: Extra[];
}
export interface Extra {
  name: string;
  price: number;
  seleccionado?: boolean; // Asegúrate de que esta propiedad exista
}
