import { describe, expect, it } from 'vitest'
import {
  applyWorkshopSelection,
  workshopKindLabel,
  workshopNameForKind,
} from './workshop'
import { cloneDemoRequests } from './demoData'

describe('presentación de taller', () => {
  it('no asume que un taller autorizado es propio', () => {
    expect(
      workshopNameForKind(
        'externo',
        'Taller de servicio autorizado simulado',
      ),
    ).toBe('Taller de servicio autorizado simulado')
    expect(workshopKindLabel('externo')).toBe('EXTERNO')
    expect(workshopKindLabel('propio')).toBe('PROPIO')
  })

  it('evita un nombre propio cuando el tipo pasa a externo', () => {
    expect(workshopNameForKind('externo', 'Taller propio simulado')).toBe(
      'Taller externo simulado (selección de demostración)',
    )
  })

  it('REQ-DEMO-003 mantiene tipo EXTERNO y nombre externo', () => {
    const request = cloneDemoRequests()[2]
    expect(request?.id).toBe('REQ-DEMO-003')
    expect(request?.workshopKind).toBe('externo')
    const patch = applyWorkshopSelection(request!, 'externo')
    expect(patch.workshopKind).toBe('externo')
    expect(patch.workshop).toMatch(/externo/i)
  })
})
