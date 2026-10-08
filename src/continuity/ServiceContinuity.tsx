import { useEffect, useMemo, useState } from 'react'
import {
  loadContinuityOrder,
  restoreContinuityOrder,
  saveContinuityOrder,
} from './continuityStore'
import {
  applyContinuityEvent,
  canApplyEvent,
  evaluateContinuity,
  isStageComplete,
  STAGE_SEQUENCE,
} from './evaluateContinuity'
import type { ContinuityEvent } from './types'

export function ServiceContinuity() {
  const [order, setOrder] = useState(() => loadContinuityOrder())
  const [message, setMessage] = useState('')

  const evaluation = useMemo(() => evaluateContinuity(order), [order])

  useEffect(() => {
    saveContinuityOrder(order)
  }, [order])

  function apply(event: ContinuityEvent, successMessage: string) {
    const result = applyContinuityEvent(order, event)
    if (!result.ok) {
      setMessage(result.error ?? 'Transición no permitida.')
      return
    }
    setOrder(result.order)
    setMessage(successMessage)
  }

  return (
    <div className="module">
      <main className="layout continuity-layout">
        <section className="panel" aria-labelledby="order-title">
          <div className="panel-header">
            <div>
              <p className="card-id">{order.id}</p>
              <h2 id="order-title">Service Continuity</h2>
              <p className="micro">
                Una orden sintética. Las etapas solo avanzan con una acción
                explícita.
              </p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setOrder(restoreContinuityOrder())
                setMessage('Escenario inicial restaurado.')
              }}
            >
              Restaurar escenario
            </button>
          </div>

          <dl className="facts">
            <div>
              <dt>Vehículo</dt>
              <dd>{order.vehicle}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{order.serviceType}</dd>
            </div>
            <div>
              <dt>Taller</dt>
              <dd>{order.workshop}</dd>
            </div>
          </dl>

          <ol className="timeline">
            {STAGE_SEQUENCE.map((stage) => {
              const complete = isStageComplete(order, stage.id)
              const current = evaluation.currentStage === stage.id
              return (
                <li
                  key={stage.id}
                  className={`timeline-item ${complete ? 'done' : ''} ${current && !evaluation.allStagesComplete ? 'current' : ''}`}
                >
                  <strong>{stage.label}</strong>
                  <span>
                    {complete
                      ? 'Completada'
                      : current
                        ? 'Etapa actual'
                        : 'Pendiente'}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="panel detail" aria-labelledby="continuity-result">
          <h2 id="continuity-result">Dependencias y decisión</h2>

          <div className="workspace">
            <div>
              <h3>Verificadas</h3>
              <ul className="dep-list">
                {evaluation.verifiedDependencies.map((item) => (
                  <li key={item} className="dot tone-ok">
                    {item}
                  </li>
                ))}
              </ul>
              <h3>Pendientes</h3>
              {evaluation.pendingDependencies.length === 0 ? (
                <p className="muted">Ninguna.</p>
              ) : (
                <ul className="dep-list">
                  {evaluation.pendingDependencies.map((item) => (
                    <li key={item} className="dot tone-pending">
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  disabled={!canApplyEvent(order, 'confirm_spare_receipt')}
                  onClick={() =>
                    apply(
                      'confirm_spare_receipt',
                      'Recepción ficticia del recambio registrada de forma explícita.',
                    )
                  }
                >
                  Registrar recepción del recambio
                </button>
                <button
                  type="button"
                  className="confirm"
                  disabled={!canApplyEvent(order, 'start_repair')}
                  onClick={() =>
                    apply('start_repair', 'Reparación simulada iniciada.')
                  }
                >
                  Iniciar reparación
                </button>
                <button
                  type="button"
                  className="confirm"
                  disabled={!canApplyEvent(order, 'finish_repair')}
                  onClick={() =>
                    apply(
                      'finish_repair',
                      'Reparación simulada marcada como finalizada.',
                    )
                  }
                >
                  Registrar finalización
                </button>
              </div>
            </div>

            <aside>
              {message ? <p className="notice">{message}</p> : null}
              <article
                className={`result ${evaluation.status === 'BLOQUEADO' ? 'result-no_confirmable' : 'result-confirmable'}`}
              >
                <p className="result-kicker">Resultado del motor</p>
                <h3>Estado</h3>
                <p className="decision">
                  {evaluation.status === 'BLOQUEADO'
                    ? 'Bloqueado'
                    : evaluation.allStagesComplete
                      ? 'Completado'
                      : 'Listo para avanzar'}
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
                  Orden ficticia. No hay correo, inventario ni comunicación
                  con talleres reales.
                </p>
              </article>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
