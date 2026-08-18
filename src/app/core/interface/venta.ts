export interface VentaPayload {
  mensaje?: string;
  producto?: string;
  nombreProducto?: string;
  cantidad?: number;
  total?: number;
  llevar?: string | boolean;
  takeAway?: string | boolean;
  timestamp?: string;
}
