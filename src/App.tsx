import { UnifiedJourney } from './flow/UnifiedJourney'

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Connect atVentures 2026 · SOFI TEAM</p>
          <h1>Gestión de servicios</h1>
          <p className="subtitle">
            De la solicitud de atención hasta informar al cliente. Datos de
            demostración.
          </p>
        </div>
        <p className="demo-banner" role="status">
          DEMO — DATOS 100 % SIMULADOS
        </p>
      </header>
      <UnifiedJourney />
    </div>
  )
}

export default App
