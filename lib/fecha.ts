/** Formato de fecha estándar de la app (es-AR, "01 de septiembre de 2024"). */
export function formatearFecha(fecha: Date | string): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}
