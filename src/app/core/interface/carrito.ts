import { Extra } from "./productos";
export interface Cart {
  idProd: number;
  cantidad: number;
  precio: number;
  notas: string;
  extras: Extra[];
}

