import type { ServiceRequest, WorkshopKind } from './types'

export function workshopKindLabel(kind: WorkshopKind): string {
  if (kind === 'propio') return 'PROPIO'
  if (kind === 'externo') return 'EXTERNO'
  return 'NO SELECCIONADO'
}

export function workshopNameForKind(
  kind: WorkshopKind,
  currentName: string,
): string {
  const name = currentName.trim() || 'Taller simulado'

  if (kind === 'no_seleccionado') {
    return name
  }

  const mentionsExternal = /\bexterno\b/i.test(name)
  const mentionsOwn = /\bpropio\b/i.test(name)

  if (kind === 'externo' && mentionsOwn) {
    return 'Taller externo simulado (selección de demostración)'
  }

  if (kind === 'propio' && mentionsExternal) {
    return 'Taller propio simulado (selección de demostración)'
  }

  return name
}

export function applyWorkshopSelection(
  request: ServiceRequest,
  kind: WorkshopKind,
): Pick<ServiceRequest, 'workshopKind' | 'workshop'> {
  return {
    workshopKind: kind,
    workshop: workshopNameForKind(kind, request.workshop),
  }
}
