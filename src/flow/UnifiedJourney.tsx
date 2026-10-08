import { useEffect, useMemo, useRef, useState } from 'react'
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
import { applyWorkshopSelection } from '../domain/workshop'
import { confirmAndLink, findOrderForRequest } from './linkOrder'
import { loadAppState, restoreAppState, saveAppState } from './unifiedStore'
import { CustomerUpdatePanel } from '../updates/CustomerUpdatePanel'
import {
  advisorGuide,
  everydayDecision,
  everydayVehicle,
  everydayWorkshopKind,
} from '../ui/labels'

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
  const followupRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  )
  const linkedOrder = selected ? findOrderForRequest(orders, selected) : undefined
  const tracking = Boolean(
    selected?.attentionStatus === 'confirmada' && linkedOrder,
  )

  useEffect(() => {
    saveAppState({ requests, orders })
  }, [requests, orders])

  useEffect(() => {
    if (!tracking) return
    followupRef.current?.focus({ preventScroll: true })
  }, [tracking, selectedId, linkedOrder?.id])

  function updateSelected(patch: Partial<ServiceRequest>) {
    if (!selected) return
    const next = reconcileAfterConditionChange({ ...selected, ...patch })
    setRequests((current) =>
      current.map((request) => (request.id === next.id ? next : request)),
    )
    setEvaluation(null)
    setEvaluationStale(true)
    setMessage(
      next.revalidationNeeded && selected.attentionStatus === 'confirmada'
        ? 'Las condiciones cambiaron. Hay que volver a verificar la atención.'
        : 'Las condiciones cambiaron. Vuelva a verificar la disponibilidad.',
    )
  }

  function handleConfirm() {
    if (!selected) return
    const result = confirmAndLink(selected, evaluation, orders)
    if (!result.confirm.ok) {
      setMessage(result.confirm.error ?? 'No se puede confirmar esta atención.')
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
    setMessage(
      result.created
        ? 'Atención confirmada. Eso no significa que el vehículo ya haya llegado al taller.'
        : 'Esta atención ya tenía seguimiento. No se duplicó.',
    )
  }

  const step = journeyStep(selected, evaluation, linkedOrder ?? null)
  const confirmEnabled = selected ? canConfirm(selected, evaluation) : false
  const workshopLocked = Boolean(linkedOrder)
  const continuityEval = linkedOrder ? evaluateContinuity(linkedOrder) : null
  const guide = advisorGuide({
    request: selected,
    evaluationDecision:
      evaluation && !evaluationStale ? evaluation.decision : null,
    evaluationStale,
    evaluationWhy: evaluation?.reasons[0] ?? null,
    order: tracking ? linkedOrder ?? null : null,
    orderComplete: Boolean(continuityEval?.allStagesComplete),
    orderBlocked: continuityEval?.status === 'BLOQUEADO',
    orderWhy: continuityEval?.reasons[0] ?? null,
  })

  return (
    <div className="module">
      <ol className="journey-steps">
        {[
          'Solicitud',
          'Verificar atención',
          'Confirmar atención',
          'Seguimiento del vehículo',
          'Etapas del servicio',
          'Informar al cliente',
        ].map((label, index) => (
          <li key={label} className={index <= step ? 'active' : ''}>
            {label}
          </li>
        ))}
      </ol>

      <dl className="ops-summary">
        <div>
          <dt>Qué está pasando</dt>
          <dd>{guide.happening}</dd>
        </div>
        <div>
          <dt>Por qué</dt>
          <dd>{guide.why}</dd>
        </div>
        <div>
          <dt>Qué debo hacer ahora</dt>
          <dd>{guide.next}</dd>
        </div>
      </dl>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Solicitudes</h2>
              <p className="micro">Elija un caso para verificar si se puede atender.</p>
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
                setMessage('Demostración reiniciada.')
              }}
            >
              Reiniciar demostración
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
                    setMessage('')
                  }}
                >
                  <strong>{request.serviceType}</strong>
                  <span className="muted">{everydayVehicle(request.vehicle)}</span>
                  <span className="muted">
                    {everydayWorkshopKind(request.workshopKind)} · {request.workshop}
                  </span>
                  <span className="chip chip-status">
                    {request.attentionStatus === 'confirmada'
                      ? 'Atención confirmada'
                      : 'Pendiente'}
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
              <h2>
                {tracking
                  ? 'Seguimiento del vehículo'
                  : 'Verificar atención'}
              </h2>
              <p className="micro">{selected.serviceType}</p>
              <dl className="facts compact-facts">
                <div>
                  <dt>Vehículo</dt>
                  <dd>{everydayVehicle(selected.vehicle)}</dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>{selected.serviceType}</dd>
                </div>
                <div>
                  <dt>Taller</dt>
                  <dd>
                    <span className="kind-tag">
                      {everydayWorkshopKind(selected.workshopKind)}
                    </span>{' '}
                    {selected.workshop}
                  </dd>
                </div>
              </dl>

              <details className="tech-details">
                <summary>Detalles técnicos</summary>
                <dl className="facts">
                  <div>
                    <dt>Solicitud</dt>
                    <dd>
                      <code>{selected.id}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Seguimiento</dt>
                    <dd>
                      <code>{selected.serviceOrderLinkId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Vehículo completo</dt>
                    <dd>{selected.vehicle}</dd>
                  </div>
                </dl>
              </details>

              {tracking ? (
                <details className="tech-details">
                  <summary>Ajustar condiciones de atención</summary>
                  <ConditionsForm
                    selected={selected}
                    workshopLocked={workshopLocked}
                    onUpdate={updateSelected}
                  />
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
                      Verificar disponibilidad
                    </button>
                  </div>
                </details>
              ) : (
                <ConditionsForm
                  selected={selected}
                  workshopLocked={workshopLocked}
                  onUpdate={updateSelected}
                />
              )}

              {tracking ? null : (
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
                    Verificar disponibilidad
                  </button>
                  <button
                    type="button"
                    className="confirm"
                    disabled={!confirmEnabled}
                    onClick={handleConfirm}
                  >
                    Confirmar atención
                  </button>
                </div>
              )}

              {message ? <p className="notice">{message}</p> : null}

              {tracking ? null : evaluation ? (
                <article className={`result result-${evaluation.decision.toLowerCase()}`}>
                  <p className="result-kicker">
                    {evaluationStale
                      ? 'Hay que volver a verificar'
                      : 'Resultado de la verificación'}
                  </p>
                  <p className="decision">{everydayDecision(evaluation.decision)}</p>
                  <h4>Por qué</h4>
                  <ul>
                    {evaluation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="next-action">
                    <h4>Qué debo hacer ahora</h4>
                    <p>{guide.next}</p>
                  </div>
                </article>
              ) : (
                <p className="hint">
                  Pulse Verificar disponibilidad. No confirme hasta ver que se
                  puede atender.
                </p>
              )}

              {tracking && linkedOrder ? (
                <div
                  ref={followupRef}
                  tabIndex={-1}
                  className="order-followup focused-followup"
                >
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
                  <CustomerUpdatePanel order={linkedOrder} />
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function ConditionsForm({
  selected,
  workshopLocked,
  onUpdate,
}: {
  selected: ServiceRequest
  workshopLocked: boolean
  onUpdate: (patch: Partial<ServiceRequest>) => void
}) {
  return (
    <form className="conditions" onSubmit={(event) => event.preventDefault()}>
      <label className="field">
        Tipo de taller
        <select
          value={selected.workshopKind}
          disabled={workshopLocked}
          onChange={(event) =>
            onUpdate(
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
          El taller de este seguimiento ya quedó registrado al confirmar. Un
          cambio posterior no lo modifica.
        </p>
      ) : null}
      <label className="field">
        ¿Hay cupo en el taller?
        <select
          value={selected.capacity}
          onChange={(event) =>
            onUpdate({
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
        ¿Hay personal técnico?
        <select
          value={selected.staffAvailability}
          onChange={(event) =>
            onUpdate({
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
            onUpdate({ requiresSpare: event.target.checked })
          }
        />
        Este servicio necesita un repuesto
      </label>
      <label className="field">
        ¿El repuesto está disponible?
        <select
          value={selected.spareAvailability}
          disabled={!selected.requiresSpare}
          onChange={(event) =>
            onUpdate({
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
      <p className="hint">Disponible no significa recibido en el taller.</p>
      <label className="field">
        ¿La información está completa?
        <select
          value={selected.operationalInfo}
          onChange={(event) =>
            onUpdate({
              operationalInfo: event.target.value as OperationalInfo,
            })
          }
        >
          <option value="completa">Completa</option>
          <option value="incompleta">Incompleta</option>
        </select>
      </label>
    </form>
  )
}
