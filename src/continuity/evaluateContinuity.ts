import type {
  ContinuityEvaluation,
  ContinuityEvent,
  ContinuityEventResult,
  ContinuityOrder,
  ContinuityStageId,
} from './types'

export const STAGE_SEQUENCE: {
  id: ContinuityStageId
  label: string
}[] = [
  { id: 'recepcion_vehiculo', label: 'Recepción del vehículo' },
  { id: 'asignacion_taller', label: 'Asignación al taller seleccionado' },
  { id: 'recepcion_repuesto', label: 'Confirmación de recepción del recambio' },
  { id: 'inicio_reparacion', label: 'Inicio de reparación' },
  { id: 'reparacion_finalizada', label: 'Reparación finalizada' },
]

export function spareConditionSatisfied(order: ContinuityOrder): boolean {
  return !order.requiresSpare || order.spareReceived
}

export function isStageComplete(
  order: ContinuityOrder,
  stage: ContinuityStageId,
): boolean {
  switch (stage) {
    case 'recepcion_vehiculo':
      return order.vehicleReceived
    case 'asignacion_taller':
      return order.assignmentConfirmed
    case 'recepcion_repuesto':
      return spareConditionSatisfied(order)
    case 'inicio_reparacion':
      return order.repairStarted
    case 'reparacion_finalizada':
      return order.repairFinished
  }
}

export function startRepairBlockers(order: ContinuityOrder): string[] {
  const blockers: string[] = []

  if (!order.vehicleReceived) {
    blockers.push('Falta la recepción del vehículo.')
  }
  if (!order.assignmentConfirmed) {
    blockers.push('Falta la asignación confirmada al taller seleccionado.')
  }
  if (order.requiresSpare && !order.spareReceived) {
    blockers.push(
      'Falta la confirmación de recepción del recambio requerido. No se infiere llegada por inventario.',
    )
  }

  return blockers
}

export function evaluateContinuity(
  order: ContinuityOrder,
): ContinuityEvaluation {
  const verifiedDependencies: string[] = []
  const pendingDependencies: string[] = []

  if (order.vehicleReceived) {
    verifiedDependencies.push('Recepción del vehículo completada.')
  } else {
    pendingDependencies.push('Recepción del vehículo.')
  }

  if (order.assignmentConfirmed) {
    verifiedDependencies.push('Asignación al taller seleccionado confirmada.')
  } else {
    pendingDependencies.push('Asignación confirmada al taller seleccionado.')
  }

  if (!order.requiresSpare) {
    verifiedDependencies.push(
      'Recambio: no aplica; no bloquea el avance.',
    )
  } else if (order.spareReceived) {
    verifiedDependencies.push(
      'Recepción del recambio confirmada de forma explícita.',
    )
  } else {
    pendingDependencies.push(
      'Confirmación de recepción del recambio requerido.',
    )
  }

  if (order.repairStarted) {
    verifiedDependencies.push('Reparación iniciada.')
  } else {
    pendingDependencies.push('Inicio de reparación.')
  }

  if (order.repairFinished) {
    verifiedDependencies.push('Reparación finalizada.')
  } else {
    pendingDependencies.push('Finalización de la reparación.')
  }

  const allStagesComplete =
    order.vehicleReceived &&
    order.assignmentConfirmed &&
    spareConditionSatisfied(order) &&
    order.repairStarted &&
    order.repairFinished

  let currentStage: ContinuityStageId = 'recepcion_vehiculo'
  if (!order.vehicleReceived) {
    currentStage = 'recepcion_vehiculo'
  } else if (!order.assignmentConfirmed) {
    currentStage = 'asignacion_taller'
  } else if (order.requiresSpare && !order.spareReceived) {
    currentStage = 'recepcion_repuesto'
  } else if (!order.repairStarted) {
    currentStage = 'inicio_reparacion'
  } else {
    currentStage = 'reparacion_finalizada'
  }

  if (allStagesComplete) {
    return {
      currentStage: 'reparacion_finalizada',
      status: 'LISTO_PARA_AVANZAR',
      pendingDependencies: [],
      verifiedDependencies,
      reasons: ['Todas las etapas simuladas de la orden están completas.'],
      recommendedAction:
        'La orden simulada está completa. No hay una siguiente etapa en esta demostración.',
      allStagesComplete: true,
    }
  }

  const blockers = startRepairBlockers(order)

  if (!order.repairStarted) {
    if (blockers.length > 0) {
      return {
        currentStage,
        status: 'BLOQUEADO',
        pendingDependencies,
        verifiedDependencies,
        reasons: blockers,
        recommendedAction: `No iniciar la reparación. ${blockers.join(' ')} Completar esas dependencias con una acción explícita.`,
        allStagesComplete: false,
      }
    }

    return {
      currentStage,
      status: 'LISTO_PARA_AVANZAR',
      pendingDependencies,
      verifiedDependencies,
      reasons: order.requiresSpare
        ? [
            'La recepción del vehículo, la asignación y la recepción del recambio están confirmadas.',
          ]
        : [
            'La recepción del vehículo y la asignación están confirmadas. El recambio no aplica.',
          ],
      recommendedAction: order.requiresSpare
        ? 'El asesor puede iniciar la reparación de forma explícita. El recambio no se da por recibido por inventario.'
        : 'El asesor puede iniciar la reparación de forma explícita. El servicio no requiere recambio.',
      allStagesComplete: false,
    }
  }

  return {
    currentStage,
    status: 'LISTO_PARA_AVANZAR',
    pendingDependencies,
    verifiedDependencies,
    reasons: [
      'La reparación ya inició. La finalización permanece pendiente hasta una acción explícita.',
    ],
    recommendedAction:
      'Registrar de forma explícita la finalización de la reparación simulada.',
    allStagesComplete: false,
  }
}

