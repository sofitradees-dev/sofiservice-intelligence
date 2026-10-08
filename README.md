# SOFI Service Intelligence

Prototipo de **Service Readiness** para Connect atVentures 2026 (reto BYD).  
Versión: **v0.2.1** · Equipo: SOFI TEAM

**DEMO — DATOS 100 % SIMULADOS**

Aplicación web local que ayuda a verificar condiciones operativas **antes** de confirmar la recepción de un vehículo a servicio. No sustituye sistemas internos de BYD, inventario real ni la coordinación con talleres.

## Problema de postventa abordado

La postventa automotriz combina mantenimientos preventivos, revisiones mecánicas y trabajos de pintura o colisión. Parte de esa atención puede realizarse en talleres de red o en talleres externos; el inventario de recambios y la coordinación entre actores no siempre están visibles en un único punto de decisión.

Este MVP **no afirma** que existan retrasos sistemáticos, pérdidas de información o fallas confirmadas de coordinación. Se limita a un problema verificable en demostración:

> Antes de ofrecer una atención, el asesor necesita saber si las condiciones simuladas de cupo, recambio e información operativa permiten confirmar la recepción, exigen verificación o la impiden.

## Propuesta

**SOFI Service Intelligence** concentra esa verificación en un flujo corto y explicable:

1. Seleccionar una solicitud de servicio simulada.
2. Revisar y, si hace falta, ajustar las condiciones de demostración.
3. Ejecutar una evaluación explícita.
4. Leer motivos y la **siguiente acción operativa**.
5. Confirmar la atención **solo de forma manual** cuando el resultado es CONFIRMABLE.

El seguimiento de reparaciones (Service Tracking) **no forma parte** de esta versión.

## Funcionalidades reales de Service Readiness

Incluidas y demostrables:

- Cinco solicitudes ficticias (mantenimiento preventivo, revisión mecánica, colisión y pintura en taller externo simulado).
- Motor puro `evaluateReadiness()` con tres decisiones: **CONFIRMABLE**, **NO_CONFIRMABLE**, **VERIFICACION_REQUERIDA**.
- Motivos verificables y recomendaciones contextuales (por ejemplo, si solo falta recambio, no se recomienda resolver un problema de cupo).
- Confirmación manual, condicionada a una evaluación vigente y CONFIRMABLE.
- Revocación de la confirmación si las condiciones dejan de ser válidas.
- Persistencia local en `localStorage` (sin servidor).
- Restauración de los datos de demostración.

No incluidas (y no deben presentarse como hechas):

- Backend, AWS, APIs o autenticación.
- Inventario real, reserva de cupo o solicitud efectiva de recambio.
- Correo con talleres, etapas de pintura o visibilidad para el cliente.
- Inteligencia artificial predictiva.

## Instalación y ejecución

Requisitos: **Node.js** y **npm**.

```bash
git clone https://github.com/sofitradees-dev/sofiservice-intelligence.git
cd sofiservice-intelligence
npm install
npm run dev
```

La aplicación queda en [http://localhost:5173/](http://localhost:5173/).

Otros comandos:

```bash
npm test          # pruebas del motor y de persistencia
npm run build     # verificación de TypeScript y empaquetado
```

Stack: React, Vite, TypeScript y CSS. Sin dependencias de nube.

## Pruebas y datos simulados

Hay **26 pruebas** con Vitest sobre reglas de decisión, confirmación, invalidación, persistencia y recomendaciones operativas.

Todos los vehículos, VIN, talleres e identificadores son **sintéticos** (prefijos `DEMO-`, `FICCIO`, `REQ-DEMO-`). La evaluación usa únicamente esos valores; **no consulta inventario físico** ni sistemas internos.

## Limitaciones del MVP

- Prototipo de demostración, no un producto de producción.
- Un solo módulo: Service Readiness.
- Los cambios de condiciones son simulados por el usuario en pantalla.
- No hay usuarios, roles ni auditoría empresarial.
- No hay despliegue continuo ni entorno compartido.

## Uso de IA generativa

Este prototipo se desarrolló con apoyo de **IA generativa** (asistencia en Cursor) para scaffolding, implementación, pruebas y documentación, bajo dirección y revisión del equipo SOFI. La IA no se usa en tiempo de ejecución: no hay modelos, predicciones ni agentes en la aplicación. Las decisiones de Service Readiness son reglas deterministas sobre datos simulados.

## Licencia

Proyecto de hackathon. Uso interno del equipo y del jurado del reto, salvo que se indique lo contrario.
