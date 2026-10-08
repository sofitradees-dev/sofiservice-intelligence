import { useEffect, useMemo, useState } from 'react'
import { OrderCheckpoints } from '../continuity/OrderCheckpoints'
import type { ContinuityOrder } from '../continuity/types'
import type {
  CapacityStatus,
  OperationalInfo,
  ReadinessEvaluation,
  ServiceRequest,
  SpareAvailability,
  StaffAvailability,
  WorkshopKind,
} from '../domain/types'
import { canConfirm, reconcileAfterConditionChange } from '../engine/confirmation'
import { evaluateContinuity } from '../continuity/evaluateContinuity'
import { evaluateReadiness } from '../engine/evaluateReadiness'
import { applyWorkshopSelection, workshopKindLabel } from '../domain/workshop'
import { confirmAndLink, findOrderForRequest } from './linkOrder'
import { loadAppState, restoreAppState, saveAppState } from './unifiedStore'

const PITCH_REQUEST_ID = 'REQ-DEMO-003'

const CAPACITY_OPTIONS: { value: CapacityStatus; label: string }[] = [
  { value: 'disponible', label: 'Sí' },
  { value: 'no_disponible', label: 'No' },
  { value: 'desconocida', label: 'Desconocida' },
]

const WORKSHOP_OPTIONS: { value: WorkshopKind; label: string }[] = [
  { value: 'propio', label: 'Propio' },
  { value: 'externo', label: 'Externo' },
  { value: 'no_seleccionado', label: 'No seleccionado' },
]

function decisionLabel(decision: ReadinessEvaluation['decision']): string {
  if (decision === 'CONFIRMABLE') return 'Confirmable'
  if (decision === 'NO_CONFIRMABLE') return 'No confirmable'
  return 'Verificación requerida'
}

function initialSelectedId(requests: ServiceRequest[]): string {
  return (
    requests.find((request) => request.id === PITCH_REQUEST_ID)?.id ??
    requests[0]?.id ??
    ''
  )
}

function journeyStep(
  request: ServiceRequest | null,
  evaluation: ReadinessEvaluation | null,
  order: ContinuityOrder | null,
): number {
  if (!request) return 0
  if (!evaluation) return 1
  if (request.attentionStatus !== 'confirmada' || !order) return 2
  if (!order.vehicleReceived || !order.assignmentConfirmed) return 4
  if (order.requiresSpare && !order.spareReceived) return 4
  if (!order.repairFinished) return 4
  return 5
}

