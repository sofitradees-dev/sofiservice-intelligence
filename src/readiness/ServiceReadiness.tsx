import { useEffect, useMemo, useState } from 'react'
import type {
  CapacityStatus,
  OperationalInfo,
  ReadinessEvaluation,
  ServiceRequest,
  SpareAvailability,
} from '../domain/types'
import {
  canConfirm,
  confirmRequest,
  reconcileAfterConditionChange,
} from '../engine/confirmation'
import { evaluateReadiness } from '../engine/evaluateReadiness'
import {
  loadRequests,
  restoreDemoRequests,
  saveRequests,
} from '../storage/localStore'

const CAPACITY_OPTIONS: { value: CapacityStatus; label: string }[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'no_disponible', label: 'No disponible' },
  { value: 'desconocida', label: 'Desconocida' },
]

const SPARE_OPTIONS: { value: SpareAvailability; label: string }[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'no_disponible', label: 'No disponible' },
  { value: 'desconocida', label: 'Desconocida' },
]

const INFO_OPTIONS: { value: OperationalInfo; label: string }[] = [
  { value: 'completa', label: 'Completa' },
  { value: 'incompleta', label: 'Incompleta' },
]

type ConditionTone = 'ok' | 'block' | 'pending' | 'na'

function decisionLabel(decision: ReadinessEvaluation['decision']): string {
  switch (decision) {
    case 'CONFIRMABLE':
      return 'Confirmable'
    case 'NO_CONFIRMABLE':
      return 'No confirmable'
    case 'VERIFICACION_REQUERIDA':
      return 'Verificación requerida'
  }
}

function toneForCapacity(value: CapacityStatus): ConditionTone {
  if (value === 'disponible') return 'ok'
  if (value === 'no_disponible') return 'block'
  return 'pending'
}

function toneForSpare(
  requiresSpare: boolean,
  value: SpareAvailability,
): ConditionTone {
  if (!requiresSpare) return 'na'
  if (value === 'disponible') return 'ok'
  if (value === 'no_disponible') return 'block'
  return 'pending'
}

function toneForInfo(value: OperationalInfo): ConditionTone {
  return value === 'completa' ? 'ok' : 'pending'
}

function attentionLabel(request: ServiceRequest): string {
  if (request.attentionStatus === 'confirmada') return 'Confirmada'
  if (request.revalidationNeeded) return 'Pendiente de nueva revisión'
  return 'Pendiente'
}

