import { Extra } from "./productos";
export interface Cart {
  idProd: string;
  cantidad: number;
  precio: number;
  notas: string;
  extras: Extra[];
}

