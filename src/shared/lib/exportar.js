// ----------------------------------------------------------------------------
//  Exportación a CSV (se abre directo en Excel / Google Sheets).
// ----------------------------------------------------------------------------

function escapar(valor) {
  const s = valor == null ? '' : String(valor)
  // Comillas dobles y separadores requieren envolver en comillas.
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Descarga una tabla como CSV.
 * @param {string} nombreArchivo  ej. "reporte-2026-06.csv"
 * @param {{key:string,label:string}[]} columnas
 * @param {object[]} filas
 */
export function descargarCSV(nombreArchivo, columnas, filas) {
  const cabecera = columnas.map((c) => escapar(c.label)).join(';')
  const cuerpo = filas
    .map((fila) => columnas.map((c) => escapar(fila[c.key])).join(';'))
    .join('\n')
  // BOM para que Excel reconozca los acentos (UTF-8).
  const contenido = '﻿' + cabecera + '\n' + cuerpo

  descargarArchivo(nombreArchivo, contenido, 'text/csv;charset=utf-8;')
}

// Descarga un objeto como JSON con formato legible (respaldos).
export function descargarJSON(nombreArchivo, datos) {
  descargarArchivo(nombreArchivo, JSON.stringify(datos, null, 2), 'application/json')
}

function descargarArchivo(nombreArchivo, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
