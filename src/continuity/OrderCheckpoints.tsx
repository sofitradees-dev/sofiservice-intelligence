import { useRef, useState } from 'react'
import {
  evaluateContinuity,
  isStageComplete,
  STAGE_SEQUENCE,
} from './evaluateContinuity'
import type { ContinuityEvent, ContinuityOrder } from './types'
import { ConfirmActionModal } from '../ui/ConfirmActionModal'
import {
  CLOSED_DIALOG,
  confirmActionDialog,
  dismissActionDialog,
  nextVisibleAction,
  openActionDialog,
  OPERATIONAL_ACTIONS,
  type ActionDialogState,
} from '../ui/confirmActionFlow'
import { everydayStage, everydayVehicle } from '../ui/labels'

interface OrderCheckpointsProps {
  order: ContinuityOrder
  message: string
  onOrderChange: (order: ContinuityOrder, message: string) => void
}

export function OrderCheckpoints({
  order,
  message,
  onOrderChange,
}: OrderCheckpointsProps) {
  const evaluation = evaluateContinuity(order)
  const nextEvent = nextVisibleAction(order)
  const action = nextEvent ? OPERATIONAL_ACTIONS[nextEvent] : undefined
  const [dialog, setDialog] = useState<ActionDialogState>(CLOSED_DIALOG)
  const dialogRef = useRef<ActionDialogState>(CLOSED_DIALOG)

  function setDialogState(next: ActionDialogState) {
    dialogRef.current = next
    setDialog(next)
  }

  function openConfirm(event: ContinuityEvent) {
    setDialogState(openActionDialog(dialogRef.current, event))
  }

  function cancelConfirm() {
    setDialogState(dismissActionDialog(dialogRef.current))
  }

  function submitConfirm() {
    const current = dialogRef.current
    if (!current.event || current.busy) return
    const pending = current.event
    const copy = OPERATIONAL_ACTIONS[pending]
    dialogRef.current = { event: pending, busy: true }
    setDialog(dialogRef.current)
    const result = confirmActionDialog({ event: pending, busy: false }, order)
    setDialogState(result.dialog)
    if (result.applied && copy) {
      onOrderChange(result.order, copy.notice)
      return
    }
    if (result.error) {
      onOrderChange(order, result.error)
    }
  }

  const pendingCopy = dialog.event
    ? OPERATIONAL_ACTIONS[dialog.event]
    : undefined
  const statusLabel = evaluation.allStagesComplete
    ? 'Reparación registrada como finalizada'
    : evaluation.status === 'BLOQUEADO'
      ? 'Falta un paso para continuar'
      : 'Listo para el siguiente paso'

  return (
    <div className="workspace guided-workspace">
      <div>
        <h3>Etapas del servicio</h3>
        {action && nextEvent ? (
          <div className="actions checkpoint-action">
            <button
              type="button"
              className={action.className}
              onClick={() => openConfirm(nextEvent)}
            >
              {action.label}
            </button>
          </div>
        ) : (
          <p className="hint">
            {evaluation.allStagesComplete
              ? 'No hay más pasos de taller. Puede informar al cliente. No afirme que el vehículo ya se entregó.'
              : 'Complete el paso actual antes de seguir.'}
          </p>
        )}
        <ol className="timeline compact-timeline">
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
                <strong>{everydayStage(stage.id)}</strong>
                <span>
                  {spareNa
                    ? 'No aplica'
                    : complete
                      ? 'Hecho'
                      : current
                        ? 'Ahora'
                        : 'Pendiente'}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <aside>
        {message ? <p className="notice">{message}</p> : null}
        <article
          className={`result ${evaluation.status === 'BLOQUEADO' ? 'result-no_confirmable' : 'result-confirmable'}`}
        >
          <p className="result-kicker">Estado del servicio</p>
          <p className="decision">{statusLabel}</p>
          <div className="guide-block">
            <h4>Qué está pasando</h4>
            <p>
              {evaluation.allStagesComplete
                ? 'Todos los pasos del taller ya están registrados.'
                : evaluation.status === 'BLOQUEADO'
                  ? 'Todavía falta un hecho registrado para poder avanzar.'
                  : 'Ya se puede registrar el siguiente paso.'}
            </p>
            <h4>Por qué</h4>
            <ul>
              {evaluation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <h4>Qué debo hacer ahora</h4>
            <p>
              {action
                ? `Pulse «${action.label}» cuando ese hecho haya ocurrido.`
                : evaluation.allStagesComplete
                  ? 'Copie el mensaje para el cliente si lo necesita.'
                  : 'Espere a completar el paso anterior.'}
            </p>
          </div>
          <p className="footnote">
            Un repuesto disponible no es un repuesto recibido en el taller.
            Una reparación finalizada no es un vehículo entregado.
          </p>
        </article>
      </aside>

      <ConfirmActionModal
        open={Boolean(dialog.event && pendingCopy)}
        title={pendingCopy?.label ?? ''}
        vehicle={everydayVehicle(order.vehicle)}
        service={order.serviceType}
        explanation={pendingCopy?.explanation ?? ''}
        busy={dialog.busy}
        onCancel={cancelConfirm}
        onConfirm={submitConfirm}
      />
    </div>
  )
}
