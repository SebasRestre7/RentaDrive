import { demoVehicles } from '../catalog-data.js';

export const demoCities = Object.freeze(['Medellín', 'Bogotá', 'Cartagena', 'Cali']);
export const demoFleet = Object.freeze([
  ...demoVehicles.map(vehicle => Object.freeze({ ...vehicle, city: 'Medellín', state: 'available' })),
  Object.freeze({ ...demoVehicles[1], id: 'mazda-bogota', city: 'Bogotá', state: 'available' }),
  Object.freeze({ ...demoVehicles[2], id: 'sandero-cali', city: 'Cali', state: 'available' }),
  Object.freeze({ ...demoVehicles[0], id: 'hilux-cartagena', city: 'Cartagena', state: 'available' }),
  Object.freeze({ ...demoVehicles[0], id: 'hilux-maintenance', city: 'Medellín', state: 'maintenance' }),
  Object.freeze({ ...demoVehicles[1], id: 'mazda-contingency', city: 'Medellín', state: 'contingency' }),
]);

export const demoPolicies = Object.freeze([
  Object.freeze({ id: 'basic', name: 'Básica', dailyPrice: 25000, description: 'Cobertura básica de demostración. Mínima obligatoria.' }),
  Object.freeze({ id: 'intermediate', name: 'Intermedia', dailyPrice: 45000, description: 'Responsabilidad a terceros hasta COP 500 millones (requisito RN-008).' }),
  Object.freeze({ id: 'premium', name: 'Premium', dailyPrice: 70000, description: 'Cubrimiento total según RN-008; términos finales pendientes.' }),
]);

export const demoConversion = Object.freeze({ USD: 4000, EUR: 4400 });
