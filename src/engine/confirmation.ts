import type {
  ConfirmResult,
  ReadinessEvaluation,
  ServiceRequest,
} from '../domain/types'
import { evaluateReadiness } from './evaluateReadiness'

export function isEvaluationCurrent(
  request: ServiceRequest,
  evaluation: ReadinessEvaluation | null | undefined,
): boolean {
  if (!evaluation) {
    return false
  }

  const current = evaluateReadiness(request)

  return (
    current.decision === evaluation.decision &&
    current.recommendedAction === evaluation.recommendedAction &&
    current.reasons.length === evaluation.reasons.length &&
    current.reasons.every((reason, index) => reason === evaluation.reasons[index])
  )
}

export function canConfirm(
  request: ServiceRequest,
  evaluation: ReadinessEvaluation | null | undefined,
): boolean {
  return Boolean(
    evaluation &&
      isEvaluationCurrent(request, evaluation) &&
      evaluation.decision === 'CONFIRMABLE' &&
      request.attentionStatus !== 'confirmada',
  )
}

export function confirmRequest(
  request: ServiceRequest,
  evaluation: ReadinessEvaluation | null | undefined,
): ConfirmResult {
  if (!canConfirm(request, evaluation)) {
    return {
      ok: false,
      request,
      error:
        'No se puede confirmar sin una evaluación vigente y CONFIRMABLE.',
    }
  }

  return {
    ok: true,
    request: {
      ...request,
      attentionStatus: 'confirmada',
      revalidationNeeded: false,
    },
  }
}

export function reconcileAfterConditionChange(
  request: ServiceRequest,
): ServiceRequest {
  const evaluation = evaluateReadiness(request)

  if (
    request.attentionStatus === 'confirmada' &&
    evaluation.decision !== 'CONFIRMABLE'
  ) {
    return {
      ...request,
      attentionStatus: 'pendiente',
      revalidationNeeded: true,
    }
  }

  return request
}
