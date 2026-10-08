import type { ContinuityOrder } from '../continuity/types'

export type CustomerUpdateType =
  | 'ORDEN_CREADA'
  | 'VEHICULO_RECIBIDO'
  | 'ESPERA_RECAMBIO'
  | 'LISTO_PARA_INICIAR'
  | 'REPARACION_INICIADA'
  | 'REPARACION_FINALIZADA'
  | 'NO_SEGURO'

export interface CustomerUpdate {
  ok: boolean
  updateType: CustomerUpdateType
  customerText: string | null
  operationalState: string
  orderId: string
  warning?: string
}

export type CustomerUpdateInput = ContinuityOrder
