import { describe, expect, it } from 'vitest'
import { availableOperationalEvents } from '../continuity/evaluateContinuity'
import { cloneDemoRequests } from '../domain/demoData'
import { buildOrderFromRequest, confirmAndLink } from '../flow/linkOrder'
import { evaluateReadiness } from '../engine/evaluateReadiness'
import {
  CLOSED_DIALOG,
  confirmActionDialog,
  dismissActionDialog,
  nextVisibleAction,
  openActionDialog,
  type ActionDialogState,
} from './confirmActionFlow'

function pitchLinkedOrder() {
  const request = cloneDemoRequests().find((item) => item.id === 'REQ-DEMO-003')
  if (!request) throw new Error('Falta REQ-DEMO-003')
  const evaluation = evaluateReadiness(request)
  const result = confirmAndLink(request, evaluation, [])
  if (!result.order) throw new Error('No se creó la orden')
  return result.order
}

describe('Flujo guiado con ventana de confirmación', () => {
  it('cancelar o cerrar no registra eventos', () => {
    const order = pitchLinkedOrder()
    const opened = openActionDialog(CLOSED_DIALOG, 'confirm_vehicle_reception')
    const closed = dismissActionDialog(opened)

    expect(opened.event).toBe('confirm_vehicle_reception')
    expect(closed).toEqual(CLOSED_DIALOG)
    expect(order.vehicleReceived).toBe(false)
    expect(order.assignmentConfirmed).toBe(false)
  })

  it('confirmar registra exactamente un evento válido', () => {
    const order = pitchLinkedOrder()
    expect(order.vehicleReceived).toBe(false)

    const opened = openActionDialog(CLOSED_DIALOG, 'confirm_vehicle_reception')
    const result = confirmActionDialog(opened, order)

    expect(result.applied).toBe(true)
    expect(result.dialog).toEqual(CLOSED_DIALOG)
    expect(result.order.vehicleReceived).toBe(true)
    expect(result.order.assignmentConfirmed).toBe(false)
    expect(result.order.repairStarted).toBe(false)
    expect(availableOperationalEvents(result.order)).toEqual([
      'confirm_assignment',
    ])
  })

  it('no hay doble ejecución si la ventana ya está ocupada', () => {
    const order = pitchLinkedOrder()
    const opened = openActionDialog(CLOSED_DIALOG, 'confirm_vehicle_reception')
    const busy: ActionDialogState = { event: opened.event, busy: true }
    const skipped = confirmActionDialog(busy, order)
    const first = confirmActionDialog(opened, order)
    const second = confirmActionDialog(opened, first.order)

    expect(skipped.applied).toBe(false)
    expect(skipped.order.vehicleReceived).toBe(false)
    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)
    expect(first.order.vehicleReceived).toBe(true)
  })

  it('transiciones inválidas siguen bloqueadas desde el modal', () => {
    const order = pitchLinkedOrder()
    const opened = openActionDialog(CLOSED_DIALOG, 'start_repair')
    const result = confirmActionDialog(opened, order)

    expect(result.applied).toBe(false)
    expect(result.order.repairStarted).toBe(false)
    expect(result.error).toMatch(/no corresponde/i)
    expect(result.dialog).toEqual(CLOSED_DIALOG)
  })

  it('un segundo modal no se abre si ya hay uno', () => {
    const first = openActionDialog(CLOSED_DIALOG, 'confirm_vehicle_reception')
    const second = openActionDialog(first, 'confirm_assignment')
    expect(second.event).toBe('confirm_vehicle_reception')
  })

  it('tras confirmar, el siguiente paso queda visible y la ventana se cierra', () => {
    const order = pitchLinkedOrder()
    const afterArrival = confirmActionDialog(
      openActionDialog(CLOSED_DIALOG, 'confirm_vehicle_reception'),
      order,
    )

    expect(afterArrival.dialog.event).toBeNull()
    expect(nextVisibleAction(afterArrival.order)).toBe('confirm_assignment')

    const afterShop = confirmActionDialog(
      openActionDialog(CLOSED_DIALOG, 'confirm_assignment'),
      afterArrival.order,
    )
    expect(afterShop.dialog).toEqual(CLOSED_DIALOG)
    expect(nextVisibleAction(afterShop.order)).toBe('confirm_spare_receipt')
  })

  it('confirmar la solicitud no registra la llegada del vehículo', () => {
    const order = buildOrderFromRequest(
      cloneDemoRequests().find((item) => item.id === 'REQ-DEMO-003')!,
    )
    expect(order.vehicleReceived).toBe(false)
    expect(nextVisibleAction(order)).toBe('confirm_vehicle_reception')
  })

  it('una orden finalizada no muestra más acciones operativas', () => {
    let order = pitchLinkedOrder()
    for (const event of [
      'confirm_vehicle_reception',
      'confirm_assignment',
      'confirm_spare_receipt',
      'start_repair',
      'finish_repair',
    ] as const) {
      const result = confirmActionDialog(
        openActionDialog(CLOSED_DIALOG, event),
        order,
      )
      expect(result.applied).toBe(true)
      order = result.order
    }

    expect(nextVisibleAction(order)).toBeNull()
    const extra = confirmActionDialog(
      openActionDialog(CLOSED_DIALOG, 'finish_repair'),
      order,
    )
    expect(extra.applied).toBe(false)
  })
})
