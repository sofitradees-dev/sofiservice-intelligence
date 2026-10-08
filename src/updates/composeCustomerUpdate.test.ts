import { describe, expect, it } from 'vitest'
import { cloneInitialOrder } from '../continuity/demoOrder'
import { applyContinuityEvent } from '../continuity/evaluateContinuity'
import { restoreContinuityOrder } from '../continuity/continuityStore'
import type { ContinuityOrder } from '../continuity/types'
import { composeCustomerUpdate } from './composeCustomerUpdate'

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
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  }
}

function orderWith(overrides: Partial<ContinuityOrder>): ContinuityOrder {
  return {
    id: 'OS-LINK-REQ-DEMO-003',
    requestId: 'REQ-DEMO-003',
    vehicle: 'Hatchback DEMO-C · VIN FICCIO003PA000003',
    serviceType: 'Reparación por colisión (carrocería)',
    workshop: 'Taller externo de colisión simulado',
    workshopKind: 'externo',
    requiresSpare: true,
    vehicleReceived: false,
    assignmentConfirmed: false,
    spareReceived: false,
    repairStarted: false,
    repairFinished: false,
    ...overrides,
  }
}

const DATEISH = /\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}|\bETA\b|\bmañana\b|\bhoy a las\b/i
const INTERNAL_LEAK =
  /propuesta no incluye envío real|datos simulados|mensaje no enviado|no se ha enviado|vista previa|inventario|motor|checkpoint|OS-LINK|REQ-DEMO|VIN |FICCIO|contacto automático|le contactaremos/i
const PICKUP_CLAIM =
  /listo para retiro|listo para recoger|ya puede retirar|vehículo entregado|entregamos su vehículo/i

function expectCopyable(text: string | null) {
  expect(text).toBeTruthy()
  expect(text).not.toMatch(DATEISH)
  expect(text).not.toMatch(INTERNAL_LEAK)
  expect(text).not.toMatch(PICKUP_CLAIM)
}

