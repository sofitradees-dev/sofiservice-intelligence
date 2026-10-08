export type ContinuityStageId =
  | 'recepcion_vehiculo'
  | 'asignacion_taller'
  | 'recepcion_repuesto'
  | 'inicio_reparacion'
  | 'reparacion_finalizada'

export type ContinuityStatus = 'LISTO_PARA_AVANZAR' | 'BLOQUEADO'

export type ContinuityEvent =
  | 'confirm_vehicle_reception'
  | 'confirm_assignment'
  | 'confirm_spare_receipt'
  | 'start_repair'
  | 'finish_repair'
  | 'revert_stage'

export interface ContinuityOrder {
  id: 'OS-DEMO-001'
  vehicle: string
  serviceType: string
  workshop: string
  vehicleReceived: boolean
  assignmentConfirmed: boolean
  spareReceived: boolean
  repairStarted: boolean
  repairFinished: boolean
}

export interface ContinuityEvaluation {
  currentStage: ContinuityStageId
  status: ContinuityStatus
  pendingDependencies: string[]
  verifiedDependencies: string[]
  reasons: string[]
  recommendedAction: string
  allStagesComplete: boolean
}

export interface ContinuityEventResult {
  ok: boolean
  order: ContinuityOrder
  error?: string
}
