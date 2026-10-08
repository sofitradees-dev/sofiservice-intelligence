import type { ContinuityOrder } from '../continuity/types'
import { confirmRequest } from '../engine/confirmation'
import type {
  ConfirmResult,
  ReadinessEvaluation,
  ServiceRequest,
} from '../domain/types'

export function buildOrderFromRequest(request: ServiceRequest): ContinuityOrder {
  return {
    id: request.serviceOrderLinkId,
    requestId: request.id,
    vehicle: request.vehicle,
    serviceType: request.serviceType,
    workshop: request.workshop,
    workshopKind: request.workshopKind,
    requiresSpare: request.requiresSpare,
    vehicleReceived: false,
    assignmentConfirmed: false,
    spareReceived: false,
    repairStarted: false,
    repairFinished: false,
  }
}

export function findOrderForRequest(
  orders: ContinuityOrder[],
  request: ServiceRequest,
): ContinuityOrder | undefined {
  return orders.find(
    (order) =>
      order.id === request.serviceOrderLinkId || order.requestId === request.id,
  )
}

export function ensureLinkedOrder(
  request: ServiceRequest,
  orders: ContinuityOrder[],
): { orders: ContinuityOrder[]; order: ContinuityOrder; created: boolean } {
  const existing = findOrderForRequest(orders, request)
  if (existing) {
    return { orders, order: existing, created: false }
  }

  const order = buildOrderFromRequest(request)
  return { orders: [...orders, order], order, created: true }
}

export function confirmAndLink(
  request: ServiceRequest,
  evaluation: ReadinessEvaluation | null | undefined,
  orders: ContinuityOrder[],
): {
  confirm: ConfirmResult
  orders: ContinuityOrder[]
  order: ContinuityOrder | null
  created: boolean
} {
  const confirm = confirmRequest(request, evaluation)
  if (!confirm.ok) {
    return { confirm, orders, order: findOrderForRequest(orders, request) ?? null, created: false }
  }

  const linked = ensureLinkedOrder(confirm.request, orders)
  return {
    confirm,
    orders: linked.orders,
    order: linked.order,
    created: linked.created,
  }
}

export function ensureOrdersForConfirmedRequests(
  requests: ServiceRequest[],
  orders: ContinuityOrder[],
): ContinuityOrder[] {
  return requests.reduce((current, request) => {
    if (request.attentionStatus !== 'confirmada') {
      return current
    }
    return ensureLinkedOrder(request, current).orders
  }, orders)
}
