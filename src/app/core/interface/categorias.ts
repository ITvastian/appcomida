import { Producto } from "./productos";

export interface Categoria {
  id: string;
  name: string;
  photoUrl: string;
  productos: Producto[];
}

