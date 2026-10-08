# SOFI Service Intelligence

Prototipo para Connect atVentures 2026 (reto BYD).  
Equipo: SOFI TEAM

Versiones incluidas:

- **Service Readiness v0.2.1**
- **Service Continuity v0.3**

**DEMO — DATOS 100 % SIMULADOS**

Aplicación web local con dos módulos demostrables. No sustituye sistemas internos de BYD, inventario real ni la coordinación con talleres.

## Problema de postventa abordado

La postventa automotriz combina mantenimientos preventivos, revisiones mecánicas y trabajos de pintura o colisión. Parte de esa atención puede realizarse en talleres de red o en talleres externos.

Este prototipo **no afirma** que existan retrasos sistemáticos, pérdidas de información o fallas confirmadas de coordinación. Muestra dos decisiones verificables:

1. **Readiness:** antes de ofrecer una atención, ¿las condiciones simuladas de cupo, recambio e información operativa permiten confirmar la recepción?
2. **Continuity:** en una orden de colisión simulada en taller externo, ¿qué etapa o dependencia impide avanzar y qué acción explícita se requiere?

## Propuesta

**SOFI Service Intelligence** concentra esas verificaciones en flujos cortos y explicables, con reglas deterministas y confirmación o avance **manual**.

## Service Readiness v0.2.1

Incluido y demostrable:

- Cinco solicitudes ficticias (mantenimiento preventivo, revisión mecánica, colisión y pintura en taller externo simulado).
- Motor puro `evaluateReadiness()`: **CONFIRMABLE**, **NO_CONFIRMABLE**, **VERIFICACION_REQUERIDA**.
- Motivos verificables y recomendaciones contextuales (si solo falta recambio, no se recomienda resolver un problema de cupo).
- Confirmación manual, solo con evaluación vigente y CONFIRMABLE.
- Revocación si las condiciones dejan de ser válidas.
- Persistencia en `localStorage` y restauración de la demo.

## Service Continuity v0.3

Incluido y demostrable:

- Una orden sintética: **OS-DEMO-001**, reparación por colisión en un taller externo ficticio.
- Etapas: recepción del vehículo, asignación al taller, confirmación de recepción del recambio, inicio de reparación y reparación finalizada.
- Estado inicial: recepción y asignación completadas; recambio pendiente; reparación no iniciada.
- Motor puro `evaluateContinuity()`: etapa actual, dependencias, **LISTO_PARA_AVANZAR** o **BLOQUEADO**, motivos y siguiente acción.
- El inicio no se infiere por inventario: hace falta registrar de forma explícita la recepción del recambio.
- No hay retrocesos ni transiciones inválidas.
- Restauración del escenario inicial.

Esto **no** es un gestor de talleres, un seguimiento completo de reparación ni una integración de correo.

## Instalación y ejecución

Requisitos: **Node.js** y **npm**.

```bash
git clone https://github.com/sofitradees-dev/sofiservice-intelligence.git
cd sofiservice-intelligence
npm install
npm run dev
```

La aplicación queda en [http://localhost:5173/](http://localhost:5173/).

Navegación en pantalla: **Service Readiness** y **Service Continuity**.

```bash
npm test          # 35 pruebas (Readiness + Continuity)
npm run build     # TypeScript y empaquetado
```

Stack: React, Vite, TypeScript y CSS. Sin dependencias de nube.

## Pruebas y datos simulados

Vitest cubre reglas de Readiness (decisión, confirmación, persistencia, recomendaciones) y de Continuity (bloqueo por recambio, transiciones inválidas, habilitación, finalización, restauración).

Vehículos, VIN, talleres e identificadores son **sintéticos** (`DEMO-`, `FICCIO`, `REQ-DEMO-`, `OS-DEMO-001`). No hay datos reales de clientes ni de operaciones BYD.

## Limitaciones del MVP

- Sin backend, APIs, autenticación ni AWS.
- Sin inventario real, reserva de cupo ni solicitud efectiva de recambio.
- Sin correo electrónico ni comunicación con talleres.
- Sin dashboard de múltiples talleres ni visibilidad para el cliente.
- Sin IA en tiempo de ejecución: no hay modelos, predicciones ni agentes.
- Prototipo de demostración, no un producto de producción.

## Uso de IA generativa

Este prototipo se desarrolló con apoyo de **IA generativa** (asistencia en Cursor) para scaffolding, implementación, pruebas y documentación, bajo dirección y revisión del equipo SOFI. La IA no se usa en runtime. Las decisiones de Readiness y Continuity son reglas deterministas sobre datos simulados.

## Licencia

Proyecto de hackathon. Uso interno del equipo y del jurado del reto, salvo que se indique lo contrario.
