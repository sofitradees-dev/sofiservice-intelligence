import { describe, expect, it } from 'vitest'
import { DEMO_REQUESTS, cloneDemoRequests } from '../domain/demoData'
import type { ServiceRequest } from '../domain/types'
import {
  canConfirm,
  confirmRequest,
  isEvaluationCurrent,
  reconcileAfterConditionChange,
} from './confirmation'
import { evaluateReadiness } from './evaluateReadiness'
import { hydrateRequests, restoreDemoRequests } from '../storage/localStore'

function baseFavorable(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'REQ-TEST',
    vehicle: 'Vehículo de prueba',
    serviceType: 'Servicio de prueba',
    workshop: 'Taller de prueba',
    capacity: 'disponible',
    requiresSpare: true,
    spareAvailability: 'disponible',
    operationalInfo: 'completa',
    attentionStatus: 'pendiente',
    serviceOrderLinkId: 'OS-LINK-REQ-TEST',
    revalidationNeeded: false,
    ...overrides,
  }
}

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

describe('evaluateReadiness', () => {
  it('todas las condiciones favorables → CONFIRMABLE', () => {
    const result = evaluateReadiness(baseFavorable())
    expect(result.decision).toBe('CONFIRMABLE')
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.recommendedAction).toMatch(/confirmable|confirmación/i)
  })

  it('sin cupo → NO_CONFIRMABLE', () => {
    const result = evaluateReadiness(
      baseFavorable({ capacity: 'no_disponible' }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.reasons.some((reason) => /cupo/i.test(reason))).toBe(true)
  })

  it('sin recambio obligatorio → NO_CONFIRMABLE', () => {
    const result = evaluateReadiness(
      baseFavorable({
        requiresSpare: true,
        spareAvailability: 'no_disponible',
      }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.reasons.some((reason) => /recambio/i.test(reason))).toBe(
      true,
    )
  })

  it('capacidad desconocida → VERIFICACION_REQUERIDA', () => {
    const result = evaluateReadiness(
      baseFavorable({ capacity: 'desconocida' }),
    )
    expect(result.decision).toBe('VERIFICACION_REQUERIDA')
  })

  it('información incompleta → VERIFICACION_REQUERIDA', () => {
    const result = evaluateReadiness(
      baseFavorable({ operationalInfo: 'incompleta' }),
    )
    expect(result.decision).toBe('VERIFICACION_REQUERIDA')
  })

  it('servicio que no requiere recambio no bloquea aunque el recambio figure no disponible', () => {
    const result = evaluateReadiness(
      baseFavorable({
        requiresSpare: false,
        spareAvailability: 'no_disponible',
      }),
    )
    expect(result.decision).toBe('CONFIRMABLE')
    expect(result.reasons.some((reason) => /no requiere recambio/i.test(reason))).toBe(
      true,
    )
  })

  it('bloqueo negativo y dato desconocido → NO_CONFIRMABLE con ambos motivos', () => {
    const result = evaluateReadiness(
      baseFavorable({
        capacity: 'no_disponible',
        operationalInfo: 'incompleta',
      }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.reasons.some((reason) => /cupo/i.test(reason))).toBe(true)
    expect(
      result.reasons.some((reason) => /información operativa/i.test(reason)),
    ).toBe(true)
  })

  it('corregir un bloqueo cambia la decisión', () => {
    const blocked = baseFavorable({ capacity: 'no_disponible' })
    expect(evaluateReadiness(blocked).decision).toBe('NO_CONFIRMABLE')

    const corrected = { ...blocked, capacity: 'disponible' as const }
    expect(evaluateReadiness(corrected).decision).toBe('CONFIRMABLE')
  })

  it('los datos de demostración cubren los cinco escenarios base', () => {
    const decisions = DEMO_REQUESTS.map(
      (request) => evaluateReadiness(request).decision,
    )
    expect(decisions).toEqual([
      'CONFIRMABLE',
      'NO_CONFIRMABLE',
      'NO_CONFIRMABLE',
      'VERIFICACION_REQUERIDA',
      'VERIFICACION_REQUERIDA',
    ])
  })
})

describe('recomendación operativa contextual', () => {
  it('solo falta cupo: no menciona recambio ni lo da por resuelto', () => {
    const result = evaluateReadiness(
      baseFavorable({
        capacity: 'no_disponible',
        requiresSpare: false,
      }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.recommendedAction).toMatch(/disponibilidad del taller/i)
    expect(result.recommendedAction).not.toMatch(/recambio/i)
  })

  it('REQ-DEMO-003: cupo disponible y recambio obligatorio no disponible', () => {
    const request = DEMO_REQUESTS.find((item) => item.id === 'REQ-DEMO-003')
    expect(request).toBeDefined()
    if (!request) {
      return
    }

    const result = evaluateReadiness(request)
    expect(request.capacity).toBe('disponible')
    expect(request.requiresSpare).toBe(true)
    expect(request.spareAvailability).toBe('no_disponible')
    expect(request.operationalInfo).toBe('completa')
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toMatch(/recambio/i)
    expect(result.reasons.some((reason) => /cupo/i.test(reason))).toBe(false)
    expect(result.recommendedAction).toMatch(/suministro del recambio/i)
    expect(result.recommendedAction).not.toMatch(/cupo/i)
    expect(result.recommendedAction).not.toMatch(/disponibilidad del taller/i)
    expect(canConfirm(request, result)).toBe(false)
  })

  it('faltan cupo y recambio: indica ambos bloqueos', () => {
    const result = evaluateReadiness(
      baseFavorable({
        capacity: 'no_disponible',
        requiresSpare: true,
        spareAvailability: 'no_disponible',
      }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.recommendedAction).toMatch(/ambas condiciones/i)
    expect(result.recommendedAction).toMatch(/cupo/i)
    expect(result.recommendedAction).toMatch(/recambio/i)
  })

  it('capacidad desconocida: pide verificación y no la trata como disponible', () => {
    const result = evaluateReadiness(
      baseFavorable({ capacity: 'desconocida' }),
    )
    expect(result.decision).toBe('VERIFICACION_REQUERIDA')
    expect(result.recommendedAction).toMatch(/capacidad del taller/i)
    expect(result.recommendedAction).toMatch(/no tratar/i)
    expect(result.recommendedAction).not.toMatch(/consultar otra disponibilidad/i)
  })

  it('información operativa incompleta: pide completar datos', () => {
    const result = evaluateReadiness(
      baseFavorable({ operationalInfo: 'incompleta' }),
    )
    expect(result.decision).toBe('VERIFICACION_REQUERIDA')
    expect(result.recommendedAction).toMatch(/información operativa/i)
    expect(result.recommendedAction).toMatch(/completar/i)
  })

  it('todas las condiciones verificadas: confirmable con confirmación manual', () => {
    const result = evaluateReadiness(baseFavorable())
    expect(result.decision).toBe('CONFIRMABLE')
    expect(result.recommendedAction).toMatch(/confirmable/i)
    expect(result.recommendedAction).toMatch(/confirmación manual/i)
  })

  it('bloqueo confirmado y dato desconocido: NO_CONFIRMABLE con ambas acciones', () => {
    const result = evaluateReadiness(
      baseFavorable({
        capacity: 'no_disponible',
        operationalInfo: 'incompleta',
      }),
    )
    expect(result.decision).toBe('NO_CONFIRMABLE')
    expect(result.recommendedAction).toMatch(/consultar otra disponibilidad/i)
    expect(result.recommendedAction).toMatch(/verificar/i)
    expect(result.recommendedAction).toMatch(/información operativa/i)
  })

  it('solicitud ya confirmada: no recomienda confirmar de nuevo', () => {
    const result = evaluateReadiness(
      baseFavorable({ attentionStatus: 'confirmada' }),
    )
    expect(result.decision).toBe('CONFIRMABLE')
    expect(result.recommendedAction).toMatch(/ya está confirmada/i)
    expect(result.recommendedAction).not.toMatch(/confirmación manual/i)
    expect(canConfirm(baseFavorable({ attentionStatus: 'confirmada' }), result)).toBe(
      false,
    )
  })
})

describe('confirmación manual', () => {
  it('no se puede confirmar una solicitud no confirmable', () => {
    const request = baseFavorable({ capacity: 'no_disponible' })
    const evaluation = evaluateReadiness(request)

    expect(canConfirm(request, evaluation)).toBe(false)

    const result = confirmRequest(request, evaluation)
    expect(result.ok).toBe(false)
    expect(result.request.attentionStatus).toBe('pendiente')
    expect(result.error).toBeDefined()
  })

  it('confirmación bloqueada sin evaluación válida', () => {
    const request = baseFavorable()

    expect(canConfirm(request, null)).toBe(false)
    expect(confirmRequest(request, null).ok).toBe(false)
    expect(confirmRequest(request, undefined).ok).toBe(false)
  })

  it('invalidación de evaluación al editar una condición', () => {
    const request = baseFavorable()
    const evaluation = evaluateReadiness(request)

    expect(isEvaluationCurrent(request, evaluation)).toBe(true)

    const edited = { ...request, operationalInfo: 'incompleta' as const }
    expect(isEvaluationCurrent(edited, evaluation)).toBe(false)
    expect(canConfirm(edited, evaluation)).toBe(false)
    expect(confirmRequest(edited, evaluation).ok).toBe(false)
  })

  it('una confirmación válida se invalida si cambian las condiciones necesarias', () => {
    const request = baseFavorable()
    const confirmed = confirmRequest(request, evaluateReadiness(request))
    expect(confirmed.ok).toBe(true)
    expect(confirmed.request.attentionStatus).toBe('confirmada')

    const degraded = reconcileAfterConditionChange({
      ...confirmed.request,
      capacity: 'no_disponible',
    })

    expect(degraded.attentionStatus).toBe('pendiente')
    expect(degraded.revalidationNeeded).toBe(true)
    expect(evaluateReadiness(degraded).decision).toBe('NO_CONFIRMABLE')
  })

  it('reevaluación correcta después de resolver un bloqueo', () => {
    const blocked = baseFavorable({
      requiresSpare: true,
      spareAvailability: 'no_disponible',
    })
    expect(evaluateReadiness(blocked).decision).toBe('NO_CONFIRMABLE')
    expect(canConfirm(blocked, evaluateReadiness(blocked))).toBe(false)

    const resolved = { ...blocked, spareAvailability: 'disponible' as const }
    const evaluation = evaluateReadiness(resolved)
    expect(evaluation.decision).toBe('CONFIRMABLE')
    expect(canConfirm(resolved, evaluation)).toBe(true)
    expect(confirmRequest(resolved, evaluation).ok).toBe(true)
  })
})

describe('persistencia', () => {
  it('revoca confirmaciones inválidas al hidratar', () => {
    const invalidConfirmed = {
      ...baseFavorable({
        capacity: 'no_disponible',
        attentionStatus: 'confirmada',
      }),
    }

    const hydrated = hydrateRequests([invalidConfirmed])
    expect(hydrated).toHaveLength(1)
    expect(hydrated[0]?.attentionStatus).toBe('pendiente')
    expect(hydrated[0]?.revalidationNeeded).toBe(true)
  })

  it('conserva una confirmación solo si las condiciones siguen siendo CONFIRMABLE', () => {
    const validConfirmed = {
      ...baseFavorable({ attentionStatus: 'confirmada' }),
    }

    const hydrated = hydrateRequests([validConfirmed])
    expect(hydrated[0]?.attentionStatus).toBe('confirmada')
    expect(hydrated[0]?.revalidationNeeded).toBe(false)
  })

  it('descarta datos corruptos y restaura el conjunto de demostración', () => {
    expect(hydrateRequests('no-es-un-arreglo')).toEqual(cloneDemoRequests())
    expect(hydrateRequests([])).toEqual(cloneDemoRequests())
    expect(hydrateRequests([{ id: 123 }])).toEqual(cloneDemoRequests())
  })

  it('restaura correctamente los datos simulados', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })

    const restored = restoreDemoRequests()
    expect(restored).toEqual(cloneDemoRequests())
    expect(restored.every((request) => request.attentionStatus === 'pendiente')).toBe(
      true,
    )
  })
})
