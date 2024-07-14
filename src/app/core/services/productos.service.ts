import { Injectable } from '@angular/core';
import { Producto } from '../interface/productos';
import { Categoria } from '../interface/categorias';
import { Busqueda } from '../interface/busqueda';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  constructor() {}

  async getByCategory(id: number): Promise<Producto[]> {
    const res = await fetch('./../../../assets/data/database.json');
    const resJson: Categoria[] = await res.json();
    const productos = resJson.find((item) => item.id === id)?.productos;
    if (productos) return productos;
    return [];
  }

  async getallProducts(): Promise<Producto[]> {
    const res = await fetch('./../../../assets/data/database.json');
    const resJson: Categoria[] = await res.json();
    let productos: Producto[] = [];
    resJson.forEach((categoria) => {
      productos = [...productos, ...categoria.productos];
    });
    return productos;
  }
  async getById(id: number): Promise<Producto | undefined> {
    const productos = await this.getallProducts();
    const productoElegido = productos.find((productos) => productos.id === id);
    return productoElegido ? productoElegido : undefined;
  }

  async buscar(parametros: Busqueda) {
    const productos = await this.getallProducts();
    const productosFiltrados = productos.filter(producto => {
      if (parametros.aptoCeliaco && !producto.esCeliaco) return false;
      if (parametros.aptoVegano && !producto.esVegano) return false;
      const busquedaTitulo = producto.nombre.toLowerCase().includes(parametros.texto.toLowerCase());
      if (busquedaTitulo) return true;
      for (let i = 0; i < producto.ingredientes.length; i++) {
        const ingrediente = producto.ingredientes[i];
        if(ingrediente.toLowerCase().includes(parametros.texto.toLowerCase()))
          return true;
      }
      return false;
    });
    return productosFiltrados;
  }
}
