// ----------------------------------------------------------------------------
//  Punto único de importación de la librería UI.
//    import { Boton, Panel, Modal, Campo, Input } from '@/shared/ui'
// ----------------------------------------------------------------------------
export { default as Boton } from './Boton'
export { default as Panel } from './Panel'
export { default as Modal } from './Modal'
export { default as Badge, PuntoVivo } from './Badge'
export { default as Tabla } from './Tabla'
export { default as StatCard } from './StatCard'
export { default as EncabezadoVista } from './EncabezadoVista'
export { default as Segmentado } from './Segmentado'
export { default as PeriodoSelector } from './PeriodoSelector'
export { default as Aparecer } from './Aparecer'
export { default as EstadoVacio, EstadoError } from './EstadoVacio'
export {
  default as Esqueleto,
  EsqueletoTexto,
  EsqueletoTarjetas,
  EsqueletoTabla,
  AnuncioCarga,
} from './Esqueleto'
export { Campo, Input, TextArea, Select, Buscador } from './Campo'
export { default as SubirImagen } from './SubirImagen'
export { BarrasHorizontales, Columnas, BarraApilada } from './Graficos'
export { ToastProvider, useToast } from './Toast'
export { ConfirmProvider, useConfirm } from './ConfirmProvider'
