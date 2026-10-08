# SOFI Service Intelligence

Prototipo para Connect atVentures 2026 (reto BYD).  
Equipo: SOFI TEAM

Versión actual: **interfaz unificada con lenguaje sencillo y ventanas de confirmación** (sobre Customer Updates v0.5, Unified Service Flow v0.4, Continuity v0.3 y Readiness v0.2.1).

**DEMO — DATOS 100 % SIMULADOS**

Aplicación web local. No sustituye sistemas internos de BYD, inventario real, reserva de cupo ni la coordinación con talleres.

## Problema de postventa abordado

La postventa automotriz combina mantenimientos preventivos, revisiones mecánicas y trabajos de pintura o colisión. Parte de esa atención puede realizarse en talleres de red o en talleres externos.

Este prototipo **no afirma** retrasos sistemáticos ni fallas confirmadas de coordinación. Muestra un recorrido continuo y verificable:

1. **Readiness:** antes de ofrecer una atención, ¿las condiciones simuladas de taller, cupo, personal técnico, recambio e información operativa permiten confirmar?
2. **Continuity:** en la orden vinculada, ¿qué etapa o dependencia impide avanzar y qué acción explícita se requiere?
3. **Customer Updates:** con los checkpoints ya registrados, ¿qué mensaje es seguro proponer al cliente?

## Propuesta

**SOFI Service Intelligence** une esas verificaciones en **una sola pantalla operativa** (`Gestión de servicios`), con reglas deterministas, confirmación **manual** por ventanas y una propuesta de mensaje al cliente basada solo en hechos registrados.

El lenguaje de la interfaz es cotidiano. Los identificadores técnicos (solicitud, orden, VIN) quedan en detalles, no en el flujo principal.

## Experiencia operativa

Recorrido demostrable:

**Solicitud → Verificar atención → Confirmar atención → Seguimiento del vehículo → Etapas del servicio → Informar al cliente.**

Incluido y demostrable:

- Cinco solicitudes ficticias, con tipo de taller (propio / externo) y nombre asignado por separado.
- Motor de Readiness: capacidad, personal técnico, recambio si aplica, información operativa y taller seleccionado.
- Resultados visibles: **Se puede atender**, **No se puede confirmar**, **Falta verificar información**.
- Confirmación manual de la atención solo con evaluación vigente y confirmable. Crea **una** orden sintética vinculada; no reserva un cupo real y **no** registra la llegada del vehículo.
- Tras confirmar, un resumen compacto de la solicitud y foco en el seguimiento, con **una sola acción** operativa a la vez.
- Cada acción de taller abre una **ventana de confirmación**. Cancelar o cerrar no registra eventos. Confirmar aplica únicamente el evento válido correspondiente.
- Checkpoints secuenciales. La disponibilidad en inventario no equivale a recepción del repuesto en el taller.
- Si el servicio no requiere repuesto, esa condición no aplica y no bloquea.
- **Informar al cliente** se actualiza después de cada evento confirmado.
- Persistencia local unificada y **Reiniciar demostración**.

Los motores Readiness, Continuity y Customer Updates no cambian sus reglas. Los módulos de inspección anteriores siguen en el repositorio.

## Escenario de pitch: REQ-DEMO-003

Servicio: reparación por colisión (carrocería).  
Taller: **externo** — Taller externo de colisión simulado.  
Repuesto: obligatorio. Cupo y personal: disponibles. Información: completa.

Recorrido:

1. Verificar disponibilidad: se puede atender.
2. Confirmar atención (el vehículo no figura llegado).
3. Creación de una sola orden vinculada.
4. Registrar llegada del vehículo (ventana de confirmación).
5. Confirmar taller asignado.
6. Reparación bloqueada hasta registrar la llegada del repuesto al taller.
7. Confirmar llegada del repuesto.
8. Iniciar reparación.
9. Finalizar reparación.
10. Mensaje al cliente según el último hecho registrado. Sin acciones operativas activas.

**Reiniciar demostración** deja de nuevo REQ-DEMO-003 pendiente para repetir el pitch.

## Customer Updates v0.5

Motor puro `composeCustomerUpdate()`. Recibe el estado de una orden y propone un texto para el cliente **solo** a partir de checkpoints confirmados.

- Mensaje profesional por etapa: solicitud registrada, vehículo recibido, espera de repuesto, listo para iniciar, reparación iniciada y finalizada.
- Si el servicio no requiere repuesto, el texto no menciona una pieza pendiente.
- **Copiar mensaje** copia únicamente el texto destinado al cliente.
- Leyendas de demostración quedan en la interfaz, no en el mensaje copiable.

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

Pantalla única: **Gestión de servicios**. El asesor recorre solicitud, verificación, confirmación, etapas del taller e informar al cliente sin cambiar de módulo.

```bash
npm test          # 78 pruebas (Readiness, Continuity, vinculación, taller, mensajes y ventanas de confirmación)
npm run build     # TypeScript y empaquetado
```

Stack: React, Vite, TypeScript y CSS. Sin dependencias de nube ni librería pesada de componentes.

## Pruebas y datos simulados

Vitest cubre Readiness, Continuity, el vínculo solicitud-orden, Customer Updates y el flujo guiado de confirmación (cancelar no registra, confirmar aplica un evento, no hay doble ejecución, transiciones inválidas bloqueadas, cierre de ventana y siguiente paso).

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
