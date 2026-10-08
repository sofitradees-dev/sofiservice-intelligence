import { useState } from 'react'
import { ServiceContinuity } from './continuity/ServiceContinuity'
import { ServiceReadiness } from './readiness/ServiceReadiness'

type ModuleId = 'readiness' | 'continuity'

function App() {
  const [moduleId, setModuleId] = useState<ModuleId>('readiness')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Connect atVentures 2026 · SOFI TEAM</p>
          <h1>SOFI Service Intelligence</h1>
          <p className="subtitle">
            {moduleId === 'readiness'
              ? 'Service Readiness: verificar condiciones operativas simuladas antes de recibir un vehículo.'
              : 'Service Continuity: etapas y dependencias explícitas de una orden simulada en taller externo.'}
          </p>
          <nav className="module-nav" aria-label="Módulos">
            <button
              type="button"
              className={moduleId === 'readiness' ? 'nav-link active' : 'nav-link'}
              onClick={() => setModuleId('readiness')}
            >
              Service Readiness
            </button>
            <button
              type="button"
              className={moduleId === 'continuity' ? 'nav-link active' : 'nav-link'}
              onClick={() => setModuleId('continuity')}
            >
              Service Continuity
            </button>
          </nav>
        </div>
        <p className="demo-banner" role="status">
          DEMO — DATOS 100 % SIMULADOS
        </p>
      </header>

      {moduleId === 'readiness' ? <ServiceReadiness /> : <ServiceContinuity />}
    </div>
  )
}

export default App