export function ServiceReadiness() {
  const [requests, setRequests] = useState<ServiceRequest[]>(() => loadRequests())
  const [selectedId, setSelectedId] = useState<string>(
    () => loadRequests()[0]?.id ?? '',
  )
  const [evaluation, setEvaluation] = useState<ReadinessEvaluation | null>(null)
  const [evaluationStale, setEvaluationStale] = useState(false)
  const [message, setMessage] = useState<string>('')

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  )

  useEffect(() => {
    saveRequests(requests)
  }, [requests])

  function updateSelected(patch: Partial<ServiceRequest>) {
    if (!selected) {
      return
    }

    const next = reconcileAfterConditionChange({ ...selected, ...patch })
    setRequests((current) =>
      current.map((request) => (request.id === next.id ? next : request)),
    )
    setEvaluation(null)
    setEvaluationStale(true)
    setMessage(
      next.revalidationNeeded && selected.attentionStatus === 'confirmada'
        ? 'Las condiciones dejaron de ser válidas. La confirmación se revocó y queda pendiente de nueva revisión.'
        : 'Las condiciones cambiaron. La evaluación anterior ya no es vigente.',
    )
  }

  function handleEvaluate() {
    if (!selected) {
      return
    }
    setEvaluation(evaluateReadiness(selected))
    setEvaluationStale(false)
    setMessage('')
  }

  function handleConfirm() {
    if (!selected) {
      return
    }

    const result = confirmRequest(selected, evaluation)
    if (!result.ok) {
      setMessage(result.error ?? 'No se puede confirmar esta solicitud.')
      return
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === result.request.id ? result.request : request,
      ),
    )
    setEvaluation(evaluateReadiness(result.request))
    setEvaluationStale(false)
    setMessage('Atención confirmada de forma explícita por el asesor.')
  }

  function handleRestore() {
    const restored = restoreDemoRequests()
    setRequests(restored)
    setSelectedId(restored[0]?.id ?? '')
    setEvaluation(null)
    setEvaluationStale(false)
    setMessage('Datos de demostración restaurados.')
  }

  const confirmEnabled = selected ? canConfirm(selected, evaluation) : false

  return (
    <div className="module">
      <main className="layout">
        <section className="panel" aria-labelledby="list-title">
          <div className="panel-header">
            <div>
              <h2 id="list-title">Solicitudes</h2>
              <p className="micro">
                Los indicadores reflejan las condiciones actuales, no una
                evaluación ejecutada.
              </p>
            </div>
            <button type="button" className="ghost" onClick={handleRestore}>
              Restaurar demo
            </button>
          </div>
          <ul className="request-list">
            {requests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  className={
                    request.id === selectedId
                      ? 'request-card selected'
                      : 'request-card'
                  }
                  onClick={() => {
                    setSelectedId(request.id)
                    setEvaluation(null)
                    setEvaluationStale(false)
                    setMessage('')
                  }}
                >
                  <span className="card-id">{request.id}</span>
                  <strong>{request.serviceType}</strong>
                  <span className="muted">{request.vehicle}</span>
                  <span className="muted">{request.workshop}</span>
                  <span className="chip-row">
                    <span className={`dot tone-${toneForCapacity(request.capacity)}`}>
                      Cupo
                    </span>
                    <span
                      className={`dot tone-${toneForSpare(request.requiresSpare, request.spareAvailability)}`}
                    >
                      Recambio
                    </span>
                    <span className={`dot tone-${toneForInfo(request.operationalInfo)}`}>
                      Info
                    </span>
                    <span className="chip chip-status">
                      {attentionLabel(request)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel detail" aria-labelledby="detail-title">
          {!selected ? (
            <p>Seleccione una solicitud.</p>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <h2 id="detail-title">{selected.id}</h2>
                  <p className="link-id">
                    Asociación futura a orden:{' '}
                    <code>{selected.serviceOrderLinkId}</code>
                  </p>
                </div>
                <p className={`status-pill ${selected.attentionStatus}`}>
                  {attentionLabel(selected)}
                </p>
              </div>

              <dl className="facts">
                <div>
                  <dt>Vehículo</dt>
                  <dd>{selected.vehicle}</dd>
                </div>
                <div>
                  <dt>Tipo de servicio</dt>
                  <dd>{selected.serviceType}</dd>
                </div>
                <div>
                  <dt>Taller</dt>
                  <dd>{selected.workshop}</dd>
                </div>
              </dl>

              <div className="workspace">
                <div>
                  <h3>Condiciones simuladas</h3>
                  <form
                    className="conditions"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <label className={`field tone-${toneForCapacity(selected.capacity)}`}>
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

                    <label
                      className={`field tone-${toneForSpare(selected.requiresSpare, selected.spareAvailability)}`}
                    >
                      Disponibilidad del recambio
                      <select
                        value={selected.spareAvailability}
                        disabled={!selected.requiresSpare}
                        onChange={(event) =>
                          updateSelected({
                            spareAvailability: event.target
                              .value as SpareAvailability,
                          })
                        }
                      >
                        {SPARE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label
                      className={`field tone-${toneForInfo(selected.operationalInfo)}`}
                    >
                      Información operativa
                      <select
                        value={selected.operationalInfo}
                        onChange={(event) =>
                          updateSelected({
                            operationalInfo: event.target
                              .value as OperationalInfo,
                          })
                        }
                      >
                        {INFO_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </form>

                  <div className="legend">
                    <span className="dot tone-ok">Verificada</span>
                    <span className="dot tone-block">Bloqueo</span>
                    <span className="dot tone-pending">Pendiente</span>
                    <span className="dot tone-na">No aplica</span>
                  </div>

                  <div className="actions">
                    <button type="button" className="primary" onClick={handleEvaluate}>
                      {evaluation ? 'Reevaluar disponibilidad' : 'Evaluar disponibilidad'}
                    </button>
                    <button
                      type="button"
                      className="confirm"
                      onClick={handleConfirm}
                      disabled={!confirmEnabled}
                    >
                      Confirmar atención
                    </button>
                  </div>
                </div>

                <aside className="evaluation-column">
                  {message ? <p className="notice">{message}</p> : null}

                  {evaluation ? (
                    <article
                      className={`result result-${evaluation.decision.toLowerCase()}`}
                    >
                      <p className="result-kicker">Evaluación vigente</p>
                      <h3>Resultado</h3>
                      <p className="decision">
                        {decisionLabel(evaluation.decision)}
                      </p>
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
                      <p className="footnote">
                        La decisión usa únicamente los valores simulados de
                        esta solicitud. No consulta inventario físico ni
                        sistemas internos.
                      </p>
                    </article>
                  ) : (
                    <article className="result result-idle">
                      <p className="result-kicker">
                        {evaluationStale
                          ? 'Evaluación no vigente'
                          : 'Sin evaluación vigente'}
                      </p>
                      <h3>Resultado</h3>
                      <p className="decision idle">Pendiente de ejecución</p>
                      <p>
                        {evaluationStale
                          ? 'Las condiciones se modificaron. Ejecute una nueva evaluación para obtener una decisión actual.'
                          : 'Ejecute la evaluación para ver la decisión, los motivos y la acción recomendada. La confirmación permanece bloqueada hasta entonces.'}
                      </p>
                    </article>
                  )}
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
