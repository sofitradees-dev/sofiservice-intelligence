import {
  applyContinuityEvent,
  availableOperationalEvents,
  evaluateContinuity,
} from '../continuity/evaluateContinuity'
import type { ContinuityEvent, ContinuityOrder } from '../continuity/types'

export interface ActionDialogState {
  event: ContinuityEvent | null
  busy: boolean
}

export interface OperationalActionCopy {
  label: string
  notice: string
  className: string
  explanation: string
}

export const CLOSED_DIALOG: ActionDialogState = { event: null, busy: false }

export const OPERATIONAL_ACTIONS: Partial<
  Record<ContinuityEvent, OperationalActionCopy>
> = {
  confirm_vehicle_reception: {
    label: 'Registrar llegada del vehículo',
    notice: 'Se registró la llegada del vehículo. Eso no inicia la reparación.',
    className: 'primary',
    explanation:
      'Se registrará que el vehículo ya está en el taller. Eso no inicia la reparación.',
  },
  confirm_assignment: {
    label: 'Confirmar taller asignado',
    notice: 'Se confirmó el taller asignado.',
    className: 'primary',
    explanation:
      'Se registrará que el vehículo queda asignado al taller elegido para este servicio.',
  },
  confirm_spare_receipt: {
    label: 'Confirmar llegada del repuesto',
    notice:
      'Se confirmó la llegada del repuesto al taller. Disponibilidad no equivale a llegada.',
    className: 'primary',
    explanation:
      'Se registrará que el repuesto ya llegó al taller. Que esté disponible en inventario no cuenta como llegada.',
  },
  start_repair: {
    label: 'Iniciar reparación',
    notice: 'Se registró el inicio de la reparación.',
    className: 'confirm',
    explanation:
      'Se registrará el inicio de la reparación. Solo procede si ya están los pasos previos.',
  },
  finish_repair: {
    label: 'Finalizar reparación',
    notice:
      'La reparación quedó registrada como finalizada. Eso no significa que el vehículo ya se entregó.',
    className: 'confirm',
    explanation:
      'Se registrará que la reparación terminó. Eso no significa que el vehículo ya se entregó.',
  },
}

export function openActionDialog(
  current: ActionDialogState,
  event: ContinuityEvent,
): ActionDialogState {
  if (current.busy || current.event) {
    return current
  }
  return { event, busy: false }
}

export function dismissActionDialog(
  current: ActionDialogState,
): ActionDialogState {
  if (current.busy) {
    return current
  }
  return CLOSED_DIALOG
}

export function confirmActionDialog(
  current: ActionDialogState,
  order: ContinuityOrder,
): {
  dialog: ActionDialogState
  order: ContinuityOrder
  applied: boolean
  error?: string
} {
  const event = current.event
  if (!event || current.busy) {
    return { dialog: current, order, applied: false }
  }

  const allowed = availableOperationalEvents(order)[0] ?? null
  if (allowed !== event) {
    return {
      dialog: CLOSED_DIALOG,
      order,
      applied: false,
      error: 'Ese paso todavía no corresponde.',
    }
  }

  const result = applyContinuityEvent(order, event)

  if (!result.ok) {
    return {
      dialog: CLOSED_DIALOG,
      order,
      applied: false,
      error: result.error,
    }
  }

  return {
    dialog: CLOSED_DIALOG,
    order: result.order,
    applied: true,
  }
}

export function nextVisibleAction(
  order: ContinuityOrder,
): ContinuityEvent | null {
  if (evaluateContinuity(order).allStagesComplete) {
    return null
  }
  return availableOperationalEvents(order)[0] ?? null
}
