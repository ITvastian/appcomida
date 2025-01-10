
export interface Producto {
  category: string;
  _id: number;
  name: string;
  price: number;
  esVegano: boolean;
  esCeliaco: boolean;
  ingredients: string;
  photoUrl: string;
  extras: Extra[];
}
export interface Extra {
  name: string;
  price: number;
  seleccionado?: boolean;
}
