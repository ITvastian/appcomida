import { Producto } from "./productos"

export interface Categoria{
  id :number,
  nombre: string
  fotoUrl: string,
  categoria:string
  productos: Producto[]
}
// import { Producto } from "./productos"

// export interface Categoria{
//   id :number,
//   nombre: string
//   fotoUrl: string
//   productos: Producto[]
// }
