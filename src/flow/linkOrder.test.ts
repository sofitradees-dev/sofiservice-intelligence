import { describe, expect, it } from 'vitest'
import { cloneDemoRequests } from '../domain/demoData'
import { evaluateReadiness } from '../engine/evaluateReadiness'
import { canConfirm } from '../engine/confirmation'
import {
  confirmAndLink,
  ensureLinkedOrder,
  ensureOrdersForConfirmedRequests,
} from './linkOrder'
import { parseAppState, restoreAppState } from './unifiedStore'

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

describe('vinculación solicitud-orden', () => {
  it('confirmación inválida no crea orden', () => {
    const request = cloneDemoRequests()[1]
    const evaluation = evaluateReadiness(request)
    expect(canConfirm(request, evaluation)).toBe(false)
    const result = confirmAndLink(request, evaluation, [])
    expect(result.confirm.ok).toBe(false)
    expect(result.created).toBe(false)
    expect(result.orders).toHaveLength(0)
  })

  it('vinculación correcta al confirmar', () => {
    const request = cloneDemoRequests()[0]
    const evaluation = evaluateReadiness(request)
    const result = confirmAndLink(request, evaluation, [])
    expect(result.confirm.ok).toBe(true)
    expect(result.created).toBe(true)
    expect(result.order?.id).toBe(request.serviceOrderLinkId)
    expect(result.order?.requestId).toBe(request.id)
    expect(result.order?.vehicle).toBe(request.vehicle)
    expect(result.order?.workshopKind).toBe('propio')
    expect(result.order?.vehicleReceived).toBe(false)
  })

  it('no duplica la orden', () => {
    const request = cloneDemoRequests()[0]
    const evaluation = evaluateReadiness(request)
    const first = confirmAndLink(request, evaluation, [])
    const second = ensureLinkedOrder(first.confirm.request, first.orders)
    expect(second.created).toBe(false)
    expect(second.orders).toHaveLength(1)
    const again = confirmAndLink(first.confirm.request, evaluation, first.orders)
    expect(again.confirm.ok).toBe(false)
    expect(again.orders).toHaveLength(1)
  })

  it('rehidrata órdenes de solicitudes confirmadas', () => {
    const request = {
      ...cloneDemoRequests()[0],
      attentionStatus: 'confirmada' as const,
    }
    const orders = ensureOrdersForConfirmedRequests([request], [])
    expect(orders).toHaveLength(1)
    expect(orders[0]?.id).toBe(request.serviceOrderLinkId)
  })

  it('una orden creada no cambia de taller en silencio', () => {
    const request = cloneDemoRequests()[2]
    const evaluation = evaluateReadiness(request)
    expect(request.workshopKind).toBe('externo')
    const first = confirmAndLink(request, evaluation, [])
    expect(first.created).toBe(true)
    expect(first.order?.workshopKind).toBe('externo')
    expect(first.order?.workshop).toBe(request.workshop)
    expect(first.order?.vehicleReceived).toBe(false)
    expect(first.order?.repairStarted).toBe(false)

    const mutated = {
      ...first.confirm.request,
      workshopKind: 'propio' as const,
      workshop: 'Taller propio simulado (selección de demostración)',
    }
    const again = ensureLinkedOrder(mutated, first.orders)
    expect(again.created).toBe(false)
    expect(again.order.workshopKind).toBe('externo')
    expect(again.order.workshop).toBe(request.workshop)
    expect(again.orders).toHaveLength(1)
  })

  it('restaurar escenario y persistencia al recargar', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })
    const restored = restoreAppState()
    expect(restored.orders).toHaveLength(0)
    expect(restored.requests[0]?.attentionStatus).toBe('pendiente')

    const parsed = parseAppState({
      requests: restored.requests.map((request, index) =>
        index === 0 ? { ...request, attentionStatus: 'confirmada' } : request,
      ),
      orders: [],
    })
    expect(parsed.orders).toHaveLength(1)
    expect(parsed.orders[0]?.requestId).toBe('REQ-DEMO-001')
  })

  it('persiste checkpoints y taller de la orden al recargar', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })
    const request = cloneDemoRequests()[2]
    const linked = confirmAndLink(request, evaluateReadiness(request), [])
    const progressed = {
      ...linked.order!,
      vehicleReceived: true,
      assignmentConfirmed: true,
    }
    const parsed = parseAppState({
      requests: [linked.confirm.request],
      orders: [progressed],
    })
    expect(parsed.orders).toHaveLength(1)
    expect(parsed.orders[0]?.workshopKind).toBe('externo')
    expect(parsed.orders[0]?.vehicleReceived).toBe(true)
    expect(parsed.orders[0]?.assignmentConfirmed).toBe(true)
    expect(parsed.orders[0]?.repairStarted).toBe(false)
  })
})
