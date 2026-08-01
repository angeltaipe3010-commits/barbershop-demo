// ----------------------------------------------------------------------------
//  Capa de acceso a datos.
//  Toda consulta a Supabase pasa por aquí: las vistas y hooks nunca escriben
//  queries. Las políticas RLS garantizan que cada rol solo vea lo suyo.
//
//    import { citasApi, ventasApi } from '@/services/api'
// ----------------------------------------------------------------------------
export { citasApi } from './citas'
export { ventasApi, cobroApi } from './ventas'
export { clientesApi } from './clientes'
export { serviciosApi, inventarioApi, fotosApi } from './catalogo'
export { cajaApi, gastosApi } from './caja'
export { staffApi, liquidacionApi } from './staff'
export { configApi, datosApi } from './sistema'
