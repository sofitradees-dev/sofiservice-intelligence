import { describe, expect, it } from 'vitest'
import { cloneInitialOrder } from './demoOrder'
import {
  applyContinuityEvent,
  availableOperationalEvents,
  evaluateContinuity,
  nextOperationalEvent,
  startRepairBlockers,
} from './evaluateContinuity'
import type { ContinuityOrder } from './types'
import { restoreContinuityOrder } from './continuityStore'

function memoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: () => null,
    get length() {
      return store.size
    },
  }
}

function orderWith(overrides: Partial<ContinuityOrder>): ContinuityOrder {
  return { ...cloneInitialOrder(), ...overrides }
}

describe('Service Continuity', () => {
  it('estado inicial bloqueado por recambio', () => {
    const order = cloneInitialOrder()
    const evaluation = evaluateContinuity(order)

    expect(order.id).toBe('OS-DEMO-001')
    expect(order.vehicleReceived).toBe(true)
    expect(order.assignmentConfirmed).toBe(true)
    expect(order.spareReceived).toBe(false)
    expect(evaluation.status).toBe('BLOQUEADO')
    expect(evaluation.currentStage).toBe('recepcion_repuesto')
    expect(evaluation.reasons.some((reason) => /recambio/i.test(reason))).toBe(
      true,
    )
    expect(applyContinuityEvent(order, 'start_repair').ok).toBe(false)
  })

  it('no iniciar sin recepción confirmada del vehículo', () => {
    const order = orderWith({
      vehicleReceived: false,
      assignmentConfirmed: true,
      spareReceived: true,
    })
    expect(startRepairBlockers(order).some((item) => /vehículo/i.test(item))).toBe(
      true,
    )
    const result = applyContinuityEvent(order, 'start_repair')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/vehículo/i)
  })

  it('no iniciar sin asignación confirmada', () => {
    const order = orderWith({
      vehicleReceived: true,
      assignmentConfirmed: false,
      spareReceived: true,
    })
    const result = applyContinuityEvent(order, 'start_repair')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/asignación/i)
  })

  it('no iniciar sin recepción del recambio', () => {
    const order = cloneInitialOrder()
    const result = applyContinuityEvent(order, 'start_repair')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/recambio/i)
  })

  it('confirmar recambio habilita el inicio si lo demás está completo', () => {
    const confirmed = applyContinuityEvent(
      cloneInitialOrder(),
      'confirm_spare_receipt',
    )
    expect(confirmed.ok).toBe(true)
    const evaluation = evaluateContinuity(confirmed.order)
    expect(evaluation.status).toBe('LISTO_PARA_AVANZAR')
    expect(evaluation.currentStage).toBe('inicio_reparacion')
    expect(applyContinuityEvent(confirmed.order, 'start_repair').ok).toBe(true)
  })

  it('no finalizar antes de iniciar', () => {
    const withSpare = applyContinuityEvent(
      cloneInitialOrder(),
      'confirm_spare_receipt',
    )
    const result = applyContinuityEvent(withSpare.order, 'finish_repair')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/no se ha iniciado/i)
  })

  it('finalización correcta después del inicio', () => {
    const withSpare = applyContinuityEvent(
      cloneInitialOrder(),
      'confirm_spare_receipt',
    )
    const started = applyContinuityEvent(withSpare.order, 'start_repair')
    expect(started.ok).toBe(true)
    expect(started.order.repairFinished).toBe(false)
    expect(evaluateContinuity(started.order).currentStage).toBe(
      'reparacion_finalizada',
    )

    const finished = applyContinuityEvent(started.order, 'finish_repair')
    expect(finished.ok).toBe(true)
    expect(finished.order.repairFinished).toBe(true)
    expect(evaluateContinuity(finished.order).allStagesComplete).toBe(true)
  })

  it('no permitir retrocesos', () => {
    const initial = cloneInitialOrder()
    expect(applyContinuityEvent(initial, 'revert_stage').ok).toBe(false)
    expect(
      applyContinuityEvent(initial, 'confirm_vehicle_reception').ok,
    ).toBe(false)
    expect(applyContinuityEvent(initial, 'confirm_assignment').ok).toBe(false)

    const started = applyContinuityEvent(
      applyContinuityEvent(initial, 'confirm_spare_receipt').order,
      'start_repair',
    ).order
    expect(applyContinuityEvent(started, 'start_repair').ok).toBe(false)
    expect(started.vehicleReceived).toBe(true)
    expect(started.assignmentConfirmed).toBe(true)
  })

  it('servicio sin recambio no bloquea el inicio', () => {
    const order = orderWith({
      requiresSpare: false,
      spareReceived: false,
      vehicleReceived: true,
      assignmentConfirmed: true,
    })
    expect(evaluateContinuity(order).status).toBe('LISTO_PARA_AVANZAR')
    expect(applyContinuityEvent(order, 'start_repair').ok).toBe(true)
    expect(applyContinuityEvent(order, 'confirm_spare_receipt').ok).toBe(false)
  })

  it('dependencia de recambio en taller externo', () => {
    const order = cloneInitialOrder()
    expect(order.workshopKind).toBe('externo')
    expect(order.requiresSpare).toBe(true)
    expect(evaluateContinuity(order).status).toBe('BLOQUEADO')
    const received = applyContinuityEvent(order, 'confirm_spare_receipt')
    expect(received.ok).toBe(true)
    expect(evaluateContinuity(received.order).status).toBe('LISTO_PARA_AVANZAR')
  })

  it('no asignar ni registrar recambio antes de recepción', () => {
    const order = orderWith({
      vehicleReceived: false,
      assignmentConfirmed: false,
      spareReceived: false,
    })
    expect(applyContinuityEvent(order, 'confirm_assignment').ok).toBe(false)
    expect(applyContinuityEvent(order, 'confirm_spare_receipt').ok).toBe(false)
    expect(applyContinuityEvent(order, 'start_repair').ok).toBe(false)
  })

  it('no duplica un checkpoint ya registrado', () => {
    const received = applyContinuityEvent(
      cloneInitialOrder(),
      'confirm_spare_receipt',
    )
    expect(received.ok).toBe(true)
    expect(applyContinuityEvent(received.order, 'confirm_spare_receipt').ok).toBe(
      false,
    )
  })

  it('solo ofrece la siguiente acción operativa habilitada', () => {
    const fresh = orderWith({
      vehicleReceived: false,
      assignmentConfirmed: false,
      spareReceived: false,
      repairStarted: false,
      repairFinished: false,
    })
    expect(availableOperationalEvents(fresh)).toEqual([
      'confirm_vehicle_reception',
    ])

    const assigned = applyContinuityEvent(
      applyContinuityEvent(fresh, 'confirm_vehicle_reception').order,
      'confirm_assignment',
    ).order
    expect(nextOperationalEvent(assigned)).toBe('confirm_spare_receipt')
    expect(applyContinuityEvent(assigned, 'start_repair').ok).toBe(false)
    expect(applyContinuityEvent(assigned, 'confirm_vehicle_reception').ok).toBe(
      false,
    )
  })

  it('orden finalizada no deja acciones operativas', () => {
    let order = orderWith({
      vehicleReceived: false,
      assignmentConfirmed: false,
      spareReceived: false,
    })
    order = applyContinuityEvent(order, 'confirm_vehicle_reception').order
    order = applyContinuityEvent(order, 'confirm_assignment').order
    order = applyContinuityEvent(order, 'confirm_spare_receipt').order
    order = applyContinuityEvent(order, 'start_repair').order
    order = applyContinuityEvent(order, 'finish_repair').order
    expect(evaluateContinuity(order).allStagesComplete).toBe(true)
    expect(availableOperationalEvents(order)).toEqual([])
    expect(applyContinuityEvent(order, 'finish_repair').ok).toBe(false)
    expect(applyContinuityEvent(order, 'start_repair').ok).toBe(false)
  })

  it('restaurar escenario inicial', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })

    const restored = restoreContinuityOrder()
    expect(restored).toEqual(cloneInitialOrder())
    expect(evaluateContinuity(restored).status).toBe('BLOQUEADO')
    expect(restored.spareReceived).toBe(false)
    expect(restored.repairStarted).toBe(false)
  })
})
