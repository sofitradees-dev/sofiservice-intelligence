import { useEffect, useId, useRef } from 'react'

interface ConfirmActionModalProps {
  open: boolean
  title: string
  vehicle: string
  service: string
  explanation: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmActionModal({
  open,
  title,
  vehicle,
  service,
  explanation,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      confirmRef.current?.focus()
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-modal"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          event.preventDefault()
          onCancel()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel()
        }
      }}
    >
      <form
        className="confirm-modal-card"
        method="dialog"
        onSubmit={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className="confirm-modal-close"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id={titleId}>{title}</h2>
        <dl className="facts compact-facts">
          <div>
            <dt>Vehículo</dt>
            <dd>{vehicle}</dd>
          </div>
          <div>
            <dt>Servicio</dt>
            <dd>{service}</dd>
          </div>
        </dl>
        <p id={descId} className="confirm-modal-copy">
          {explanation}
        </p>
        <div className="actions">
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="confirm"
            disabled={busy}
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </form>
    </dialog>
  )
}