export function UnifiedJourney() {
  const initial = loadAppState()
  const [requests, setRequests] = useState(initial.requests)
  const [orders, setOrders] = useState(initial.orders)
  const [selectedId, setSelectedId] = useState(initialSelectedId(initial.requests))
  const [evaluation, setEvaluation] = useState<ReadinessEvaluation | null>(null)
  const [evaluationStale, setEvaluationStale] = useState(false)
  const [message, setMessage] = useState('')
  const [showOrder, setShowOrder] = useState(false)

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  )
  const linkedOrder = selected ? findOrderForRequest(orders, selected) : undefined

  useEffect(() => {
    saveAppState({ requests, orders })
  }, [requests, orders])

  function updateSelected(patch: Partial<ServiceRequest>) {
    if (!selected) return
    const next = reconcileAfterConditionChange({ ...selected, ...patch })
    setRequests((current) =>
      current.map((request) => (request.id === next.id ? next : request)),
    )
    setEvaluation(null)
    setEvaluationStale(true)
    setShowOrder(false)
    setMessage(
      next.revalidationNeeded && selected.attentionStatus === 'confirmada'
        ? 'Las condiciones dejaron de ser válidas. La confirmación se revocó.'
        : 'Las condiciones cambiaron. La evaluación anterior ya no es vigente.',
    )
  }

  function handleConfirm() {
    if (!selected) return
    const result = confirmAndLink(selected, evaluation, orders)
    if (!result.confirm.ok) {
      setMessage(result.confirm.error ?? 'No se puede confirmar esta solicitud.')
      return
    }
    setRequests((current) =>
      current.map((request) =>
        request.id === result.confirm.request.id ? result.confirm.request : request,
      ),
    )
    setOrders(result.orders)
    setEvaluation(evaluateReadiness(result.confirm.request))
    setEvaluationStale(false)
    setShowOrder(true)
    setMessage(
      result.created
        ? 'Atención confirmada. Se creó una orden sintética vinculada. No se reservó un cupo real.'
        : 'Atención ya vinculada a una orden existente. No se duplicó.',
    )
  }

  const step = journeyStep(selected, evaluation, linkedOrder ?? null)
  const confirmEnabled = selected ? canConfirm(selected, evaluation) : false
  const workshopLocked = Boolean(linkedOrder)
  const continuityEval = linkedOrder ? evaluateContinuity(linkedOrder) : null
  const opsStatus = !selected
    ? 'Sin solicitud'
    : linkedOrder && continuityEval?.allStagesComplete
      ? 'Completado'
      : selected.attentionStatus === 'confirmada'
        ? continuityEval?.status === 'BLOQUEADO'
          ? 'Orden bloqueada'
          : 'Orden en seguimiento'
        : evaluation && !evaluationStale
          ? decisionLabel(evaluation.decision)
          : 'Pendiente de evaluación'
  const opsBlocker = !selected
    ? '—'
    : linkedOrder && continuityEval && !continuityEval.allStagesComplete
      ? continuityEval.reasons[0] ?? '—'
      : evaluation && !evaluationStale && evaluation.decision !== 'CONFIRMABLE'
        ? evaluation.reasons[0] ?? '—'
        : 'Ninguno'
  const opsNext = !selected
    ? 'Seleccione una solicitud.'
    : linkedOrder && continuityEval
      ? continuityEval.recommendedAction
      : evaluation && !evaluationStale
        ? evaluation.recommendedAction
        : 'Ejecute la evaluación de disponibilidad.'

  return (
    <div className="module">
      <ol className="journey-steps">
        {[
          'Solicitud',
          'Evaluación',
          'Confirmación',
          'Orden vinculada',
          'Checkpoints',
          'Finalización',
        ].map((label, index) => (
          <li key={label} className={index <= step ? 'active' : ''}>
            {label}
          </li>
        ))}
      </ol>

      <dl className="ops-summary">
        <div>
          <dt>Caso actual</dt>
          <dd>
            {selected
              ? `${selected.id}${linkedOrder ? ` · ${linkedOrder.id}` : ''}`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Estado operativo</dt>
          <dd>{opsStatus}</dd>
        </div>
        <div>
          <dt>Principal bloqueo</dt>
          <dd>{opsBlocker}</dd>
        </div>
        <div>
          <dt>Siguiente acción</dt>
          <dd>{opsNext}</dd>
        </div>
      </dl>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Solicitudes</h2>
              <p className="micro">Recorrido unificado de postventa simulada.</p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const restored = restoreAppState()
                setRequests(restored.requests)
                setOrders(restored.orders)
                setSelectedId(initialSelectedId(restored.requests))
                setEvaluation(null)
                setEvaluationStale(false)
                setShowOrder(false)
                setMessage('Escenario de demostración restaurado.')
              }}
            >
              Restaurar escenario
            </button>
          </div>
          <ul className="request-list">
            {requests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  className={request.id === selectedId ? 'request-card selected' : 'request-card'}
                  onClick={() => {
                    setSelectedId(request.id)
                    setEvaluation(null)
                    setEvaluationStale(false)
                    setShowOrder(request.attentionStatus === 'confirmada')
                    setMessage('')
                  }}
                >
                  <span className="card-id">{request.id}</span>
                  <strong>{request.serviceType}</strong>
                  <span className="muted">{request.vehicle}</span>
                  <span className="muted">
                    Tipo de taller: {workshopKindLabel(request.workshopKind)}
                  </span>
                  <span className="muted">Nombre: {request.workshop}</span>
                  <span className="chip chip-status">
                    {request.attentionStatus === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel detail">
          {!selected ? (
            <p>Seleccione una solicitud.</p>
          ) : (
            <>
              <h2>{selected.id}</h2>
              <dl className="facts">
                <div>
                  <dt>Vehículo</dt>
                  <dd>{selected.vehicle}</dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>{selected.serviceType}</dd>
                </div>
                <div>
                  <dt>Tipo de taller</dt>
                  <dd>
                    <span className="kind-tag">
                      {workshopKindLabel(selected.workshopKind)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Nombre del taller</dt>
                  <dd>{selected.workshop}</dd>
                </div>
                <div>
                  <dt>Orden vinculada</dt>
                  <dd>
                    <code>{selected.serviceOrderLinkId}</code>
                  </dd>
                </div>
              </dl>

              <form className="conditions" onSubmit={(event) => event.preventDefault()}>
                <label className="field">
                  Tipo de taller
                  <select
                    value={selected.workshopKind}
                    disabled={workshopLocked}
                    onChange={(event) =>
                      updateSelected(
                        applyWorkshopSelection(
                          selected,
                          event.target.value as WorkshopKind,
                        ),
                      )
                    }
                  >
                    {WORKSHOP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {workshopLocked ? (
                  <p className="hint">
                    La orden vinculada conserva el taller registrado al
                    confirmar. Un cambio posterior no altera esa asignación.
                  </p>
                ) : null}
                <label className="field">
                  Capacidad del taller
                  <select
                    value={selected.capacity}
                    onChange={(event) =>
                      updateSelected({
                        capacity: event.target.value as CapacityStatus,
                      })
                    }
                  >
                    {CAPACITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Personal técnico disponible
                  <select
                    value={selected.staffAvailability}
                    onChange={(event) =>
                      updateSelected({
                        staffAvailability: event.target.value as StaffAvailability,
                      })
                    }
                  >
                    {CAPACITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.requiresSpare}
                    onChange={(event) =>
                      updateSelected({ requiresSpare: event.target.checked })
                    }
                  />
                  El servicio requiere recambio
                </label>
                <label className="field">
                  Disponibilidad del recambio
                  <select
                    value={selected.spareAvailability}
                    disabled={!selected.requiresSpare}
                    onChange={(event) =>
                      updateSelected({
                        spareAvailability: event.target.value as SpareAvailability,
                      })
                    }
                  >
                    {CAPACITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Información operativa
                  <select
                    value={selected.operationalInfo}
                    onChange={(event) =>
                      updateSelected({
                        operationalInfo: event.target.value as OperationalInfo,
                      })
                    }
                  >
                    <option value="completa">Completa</option>
                    <option value="incompleta">Incompleta</option>
                  </select>
                </label>
              </form>

              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setEvaluation(evaluateReadiness(selected))
                    setEvaluationStale(false)
                    setMessage('')
                  }}
                >
                  Evaluar disponibilidad
                </button>
                <button
                  type="button"
                  className="confirm"
                  disabled={!confirmEnabled}
                  onClick={handleConfirm}
                >
                  Confirmar atención
                </button>
                {linkedOrder ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setShowOrder(true)}
                  >
                    Abrir seguimiento de {linkedOrder.id}
                  </button>
                ) : null}
              </div>

              {message ? <p className="notice">{message}</p> : null}

              {evaluation ? (
                <article className={`result result-${evaluation.decision.toLowerCase()}`}>
                  <p className="result-kicker">
                    {evaluationStale ? 'Evaluación no vigente' : 'Evaluación vigente'}
                  </p>
                  <p className="decision">{decisionLabel(evaluation.decision)}</p>
                  <h4>Motivos</h4>
                  <ul>
                    {evaluation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="next-action">
                    <h4>Siguiente acción operativa</h4>
                    <p>{evaluation.recommendedAction}</p>
                  </div>
                </article>
              ) : (
                <p className="hint">
                  Ejecute la evaluación. La confirmación permanece bloqueada hasta
                  un resultado CONFIRMABLE vigente.
                </p>
              )}

              {showOrder && linkedOrder ? (
                <div className="order-followup">
                  <h3>Orden {linkedOrder.id}</h3>
                  <p className="micro">
                    Tipo de taller: {workshopKindLabel(linkedOrder.workshopKind)}{' '}
                    · Nombre: {linkedOrder.workshop}
                  </p>
                  <OrderCheckpoints
                    order={linkedOrder}
                    message=""
                    onOrderChange={(next, notice) => {
                      setOrders((current) =>
                        current.map((item) => (item.id === next.id ? next : item)),
                      )
                      setMessage(notice)
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
