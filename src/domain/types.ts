export type CapacityStatus = 'disponible' | 'no_disponible' | 'desconocida'

export type SpareAvailability = 'disponible' | 'no_disponible' | 'desconocida'

export type OperationalInfo = 'completa' | 'incompleta'

export type AttentionStatus = 'pendiente' | 'confirmada'

export type ReadinessDecision =
  | 'CONFIRMABLE'
  | 'NO_CONFIRMABLE'
  | 'VERIFICACION_REQUERIDA'

export interface ServiceRequest {
  id: string
  vehicle: string
  serviceType: string
  workshop: string
  capacity: CapacityStatus
  requiresSpare: boolean
  spareAvailability: SpareAvailability
  operationalInfo: OperationalInfo
  attentionStatus: AttentionStatus
  /** Identificador reservado para asociar, en una fase posterior, una orden de servicio. */
  serviceOrderLinkId: string
  revalidationNeeded: boolean
}

export interface ReadinessEvaluation {
  decision: ReadinessDecision
  reasons: string[]
  recommendedAction: string
}

export interface ConfirmResult {
  ok: boolean
  request: ServiceRequest
  error?: string
}
