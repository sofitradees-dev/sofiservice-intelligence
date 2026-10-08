import type {
  ReadinessEvaluation,
  ServiceRequest,
} from '../domain/types'

function joinEs(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? ''
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

function recommendedAction(input: {
  attentionStatus: ServiceRequest['attentionStatus']
  decision: ReadinessEvaluation['decision']
  capacityBlocked: boolean
  spareBlocked: boolean
  capacityUnknown: boolean
  spareUnknown: boolean
  infoIncomplete: boolean
}): string {
  const pending: string[] = []
  if (input.capacityUnknown) {
    pending.push('la capacidad del taller')
  }
  if (input.spareUnknown) {
    pending.push('la disponibilidad del recambio obligatorio')
  }
  if (input.infoIncomplete) {
    pending.push('la información operativa')
  }

  if (input.decision === 'CONFIRMABLE') {
    if (input.attentionStatus === 'confirmada') {
      return 'La atención ya está confirmada. No se requiere una nueva confirmación mientras las condiciones se mantengan.'
    }

    return 'La solicitud es confirmable. Requiere confirmación manual del asesor; la confirmación no es automática.'
  }

  if (input.decision === 'NO_CONFIRMABLE') {
    const hasCapacity = input.capacityBlocked
    const hasSpare = input.spareBlocked

    if (hasCapacity && hasSpare && pending.length > 0) {
      return `No confirmar la atención. Gestionar el cupo del taller y el recambio obligatorio, y verificar ${joinEs(pending)}.`
    }

    if (hasCapacity && hasSpare) {
      return 'No confirmar la atención. Gestionar ambas condiciones: el cupo del taller y el recambio obligatorio no están disponibles.'
    }

    if (hasCapacity && pending.length > 0) {
      return `No confirmar la atención. Consultar otra disponibilidad del taller y verificar ${joinEs(pending)}.`
    }

    if (hasSpare && pending.length > 0) {
      return `No confirmar la atención. Verificar o gestionar el suministro del recambio necesario y verificar ${joinEs(pending)}.`
    }

    if (hasCapacity) {
      return 'No confirmar la atención. Consultar otra disponibilidad del taller antes de ofrecer una recepción.'
    }

    return 'No confirmar la atención. Verificar o gestionar el suministro del recambio necesario antes de ofrecer una fecha de atención.'
  }

  if (input.infoIncomplete && pending.length === 1) {
    return 'Solicitar completar la información operativa necesaria antes de confirmar.'
  }

  return `Solicitar la verificación de ${joinEs(pending)}. No tratar la información desconocida o incompleta como disponible.`
}

export function evaluateReadiness(
  request: ServiceRequest,
): ReadinessEvaluation {
  const reasons: string[] = []
  let hasConfirmedBlocker = false
  let needsVerification = false
  const capacityBlocked = request.capacity === 'no_disponible'
  const capacityUnknown = request.capacity === 'desconocida'
  const spareBlocked =
    request.requiresSpare && request.spareAvailability === 'no_disponible'
  const spareUnknown =
    request.requiresSpare && request.spareAvailability === 'desconocida'
  const infoIncomplete = request.operationalInfo === 'incompleta'

  if (capacityBlocked) {
    hasConfirmedBlocker = true
    reasons.push('El taller no tiene cupo disponible para este servicio.')
  } else if (capacityUnknown) {
    needsVerification = true
    reasons.push(
      'La capacidad del taller es desconocida y debe verificarse.',
    )
  }

  if (spareBlocked) {
    hasConfirmedBlocker = true
    reasons.push(
      'El recambio obligatorio no está disponible según el valor simulado de la solicitud.',
    )
  } else if (spareUnknown) {
    needsVerification = true
    reasons.push(
      'La disponibilidad del recambio obligatorio es desconocida.',
    )
  }

  if (infoIncomplete) {
    needsVerification = true
    reasons.push('La información operativa está incompleta.')
  }

  const decision = hasConfirmedBlocker
    ? 'NO_CONFIRMABLE'
    : needsVerification
      ? 'VERIFICACION_REQUERIDA'
      : 'CONFIRMABLE'

  const favorableReasons = [
    'Capacidad del taller: disponible.',
    request.requiresSpare
      ? 'Recambio obligatorio: disponible según el valor simulado de la solicitud.'
      : 'El servicio no requiere recambio; este factor no bloquea la atención.',
    'Información operativa: completa.',
  ]

  return {
    decision,
    reasons: decision === 'CONFIRMABLE' ? favorableReasons : reasons,
    recommendedAction: recommendedAction({
      attentionStatus: request.attentionStatus,
      decision,
      capacityBlocked,
      spareBlocked,
      capacityUnknown,
      spareUnknown,
      infoIncomplete,
    }),
  }
}
