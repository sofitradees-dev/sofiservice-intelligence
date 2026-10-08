import type { ContinuityOrder, ContinuityStageId } from '../continuity/types'
import type { ReadinessDecision, ServiceRequest, WorkshopKind } from '../domain/types'
import type { CustomerUpdateType } from '../updates/types'

export function everydayWorkshopKind(kind: WorkshopKind): string {
  if (kind === 'propio') return 'Taller propio'
  if (kind === 'externo') return 'Taller externo'
  return 'Sin taller seleccionado'
}

export function everydayVehicle(vehicle: string): string {
  return vehicle.split(' · VIN')[0]?.trim() || vehicle
}

export function everydayDecision(decision: ReadinessDecision): string {
  if (decision === 'CONFIRMABLE') return 'Se puede atender'
  if (decision === 'NO_CONFIRMABLE') return 'No se puede confirmar'
  return 'Falta verificar información'
}

export function everydayStage(stage: ContinuityStageId): string {
  switch (stage) {
    case 'recepcion_vehiculo':
      return 'Llegada del vehículo'
    case 'asignacion_taller':
      return 'Taller asignado'
    case 'recepcion_repuesto':
      return 'Llegada del repuesto'
    case 'inicio_reparacion':
      return 'Inicio de reparación'
    case 'reparacion_finalizada':
      return 'Reparación finalizada'
  }
}

export function everydayUpdateType(type: CustomerUpdateType): string {
  switch (type) {
    case 'ORDEN_CREADA':
      return 'Solicitud registrada'
    case 'VEHICULO_RECIBIDO':
      return 'Vehículo recibido'
    case 'ESPERA_RECAMBIO':
      return 'Esperando el repuesto en el taller'
    case 'LISTO_PARA_INICIAR':
      return 'Listo para iniciar la reparación'
    case 'REPARACION_INICIADA':
      return 'Reparación en curso'
    case 'REPARACION_FINALIZADA':
      return 'Reparación registrada como finalizada'
    case 'NO_SEGURO':
      return 'No se puede armar un mensaje seguro'
  }
}

export function everydayServiceStatus(order: ContinuityOrder): string {
  if (order.repairFinished) return 'Reparación registrada como finalizada'
  if (order.repairStarted) return 'Reparación en curso'
  if (order.requiresSpare && order.assignmentConfirmed && !order.spareReceived) {
    return 'Esperando llegada del repuesto al taller'
  }
  if (order.assignmentConfirmed) return 'Taller asignado'
  if (order.vehicleReceived) return 'Vehículo recibido'
  return 'Atención confirmada; el vehículo aún no llega'
}

export interface AdvisorGuide {
  happening: string
  why: string
  next: string
}

export function advisorGuide(input: {
  request: ServiceRequest | null
  evaluationDecision: ReadinessDecision | null
  evaluationStale: boolean
  evaluationWhy: string | null
  order: ContinuityOrder | null
  orderComplete: boolean
  orderBlocked: boolean
  orderWhy: string | null
}): AdvisorGuide {
  const { request, evaluationDecision, evaluationStale, evaluationWhy, order } =
    input

  if (!request) {
    return {
      happening: 'No hay una solicitud seleccionada.',
      why: 'Primero hay que elegir el caso de la lista.',
      next: 'Seleccione un servicio de la lista de la izquierda.',
    }
  }

  if (order) {
    if (order.repairFinished) {
      return {
        happening: 'La reparación quedó registrada como finalizada.',
        why: 'Ya se registraron todos los pasos del taller. Eso no significa que el vehículo haya sido entregado.',
        next: 'Si hace falta, copie el mensaje para el cliente. No afirme que el vehículo ya se entregó.',
      }
    }
    if (order.repairStarted) {
      return {
        happening: 'La reparación está en curso.',
        why: 'Se registró el inicio de los trabajos. Todavía no se registró el cierre.',
        next: 'Cuando corresponda, pulse Finalizar reparación.',
      }
    }
    if (order.requiresSpare && order.assignmentConfirmed && !order.spareReceived) {
      return {
        happening: 'El taller está asignado y falta el repuesto en el taller.',
        why: 'Que el repuesto figure disponible no significa que ya haya llegado al taller.',
        next: 'Pulse Confirmar llegada del repuesto solo cuando el taller lo haya recibido.',
      }
    }
    if (order.assignmentConfirmed) {
      return {
        happening: 'El taller ya está asignado.',
        why: 'El vehículo llegó y el taller quedó confirmado. Aún no se inicia la reparación.',
        next: 'Pulse Iniciar reparación.',
      }
    }
    if (order.vehicleReceived) {
      return {
        happening: 'El vehículo ya llegó.',
        why: 'Se registró la llegada. Todavía falta confirmar el taller asignado.',
        next: 'Pulse Confirmar taller asignado.',
      }
    }
    return {
      happening: 'La atención ya está confirmada.',
      why: 'Confirmar la atención no significa que el vehículo ya haya llegado al taller.',
      next: 'Pulse Registrar llegada del vehículo cuando el auto esté en el taller.',
    }
  }

  if (!evaluationDecision || evaluationStale) {
    return {
      happening: 'Hay una solicitud pendiente de revisión.',
      why: 'Todavía no se verificó si se puede atender con las condiciones actuales.',
      next: 'Pulse Verificar disponibilidad.',
    }
  }

  if (evaluationDecision === 'NO_CONFIRMABLE') {
    return {
      happening: 'No se puede confirmar esta atención.',
      why: evaluationWhy ?? 'Hay una condición que lo impide.',
      next: 'No confirme. Revise el motivo y, si cambia alguna condición, vuelva a verificar.',
    }
  }

  if (evaluationDecision === 'VERIFICACION_REQUERIDA') {
    return {
      happening: 'Falta verificar información.',
      why: evaluationWhy ?? 'Hay un dato incompleto o desconocido.',
      next: 'Complete o aclare la información y pulse Verificar disponibilidad.',
    }
  }

  return {
    happening: 'Se puede atender.',
    why: 'Las condiciones registradas permiten confirmar. Esto no reserva un cupo real ni implica que el vehículo ya llegó.',
    next: 'Pulse Confirmar atención.',
  }
}