describe('composeCustomerUpdate', () => {
  it('orden creada sin recepción', () => {
    const update = composeCustomerUpdate(orderWith({}))
    expect(update.ok).toBe(true)
    expect(update.updateType).toBe('ORDEN_CREADA')
    expect(update.orderId).toBe('OS-LINK-REQ-DEMO-003')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/solicitud de servicio/i)
    expect(update.customerText).toMatch(/no se ha registrado la recepción/i)
    expect(update.customerText).not.toMatch(/fue recibido/i)
  })

  it('vehículo recibido; pendiente de asignación', () => {
    const update = composeCustomerUpdate(
      orderWith({ vehicleReceived: true }),
    )
    expect(update.updateType).toBe('VEHICULO_RECIBIDO')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/vehículo ya fue recibido/i)
    expect(update.customerText).not.toMatch(/taller quedó asignado/i)
    expect(update.customerText).not.toMatch(/inicio de los trabajos/i)
  })

  it('repuesto requerido sin recepción en taller', () => {
    const update = composeCustomerUpdate(cloneInitialOrder())
    expect(update.ok).toBe(true)
    expect(update.updateType).toBe('ESPERA_RECAMBIO')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/pendientes de confirmar la recepción de un repuesto/i)
    expect(update.customerText).not.toMatch(/inventario/i)
    expect(update.customerText).not.toMatch(/inicio de los trabajos/i)
  })

  it('servicio sin recambio no menciona pieza pendiente', () => {
    const update = composeCustomerUpdate(
      orderWith({
        requiresSpare: false,
        vehicleReceived: true,
        assignmentConfirmed: true,
      }),
    )
    expect(update.updateType).toBe('LISTO_PARA_INICIAR')
    expectCopyable(update.customerText)
    expect(update.customerText).not.toMatch(/repuesto/i)
    expect(update.customerText).not.toMatch(/recambio/i)
    expect(update.customerText).not.toMatch(/pieza/i)
    expect(update.customerText).toMatch(/aún no se ha registrado el inicio/i)
  })

  it('dependencias completas; reparación pendiente de inicio', () => {
    const withSpare = applyContinuityEvent(
      cloneInitialOrder(),
      'confirm_spare_receipt',
    ).order
    const update = composeCustomerUpdate(withSpare)
    expect(update.updateType).toBe('LISTO_PARA_INICIAR')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/recepción del repuesto/i)
    expect(update.customerText).toMatch(/aún no se ha registrado el inicio/i)
  })

  it('reparación iniciada', () => {
    const started = applyContinuityEvent(
      applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
      'start_repair',
    ).order
    const update = composeCustomerUpdate(started)
    expect(update.updateType).toBe('REPARACION_INICIADA')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/se registró el inicio de los trabajos/i)
    expect(update.customerText).not.toMatch(/finaliz/i)
    expect(update.customerText).not.toMatch(/\d+\s*%/)
  })

  it('finalización registrada', () => {
    const finished = applyContinuityEvent(
      applyContinuityEvent(
        applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
        'start_repair',
      ).order,
      'finish_repair',
    ).order
    const update = composeCustomerUpdate(finished)
    expect(update.updateType).toBe('REPARACION_FINALIZADA')
    expectCopyable(update.customerText)
    expect(update.customerText).toMatch(/fue registrada como finalizada/i)
    expect(update.customerText).not.toMatch(PICKUP_CLAIM)
  })

  it('el texto copiable no incluye advertencias internas', () => {
    const states: ContinuityOrder[] = [
      orderWith({}),
      orderWith({ vehicleReceived: true }),
      cloneInitialOrder(),
      applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
      applyContinuityEvent(
        applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
        'start_repair',
      ).order,
      applyContinuityEvent(
        applyContinuityEvent(
          applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
          'start_repair',
        ).order,
        'finish_repair',
      ).order,
    ]
    for (const order of states) {
      expectCopyable(composeCustomerUpdate(order).customerText)
    }
  })

  it('copia únicamente el contenido destinado al cliente', () => {
    const update = composeCustomerUpdate(orderWith({ vehicleReceived: true }))
    expect(update.customerText).toBe(
      'Confirmamos que su vehículo ya fue recibido para el servicio «Reparación por colisión (carrocería)».',
    )
    expect(update.customerText).not.toContain(update.orderId)
    expect(update.operationalState).toMatch(/VEHICULO_RECIBIDO/)
  })

  it('estado inconsistente: reparación iniciada sin recepción', () => {
    const update = composeCustomerUpdate(
      orderWith({
        vehicleReceived: false,
        repairStarted: true,
      }),
    )
    expect(update.ok).toBe(false)
    expect(update.customerText).toBeNull()
    expect(update.updateType).toBe('NO_SEGURO')
    expect(update.warning).toMatch(/no es seguro generar un mensaje/i)
  })

  it('transición imposible: finalizada sin iniciar', () => {
    const update = composeCustomerUpdate(
      orderWith({
        vehicleReceived: true,
        assignmentConfirmed: true,
        spareReceived: true,
        repairStarted: false,
        repairFinished: true,
      }),
    )
    expect(update.ok).toBe(false)
    expect(update.customerText).toBeNull()
    expect(update.warning).toMatch(/sin inicio/i)
  })

  it('no afirma recepción de recambio si no está registrada', () => {
    const update = composeCustomerUpdate(cloneInitialOrder())
    expect(update.customerText).not.toMatch(/confirmamos la recepción del repuesto/i)
  })

  it('se actualiza después de un checkpoint', () => {
    const before = composeCustomerUpdate(cloneInitialOrder())
    expect(before.updateType).toBe('ESPERA_RECAMBIO')
    const after = composeCustomerUpdate(
      applyContinuityEvent(cloneInitialOrder(), 'confirm_spare_receipt').order,
    )
    expect(after.updateType).toBe('LISTO_PARA_INICIAR')
    expect(after.customerText).not.toBe(before.customerText)
  })

  it('reinicio de escenario vuelve a espera de recambio', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })
    const restored = restoreContinuityOrder()
    const update = composeCustomerUpdate(restored)
    expect(update.updateType).toBe('ESPERA_RECAMBIO')
    expect(update.ok).toBe(true)
    expectCopyable(update.customerText)
  })
})
