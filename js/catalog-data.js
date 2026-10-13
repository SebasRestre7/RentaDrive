// These three records reproduce the examples visible in Figma, not live inventory.
export const demoVehicles = Object.freeze([
  Object.freeze({
    id: 'toyota-hilux', name: 'Toyota Hilux', brand: 'Toyota', type: 'Camioneta',
    passengers: 5, bags: 4, transmission: 'Mecánica', fuel: 'Diésel', price: 200000,
    image: './assets/catalog/toyota-card.png', video:'./assets/catalog/toyota-demo.webm', feature: 'Aire acondicionado',
  }),
  Object.freeze({
    id: 'mazda-cx-5', name: 'Mazda CX-5', brand: 'Mazda', type: 'Camioneta',
    passengers: 5, bags: 4, transmission: 'Automática', fuel: 'Diésel', price: 180000,
    image: './assets/catalog/mazda-card.png', video:'./assets/catalog/mazda-demo.webm', feature: 'Cámara de reversa',
  }),
  Object.freeze({
    id: 'renault-sandero', name: 'Renault Sandero', brand: 'Renault', type: 'Económico',
    passengers: 5, bags: 2, transmission: 'Mecánica', fuel: 'Diésel', price: 80000,
    image: './assets/catalog/sandero-card.png', video:'./assets/catalog/sandero-demo.webm', feature: 'Aire acondicionado',
  }),
]);

export const demoPriceBounds = Object.freeze({ min: 50000, max: 500000 });

export function deriveDemoPriceBounds(vehicles, baseline = demoPriceBounds) {
  const prices = vehicles.map(vehicle => Number(vehicle.price)).filter(price => Number.isFinite(price) && price >= 0);
  return {
    min: Math.floor(Math.min(baseline.min, ...prices) / 10000) * 10000,
    max: Math.ceil(Math.max(baseline.max, ...prices) / 10000) * 10000,
  };
}

export function filterDemoVehicles(vehicles, filters) {
  return vehicles.filter(vehicle =>
    (!filters.type.length || filters.type.includes(vehicle.type)) &&
    (!filters.transmission.length || filters.transmission.includes(vehicle.transmission)) &&
    (!filters.fuel.length || filters.fuel.includes(vehicle.fuel)) &&
    (!filters.brand || filters.brand === vehicle.brand) &&
    vehicle.price >= filters.minPrice && vehicle.price <= filters.maxPrice
  );
}

export function sortDemoVehicles(vehicles, order) {
  const sorted = [...vehicles];
  if (order === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  if (order === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  return sorted;
}

export function formatDemoPrice(value) {
  return `COP ${new Intl.NumberFormat('es-CO').format(value)}`;
}

export function formatDemoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${day} ${months[month - 1]} ${year}`;
}
