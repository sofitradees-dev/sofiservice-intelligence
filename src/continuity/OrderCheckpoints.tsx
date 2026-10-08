import {
  applyContinuityEvent,
  availableOperationalEvents,
  evaluateContinuity,
  isStageComplete,
  STAGE_SEQUENCE,
} from './evaluateContinuity'
import type { ContinuityEvent, ContinuityOrder } from './types'

interface OrderCheckpointsProps {
  order: ContinuityOrder
  message: string
  onOrderChange: (order: ContinuityOrder, message: string) => void
}

const ACTION_COPY: Partial<
  Record<ContinuityEvent, { label: string; notice: string; className: string }>
> = {
  confirm_vehicle_reception: {
    label: 'Registrar recepción del vehículo',
    notice: 'Recepción del vehículo registrada de forma explícita.',
    className: 'primary',
  },
  confirm_assignment: {
    label: 'Registrar asignación al taller',
    notice: 'Asignación al taller registrada de forma explícita.',
    className: 'primary',
  },
  confirm_spare_receipt: {
    label: 'Registrar recepción del recambio',
    notice: 'Recepción ficticia del recambio registrada de forma explícita.',
    className: 'primary',
  },
  start_repair: {
    label: 'Iniciar reparación',
    notice: 'Reparación simulada iniciada.',
    className: 'confirm',
  },
  finish_repair: {
    label: 'Registrar finalización',
    notice: 'Reparación simulada marcada como finalizada.',
    className: 'confirm',
  },
}

export function OrderCheckpoints({
  order,
  message,
  onOrderChange,
}: OrderCheckpointsProps) {
  const evaluation = evaluateContinuity(order)
  const nextEvent = availableOperationalEvents(order)[0]
  const action = nextEvent ? ACTION_COPY[nextEvent] : undefined

  function apply(event: ContinuityEvent, successMessage: string) {
    const result = applyContinuityEvent(order, event)
    if (!result.ok) {
      onOrderChange(order, result.error ?? 'Transición no permitida.')
      return
    }
    onOrderChange(result.order, successMessage)
  }

  return (
    <div className="workspace">
      <div>
        <ol className="timeline">
          {STAGE_SEQUENCE.map((stage) => {
            const complete = isStageComplete(order, stage.id)
            const current = evaluation.currentStage === stage.id
            const spareNa =
              stage.id === 'recepcion_repuesto' && !order.requiresSpare
            return (
              <li
                key={stage.id}
                className={`timeline-item ${complete ? 'done' : ''} ${current && !evaluation.allStagesComplete ? 'current' : ''} ${spareNa ? 'na' : ''}`}
              >
                <strong>{stage.label}</strong>
                <span>
                  {spareNa
                    ? 'No aplica'
                    : complete
                      ? 'Completada'
                      : current
                        ? 'Etapa actual'
                        : 'Pendiente'}
                </span>
              </li>
            )
          })}
        </ol>

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

        {action && nextEvent ? (
          <div className="actions checkpoint-action">
            <button
              type="button"
              className={action.className}
              onClick={() => apply(nextEvent, action.notice)}
            >
              {action.label}
            </button>
          </div>
        ) : (
          <p className="hint">
            {evaluation.allStagesComplete
              ? 'Orden finalizada. El historial permanece visible. No hay acciones operativas activas.'
              : 'La siguiente etapa permanece bloqueada hasta completar la dependencia previa.'}
          </p>
        )}
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
            Orden ficticia. La disponibilidad inicial en inventario no equivale
            a recepción en el taller. No hay correo ni sistemas reales.
          </p>
        </article>
      </aside>
    </div>
  )
}
