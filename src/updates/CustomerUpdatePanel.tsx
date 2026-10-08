import { useEffect, useState } from 'react'
import type { ContinuityOrder } from '../continuity/types'
import { composeCustomerUpdate } from './composeCustomerUpdate'
import { everydayUpdateType } from '../ui/labels'

interface CustomerUpdatePanelProps {
  order: ContinuityOrder
}

export function CustomerUpdatePanel({ order }: CustomerUpdatePanelProps) {
  const update = composeCustomerUpdate(order)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [order])

  async function copyMessage() {
    if (!update.customerText) {
      return
    }
    try {
      await navigator.clipboard.writeText(update.customerText)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="customer-update">
      <h3>Informar al cliente</h3>

      <section className="customer-update-message">
        <h4>Mensaje para el cliente</h4>
        {update.ok && update.customerText ? (
          <p className="customer-update-text">{update.customerText}</p>
        ) : (
          <p className="notice">
            {update.warning ?? 'No hay un mensaje seguro para copiar.'}
          </p>
        )}
        <button
          type="button"
          className="ghost"
          disabled={!update.customerText}
          onClick={() => {
            void copyMessage()
          }}
        >
          Copiar mensaje
        </button>
        {copied ? (
          <p className="micro">Se copió el texto para el cliente.</p>
        ) : null}
      </section>

      <section className="customer-update-demo">
        <h4>Información de demostración</h4>
        <p className="micro">{everydayUpdateType(update.updateType)}</p>
        <details className="tech-details">
          <summary>Detalles técnicos</summary>
          <p>
            Referencia interna: <code>{update.orderId}</code>
          </p>
        </details>
        <p className="footnote">
          Vista previa · No enviado · Datos 100 % simulados
        </p>
      </section>
    </article>
  )
}
