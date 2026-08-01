/**
 * Solución para entornos donde una política de seguridad (p. ej. Windows
 * Application Control) bloquea el binario nativo de Rollup (.node).
 *
 * Se ejecuta en "postinstall". Prueba a cargar el/los binario(s) nativo(s) de
 * Rollup instalados. Si alguno carga bien (caso normal, incluido Vercel/Linux),
 * NO hace nada. Si TODOS están bloqueados (ERR_DLOPEN_FAILED), redirige
 * rollup/dist/native.js a la build WASM (@rollup/wasm-node), que es JS puro.
 */
const fs = require('fs')
const path = require('path')

const rollupScopeDir = path.join(__dirname, '..', 'node_modules', '@rollup')
const nativePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'rollup',
  'dist',
  'native.js',
)

const PARCHE = `// Parcheado automáticamente por scripts/ensure-rollup.cjs
// El binario nativo de Rollup está bloqueado en este entorno; usamos WASM.
module.exports = require('@rollup/wasm-node/dist/native.js')
`

function binariosInstalados() {
  if (!fs.existsSync(rollupScopeDir)) return []
  return fs
    .readdirSync(rollupScopeDir)
    .filter((d) => d.startsWith('rollup-') && d !== 'wasm-node')
    .map((d) => `@rollup/${d}`)
}

const binarios = binariosInstalados()
if (binarios.length === 0) {
  // No hay binarios de plataforma (instalación rara): no intervenimos.
  return
}

let algunoCarga = false
let alguenBloqueado = false
for (const pkg of binarios) {
  try {
    require(pkg)
    algunoCarga = true
    break
  } catch (err) {
    if (err && err.code === 'ERR_DLOPEN_FAILED') alguenBloqueado = true
    // Otros errores (binario de otra plataforma) se ignoran.
  }
}

if (algunoCarga || !alguenBloqueado) {
  // El binario nativo funciona: dejamos Rollup tal cual.
  return
}

// Todos los binarios nativos están bloqueados → aplicamos el parche WASM.
try {
  require.resolve('@rollup/wasm-node/dist/native.js')
} catch {
  console.warn(
    '[ensure-rollup] Binario nativo bloqueado y @rollup/wasm-node no instalado. ' +
      'Ejecuta: npm i -D @rollup/wasm-node',
  )
  return
}
fs.writeFileSync(nativePath, PARCHE, 'utf8')
console.log('[ensure-rollup] Rollup redirigido a WASM (binario nativo bloqueado por el sistema).')
