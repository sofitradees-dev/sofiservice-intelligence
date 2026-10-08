# SOFI Service Intelligence

Prototipo para Connect atVentures 2026 (reto BYD).  
Equipo: SOFI TEAM

Versión actual: **Customer Updates v0.5** (sobre Unified Service Flow v0.4)

Versiones anteriores conservadas como módulos:

- **Unified Service Flow v0.4**
- **Service Readiness v0.2.1**
- **Service Continuity v0.3**

**DEMO — DATOS 100 % SIMULADOS**

Aplicación web local. No sustituye sistemas internos de BYD, inventario real, reserva de cupo ni la coordinación con talleres.

## Problema de postventa abordado

La postventa automotriz combina mantenimientos preventivos, revisiones mecánicas y trabajos de pintura o colisión. Parte de esa atención puede realizarse en talleres de red o en talleres externos.

Este prototipo **no afirma** retrasos sistemáticos ni fallas confirmadas de coordinación. Muestra un recorrido continuo y verificable:

1. **Readiness:** antes de ofrecer una atención, ¿las condiciones simuladas de taller, cupo, personal técnico, recambio e información operativa permiten confirmar la recepción?
2. **Continuity:** en la orden vinculada, ¿qué etapa o dependencia impide avanzar y qué acción explícita se requiere?
3. **Customer Updates:** con los checkpoints ya registrados, ¿qué mensaje es seguro proponer al cliente?

## Propuesta

**SOFI Service Intelligence** une esas verificaciones en un solo flujo de postventa simulada, con reglas deterministas, confirmación o avance **manual**, y una propuesta de mensaje al cliente basada solo en hechos registrados.

## Unified Service Flow v0.4

Recorrido principal:

**Solicitud → Evaluación → Confirmación → Orden vinculada → Checkpoints → Finalización.**

Incluido y demostrable:

- Cinco solicitudes ficticias, con tipo de taller (**PROPIO** / **EXTERNO**) y nombre asignado por separado.
- Motor de Readiness ampliado: capacidad, personal técnico, recambio si aplica, información operativa y taller seleccionado.
- Resultados: **CONFIRMABLE**, **NO_CONFIRMABLE**, **VERIFICACION_REQUERIDA**.
- Confirmación manual solo con evaluación vigente y CONFIRMABLE. Crea **una** orden sintética vinculada; no reserva un cupo real.
- Checkpoints secuenciales y explícitos. La disponibilidad inicial en inventario no equivale a recepción del recambio en el taller.
- Si el servicio no requiere recambio, esa condición es **NO APLICA** y no bloquea.
- Persistencia local unificada y **Restaurar escenario**.

Los módulos Readiness y Continuity siguen disponibles para inspección, pero el pitch usa el recorrido unificado.

## Escenario de pitch: REQ-DEMO-003

Servicio: reparación por colisión (carrocería).  
Taller: **EXTERNO** — Taller externo de colisión simulado.  
Recambio: obligatorio. Capacidad y personal: disponibles. Información operativa: completa.

Recorrido:

1. Evaluación **CONFIRMABLE**.
2. Confirmación manual del asesor.
3. Creación de una sola orden `OS-LINK-REQ-DEMO-003` (el vehículo no figura recibido ni la reparación iniciada).
4. Recepción explícita del vehículo.
5. Asignación explícita al taller externo.
6. Reparación bloqueada hasta registrar la recepción del recambio en el taller.
7. Registro de recepción del recambio.
8. Inicio manual de la reparación.
9. Finalización manual.
10. Estado **COMPLETADO**, con historial visible y sin acciones operativas activas.

**Restaurar escenario** deja de nuevo REQ-DEMO-003 pendiente para repetir la demostración.

## Customer Updates v0.5

Motor puro `composeCustomerUpdate()`. Recibe el estado de una orden y propone un texto para el cliente **solo** a partir de checkpoints confirmados.

Incluido y demostrable en **Service Continuity**:

- Mensaje profesional por etapa: orden creada, vehículo recibido, espera de recambio, listo para iniciar, reparación iniciada y finalizada.
- Si el servicio no requiere recambio, el texto no menciona una pieza pendiente.
- El botón **Copiar mensaje** copia únicamente el texto destinado al cliente.
- Leyendas de demostración (vista previa, no enviado, datos simulados) quedan en la interfaz, no en el mensaje copiable.
- Estado inconsistente: no se genera mensaje para enviar.

Esto **no** es un chatbot, un agente de IA ni un envío por WhatsApp, correo o CRM.

## Service Readiness v0.2.1

Motor puro `evaluateReadiness()`. Motivos verificables, recomendaciones contextuales, confirmación manual y revocación si las condiciones dejan de ser válidas.

## Service Continuity v0.3

Motor puro `evaluateContinuity()`. Etapas y dependencias explícitas. La semilla de pruebas **OS-DEMO-001** cubre el caso de recambio pendiente en taller externo; la interfaz unificada usa órdenes creadas al confirmar una solicitud.

## Instalación y ejecución

Requisitos: **Node.js 20 o superior** y **npm**.

```bash
git clone https://github.com/sofitradees-dev/sofiservice-intelligence.git
cd sofiservice-intelligence
npm install
npm run dev
```

La aplicación queda en [http://localhost:5173/](http://localhost:5173/).

Navegación: **Recorrido**, **Service Readiness** y **Service Continuity**. En Continuity, el panel **Actualización para el cliente** se actualiza al registrar checkpoints.

```bash
npm test          # 70 pruebas (Readiness, Continuity, vinculación, taller y mensajes al cliente)
npm run build     # TypeScript y empaquetado
```

Stack: React, Vite, TypeScript y CSS. Sin dependencias de nube.

## Pruebas y datos simulados

Vitest cubre Readiness (decisión, personal, taller, confirmación, persistencia), Continuity (dependencias, recambio, transiciones inválidas, estado final), el vínculo solicitud-orden (sin duplicados, orden inmutable tras confirmar, restauración) y Customer Updates (etapas permitidas, texto copiable sin advertencias internas, estados inconsistentes).

Vehículos, VIN, talleres e identificadores son **sintéticos** (`DEMO-`, `FICCIO`, `REQ-DEMO-`, `OS-LINK-`, `OS-DEMO-001`). No hay datos reales de clientes ni de operaciones BYD.

## Limitaciones del MVP

- Sin backend, APIs, autenticación ni AWS.
- Sin inventario real, reserva de cupo, agenda ni sistema de recursos humanos.
- Sin correo electrónico, WhatsApp, CRM ni envío real de mensajes al cliente.
- Sin dashboard de múltiples talleres ni visibilidad para el cliente.
- Sin IA en tiempo de ejecución: no hay modelos, predicciones ni agentes.
- Prototipo de demostración, no un producto de producción.

## Uso de IA generativa

Este prototipo se desarrolló con apoyo de **IA generativa** (asistencia en Cursor) para scaffolding, implementación, pruebas y documentación, bajo dirección y revisión del equipo SOFI. La IA no se usa en runtime. Las decisiones de Readiness, Continuity y Customer Updates son reglas deterministas sobre datos simulados.

## Licencia

Proyecto de hackathon. Uso interno del equipo y del jurado del reto, salvo que se indique lo contrario.
