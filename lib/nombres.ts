/**
 * Clave de unicidad de nombres (insumos.nombre_normalizado). Se hace en JS y no
 * con COLLATE NOCASE porque NOCASE de SQLite solo pliega ASCII: "Ácido" y
 * "ácido" quedarían como dos insumos distintos.
 */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es');
}
