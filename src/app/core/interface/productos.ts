export interface Producto{
  id :number,
  nombre: string
  precio: number
  esVegano: boolean
  esCeliaco: boolean
  ingredientes: string
  fotoUrl: string
  extras: Extra[]
}
export interface Extra {
  nombre: string;
  precio: number;
  seleccionado?: boolean; // Asegúrate de que esta propiedad exista
}
