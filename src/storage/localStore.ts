import { cloneDemoRequests } from '../domain/demoData'
import type {
  AttentionStatus,
  CapacityStatus,
  OperationalInfo,
  ServiceRequest,
  SpareAvailability,
  StaffAvailability,
  WorkshopKind,
} from '../domain/types'
import { reconcileAfterConditionChange } from '../engine/confirmation'

const STORAGE_KEY = 'sofi-service-readiness-v0.4'

const CAPACITY: ReadonlySet<string> = new Set([
  'disponible',
  'no_disponible',
  'desconocida',
])
const SPARE: ReadonlySet<string> = new Set([
  'disponible',
  'no_disponible',
  'desconocida',
])
const INFO: ReadonlySet<string> = new Set(['completa', 'incompleta'])
const ATTENTION: ReadonlySet<string> = new Set(['pendiente', 'confirmada'])
const WORKSHOP: ReadonlySet<string> = new Set([
  'propio',
  'externo',
  'no_seleccionado',
])

export function parseStoredRequest(value: unknown): ServiceRequest | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Record<string, unknown>

  if (
    typeof item.id !== 'string' ||
    typeof item.vehicle !== 'string' ||
    typeof item.serviceType !== 'string' ||
    typeof item.workshop !== 'string' ||
    typeof item.requiresSpare !== 'boolean' ||
    typeof item.serviceOrderLinkId !== 'string' ||
    !CAPACITY.has(String(item.capacity)) ||
    !SPARE.has(String(item.spareAvailability)) ||
    !INFO.has(String(item.operationalInfo)) ||
    !ATTENTION.has(String(item.attentionStatus))
  ) {
    return null
  }

  const workshopKind = WORKSHOP.has(String(item.workshopKind))
    ? (item.workshopKind as WorkshopKind)
    : 'propio'
  const staffAvailability = CAPACITY.has(String(item.staffAvailability))
    ? (item.staffAvailability as StaffAvailability)
    : 'disponible'

  return {
    id: item.id,
    vehicle: item.vehicle,
    serviceType: item.serviceType,
    workshop: item.workshop,
    workshopKind,
    capacity: item.capacity as CapacityStatus,
    staffAvailability,
    requiresSpare: item.requiresSpare,
    spareAvailability: item.spareAvailability as SpareAvailability,
    operationalInfo: item.operationalInfo as OperationalInfo,
    attentionStatus: item.attentionStatus as AttentionStatus,
    serviceOrderLinkId: item.serviceOrderLinkId,
    revalidationNeeded: Boolean(item.revalidationNeeded),
  }
}

export function hydrateRequests(raw: unknown): ServiceRequest[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDemoRequests()
  }

  const parsed = raw
    .map(parseStoredRequest)
    .filter((request): request is ServiceRequest => request !== null)

  if (parsed.length === 0) {
    return cloneDemoRequests()
  }

  return parsed.map(reconcileAfterConditionChange)
}

export function loadRequests(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return cloneDemoRequests()
    }

    const hydrated = hydrateRequests(JSON.parse(raw))
    saveRequests(hydrated)
    return hydrated
  } catch {
    return cloneDemoRequests()
  }
}

export function saveRequests(requests: ServiceRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
}

export function restoreDemoRequests(): ServiceRequest[] {
  const requests = cloneDemoRequests()
  saveRequests(requests)
  return requests
}
