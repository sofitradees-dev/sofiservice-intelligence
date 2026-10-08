import { useEffect, useState } from 'react'
import { workshopKindLabel } from '../domain/workshop'
import { loadAppState, restoreAppState, saveAppState } from '../flow/unifiedStore'
import { OrderCheckpoints } from './OrderCheckpoints'

export function ServiceContinuity() {
  const initial = loadAppState()
  const [orders, setOrders] = useState(initial.orders)
  const [requests, setRequests] = useState(initial.requests)
  const [selectedId, setSelectedId] = useState(initial.orders[0]?.id ?? '')
  const [message, setMessage] = useState('')

  const order = orders.find((item) => item.id === selectedId) ?? orders[0]

  useEffect(() => {
    saveAppState({ requests, orders })
  }, [requests, orders])

  if (!order) {
    return (
      <div className="module">
        <main className="layout">
          <section className="panel">
            <h2>Service Continuity</h2>
            <p>
              No hay órdenes vinculadas. Confirme una solicitud CONFIRMABLE en
              el recorrido principal para crear una orden sintética.
            </p>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const restored = restoreAppState()
                setRequests(restored.requests)
                setOrders(restored.orders)
                setSelectedId('')
                setMessage('Escenario restaurado.')
              }}
            >
              Restaurar escenario
            </button>
            {message ? <p className="notice">{message}</p> : null}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="module">
      <main className="layout continuity-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="card-id">{order.id}</p>
              <h2>Service Continuity</h2>
              <p className="micro">
                Órdenes creadas al confirmar una solicitud. Sin transiciones
                automáticas.
              </p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const restored = restoreAppState()
                setRequests(restored.requests)
                setOrders(restored.orders)
                setSelectedId('')
                setMessage('Escenario restaurado.')
              }}
            >
              Restaurar escenario
            </button>
          </div>
          {orders.length > 1 ? (
            <ul className="request-list">
              {orders.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === order.id ? 'request-card selected' : 'request-card'}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="card-id">{item.id}</span>
                    <strong>{item.serviceType}</strong>
                    <span className="muted">
                      Tipo: {workshopKindLabel(item.workshopKind)}
                    </span>
                    <span className="muted">Nombre: {item.workshop}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
              <dt>Tipo de taller</dt>
              <dd>{workshopKindLabel(order.workshopKind)}</dd>
            </div>
            <div>
              <dt>Nombre del taller</dt>
              <dd>{order.workshop}</dd>
            </div>
          </dl>
        </section>
        <section className="panel detail">
          <h2>Dependencias y decisión</h2>
          <OrderCheckpoints
            order={order}
            message={message}
            onOrderChange={(next, notice) => {
              setOrders((current) =>
                current.map((item) => (item.id === next.id ? next : item)),
              )
              setMessage(notice)
            }}
          />
        </section>
      </main>
    </div>
  )
}