function alreadyCompleteMessage(stageLabel: string): string {
  return `${stageLabel} ya está completada. Esta demostración no permite retroceder etapas.`
}

export function applyContinuityEvent(
  order: ContinuityOrder,
  event: ContinuityEvent,
): ContinuityEventResult {
  if (event === 'revert_stage') {
    return {
      ok: false,
      order,
      error:
        'Esta demostración no permite retroceder una etapa ya completada.',
    }
  }

  if (event === 'confirm_vehicle_reception') {
    if (order.vehicleReceived) {
      return {
        ok: false,
        order,
        error: alreadyCompleteMessage('La recepción del vehículo'),
      }
    }
    return { ok: true, order: { ...order, vehicleReceived: true } }
  }

  if (event === 'confirm_assignment') {
    if (order.assignmentConfirmed) {
      return {
        ok: false,
        order,
        error: alreadyCompleteMessage('La asignación al taller seleccionado'),
      }
    }
    if (!order.vehicleReceived) {
      return {
        ok: false,
        order,
        error:
          'No se puede asignar el taller antes de registrar la recepción del vehículo.',
      }
    }
    return { ok: true, order: { ...order, assignmentConfirmed: true } }
  }

  if (event === 'confirm_spare_receipt') {
    if (!order.requiresSpare) {
      return {
        ok: false,
        order,
        error:
          'Este servicio no requiere recambio; la condición no aplica y no bloquea el avance.',
      }
    }
    if (order.spareReceived) {
      return {
        ok: false,
        order,
        error: alreadyCompleteMessage(
          'La confirmación de recepción del recambio',
        ),
      }
    }
    if (!order.vehicleReceived || !order.assignmentConfirmed) {
      return {
        ok: false,
        order,
        error:
          'No se puede registrar el recambio antes de la recepción del vehículo y la asignación al taller.',
      }
    }
    return { ok: true, order: { ...order, spareReceived: true } }
  }

  if (event === 'start_repair') {
    if (order.repairStarted) {
      return {
        ok: false,
        order,
        error: alreadyCompleteMessage('El inicio de reparación'),
      }
    }
    if (order.repairFinished) {
      return {
        ok: false,
        order,
        error:
          'No se puede modificar el inicio: la reparación simulada ya figura finalizada.',
      }
    }

    const blockers = startRepairBlockers(order)
    if (blockers.length > 0) {
      return {
        ok: false,
        order,
        error: `No se puede iniciar la reparación. ${blockers.join(' ')}`,
      }
    }

    return { ok: true, order: { ...order, repairStarted: true } }
  }

  if (order.repairFinished) {
    return {
      ok: false,
      order,
      error: alreadyCompleteMessage('La finalización de la reparación'),
    }
  }

  if (!order.repairStarted) {
    return {
      ok: false,
      order,
      error:
        'No se puede finalizar la reparación porque todavía no se ha iniciado.',
    }
  }

  return { ok: true, order: { ...order, repairFinished: true } }
}

export function canApplyEvent(
  order: ContinuityOrder,
  event: ContinuityEvent,
): boolean {
  return applyContinuityEvent(order, event).ok
}

const EVENT_FOR_STAGE: Record<ContinuityStageId, ContinuityEvent> = {
  recepcion_vehiculo: 'confirm_vehicle_reception',
  asignacion_taller: 'confirm_assignment',
  recepcion_repuesto: 'confirm_spare_receipt',
  inicio_reparacion: 'start_repair',
  reparacion_finalizada: 'finish_repair',
}

export function nextOperationalEvent(
  order: ContinuityOrder,
): ContinuityEvent | null {
  const evaluation = evaluateContinuity(order)
  if (evaluation.allStagesComplete) {
    return null
  }

  const event = EVENT_FOR_STAGE[evaluation.currentStage]
  return canApplyEvent(order, event) ? event : null
}

export function availableOperationalEvents(
  order: ContinuityOrder,
): ContinuityEvent[] {
  const next = nextOperationalEvent(order)
  return next ? [next] : []
}
