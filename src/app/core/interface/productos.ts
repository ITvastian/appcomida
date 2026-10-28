
export interface Producto {
  category: string;
  categoryName?: string;
  _id: string;
  name: string;
  price: number;
  esVegano: boolean;
  esCeliaco: boolean;
  // Apto celíacos; lo envía el back en GET /productos.
  sinTacc?: boolean;
  ingredients: string;
  description?: string;
  photoUrl: string;
  extras: Extra[];
}
export interface Extra {
  name: string;
  price: number;
  seleccionado?: boolean;
}
