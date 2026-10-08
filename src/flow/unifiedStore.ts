import { cloneDemoRequests } from '../domain/demoData'
import type { ServiceRequest } from '../domain/types'
import { hydrateRequests } from '../storage/localStore'
import type { ContinuityOrder } from '../continuity/types'
import { ensureOrdersForConfirmedRequests } from './linkOrder'

const STORAGE_KEY = 'sofi-unified-v0.4'

export interface AppState {
  requests: ServiceRequest[]
  orders: ContinuityOrder[]
}

function isOrder(value: unknown): value is ContinuityOrder {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.requestId === 'string' &&
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

export function parseAppState(raw: unknown): AppState {
  const fallback: AppState = {
    requests: cloneDemoRequests(),
    orders: [],
  }

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const item = raw as Record<string, unknown>
  const requests = hydrateRequests(item.requests)
  const orders = Array.isArray(item.orders)
    ? item.orders.filter(isOrder)
    : []

  return {
    requests,
    orders: ensureOrdersForConfirmedRequests(requests, orders),
  }
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { requests: cloneDemoRequests(), orders: [] }
    }
    const state = parseAppState(JSON.parse(raw))
    saveAppState(state)
    return state
  } catch {
    return { requests: cloneDemoRequests(), orders: [] }
  }
}

export function saveAppState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function restoreAppState(): AppState {
  const state = { requests: cloneDemoRequests(), orders: [] }
  saveAppState(state)
  return state
}
