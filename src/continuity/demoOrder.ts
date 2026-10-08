import type { ContinuityOrder } from './types'

export const INITIAL_ORDER: ContinuityOrder = {
  id: 'OS-DEMO-001',
  vehicle: 'Hatchback DEMO-C · VIN FICCIO003PA000003',
  serviceType: 'Reparación por colisión (carrocería)',
  workshop: 'Taller externo de colisión simulado',
  vehicleReceived: true,
  assignmentConfirmed: true,
  spareReceived: false,
  repairStarted: false,
  repairFinished: false,
}

export function cloneInitialOrder(): ContinuityOrder {
  return { ...INITIAL_ORDER }
}
