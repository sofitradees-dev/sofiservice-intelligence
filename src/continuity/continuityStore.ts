import { cloneInitialOrder } from './demoOrder'
import type { ContinuityOrder } from './types'

const STORAGE_KEY = 'sofi-service-continuity-v0.3'

function isOrder(value: unknown): value is ContinuityOrder {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    item.id === 'OS-DEMO-001' &&
    typeof item.vehicle === 'string' &&
    typeof item.serviceType === 'string' &&
    typeof item.workshop === 'string' &&
    typeof item.requiresSpare === 'boolean' &&
    typeof item.vehicleReceived === 'boolean' &&
    typeof item.assignmentConfirmed === 'boolean' &&
    typeof item.spareReceived === 'boolean' &&
    typeof item.repairStarted === 'boolean' &&
    typeof item.repairFinished === 'boolean'
  )
}

export function loadContinuityOrder(): ContinuityOrder {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return cloneInitialOrder()
    }

    const parsed: unknown = JSON.parse(raw)
    return isOrder(parsed) ? parsed : cloneInitialOrder()
  } catch {
    return cloneInitialOrder()
  }
}

export function saveContinuityOrder(order: ContinuityOrder): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
}

export function restoreContinuityOrder(): ContinuityOrder {
  const order = cloneInitialOrder()
  saveContinuityOrder(order)
  return order
}
