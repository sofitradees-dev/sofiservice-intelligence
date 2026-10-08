import type { ContinuityOrder } from '../continuity/types'
import type { CustomerUpdate, CustomerUpdateType } from './types'

function flags(order: ContinuityOrder) {
  const spareOk = !order.requiresSpare || order.spareReceived
  return {
    vehicle: order.vehicleReceived,
    assigned: order.assignmentConfirmed,
    spareOk,
    started: order.repairStarted,
    finished: order.repairFinished,
  }
}

export function findOrderInconsistencies(order: ContinuityOrder): string[] {
  const issues: string[] = []

  if (order.assignmentConfirmed && !order.vehicleReceived) {
    issues.push(
      'La asignación al taller figura registrada sin recepción del vehículo.',
    )
  }
  if (order.requiresSpare && order.spareReceived && !order.vehicleReceived) {
    issues.push(
      'La recepción del recambio figura registrada sin recepción del vehículo.',
    )
  }
  if (
    order.requiresSpare &&
    order.spareReceived &&
    !order.assignmentConfirmed
  ) {
    issues.push(
      'La recepción del recambio figura registrada sin asignación al taller.',
    )
  }
  if (!order.requiresSpare && order.spareReceived) {
    issues.push(
      'Hay recepción de recambio registrada en un servicio que no lo requiere.',
    )
  }
  if (order.repairStarted && !order.vehicleReceived) {
    issues.push('La reparación figura iniciada sin recepción del vehículo.')
  }
  if (order.repairStarted && !order.assignmentConfirmed) {
    issues.push('La reparación figura iniciada sin asignación al taller.')
  }
  if (order.repairStarted && order.requiresSpare && !order.spareReceived) {
    issues.push(
      'La reparación figura iniciada sin recepción del recambio en el taller.',
    )
  }
  if (order.repairFinished && !order.repairStarted) {
    issues.push('La finalización figura registrada sin inicio de reparación.')
  }
  if (order.repairFinished && !order.vehicleReceived) {
    issues.push('La finalización figura registrada sin recepción del vehículo.')
  }
  if (order.repairFinished && !order.assignmentConfirmed) {
    issues.push('La finalización figura registrada sin asignación al taller.')
  }
  if (order.repairFinished && order.requiresSpare && !order.spareReceived) {
    issues.push(
      'La finalización figura registrada sin recepción del recambio en el taller.',
    )
  }

  return issues
}

function classify(order: ContinuityOrder): CustomerUpdateType {
  const { vehicle, assigned, spareOk, started, finished } = flags(order)

  if (!vehicle && !assigned && !started && !finished) {
    return 'ORDEN_CREADA'
  }
  if (vehicle && !assigned && !started && !finished) {
    return 'VEHICULO_RECIBIDO'
  }
  if (vehicle && assigned && order.requiresSpare && !order.spareReceived && !started && !finished) {
    return 'ESPERA_RECAMBIO'
  }
  if (vehicle && assigned && spareOk && !started && !finished) {
    return 'LISTO_PARA_INICIAR'
  }
  if (vehicle && assigned && spareOk && started && !finished) {
    return 'REPARACION_INICIADA'
  }
  if (vehicle && assigned && spareOk && started && finished) {
    return 'REPARACION_FINALIZADA'
  }

  return 'NO_SEGURO'
}

function operationalState(order: ContinuityOrder, type: CustomerUpdateType): string {
  const spare = order.requiresSpare
    ? order.spareReceived
      ? 'recambio recibido en taller'
      : 'recambio pendiente en taller'
    : 'recambio no aplica'
  const parts = [
    `vehículo ${order.vehicleReceived ? 'recibido' : 'no recibido'}`,
    `taller ${order.assignmentConfirmed ? 'asignado' : 'sin asignar'}`,
    spare,
    `reparación ${order.repairStarted ? 'iniciada' : 'no iniciada'}`,
    `finalización ${order.repairFinished ? 'registrada' : 'pendiente'}`,
  ]
  return `${type}: ${parts.join('; ')}`
}

function composeText(order: ContinuityOrder, type: CustomerUpdateType): string {
  const service = order.serviceType

  switch (type) {
    case 'ORDEN_CREADA':
      return `Hola. Su solicitud de servicio «${service}» ya quedó registrada. Por el momento no se ha registrado la recepción de su vehículo.`
    case 'VEHICULO_RECIBIDO':
      return `Confirmamos que su vehículo ya fue recibido para el servicio «${service}».`
    case 'ESPERA_RECAMBIO':
      return `Su vehículo ya está a cargo del taller asignado para el servicio «${service}». Estamos pendientes de confirmar la recepción de un repuesto necesario para continuar.`
    case 'LISTO_PARA_INICIAR':
      return order.requiresSpare
        ? `Confirmamos la recepción del repuesto necesario para el servicio «${service}». Aún no se ha registrado el inicio de los trabajos.`
        : `Su vehículo ya fue recibido y el taller quedó asignado para el servicio «${service}». Aún no se ha registrado el inicio de los trabajos.`
    case 'REPARACION_INICIADA':
      return `Le informamos que se registró el inicio de los trabajos de su servicio «${service}».`
    case 'REPARACION_FINALIZADA':
      return `Le informamos que la reparación de su servicio «${service}» fue registrada como finalizada.`
    default:
      return ''
  }
}

export function composeCustomerUpdate(order: ContinuityOrder): CustomerUpdate {
  const issues = findOrderInconsistencies(order)
  if (issues.length > 0) {
    return {
      ok: false,
      updateType: 'NO_SEGURO',
      customerText: null,
      operationalState: operationalState(order, 'NO_SEGURO'),
      orderId: order.id,
      warning: `No es seguro generar un mensaje. ${issues.join(' ')}`,
    }
  }

  const type = classify(order)
  if (type === 'NO_SEGURO') {
    return {
      ok: false,
      updateType: 'NO_SEGURO',
      customerText: null,
      operationalState: operationalState(order, type),
      orderId: order.id,
      warning:
        'No es seguro generar un mensaje: el estado de la orden no corresponde a un escenario permitido.',
    }
  }

  return {
    ok: true,
    updateType: type,
    customerText: composeText(order, type),
    operationalState: operationalState(order, type),
    orderId: order.id,
  }
}
