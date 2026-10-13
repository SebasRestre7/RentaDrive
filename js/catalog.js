import { openDialog, closeDialog } from './components/dialog.js';
import { createStore } from './core/storage.js';
import { demoVehicles, deriveDemoPriceBounds, filterDemoVehicles, sortDemoVehicles, formatDemoPrice, formatDemoDate } from './catalog-data.js';
import { demoCities } from './services/demo-data.js';
import { listFleet } from './services/fleet.js';
import { availableFleet } from './services/availability.js';
import { listReservations } from './services/reservations.js';
import { validPeriod } from './services/periods.js';
import { currentAccount } from './services/auth.js';
import { effectiveDailyRate } from './services/configuration.js';

const searchStore = createStore('catalog-search', 'session');
const favoritesStore = createStore('catalog-favorites');
const cities = demoCities;
function futureDate(days) { const date = new Date(); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
const defaultSearch = { city: 'Medellín', startDate: futureDate(1), endDate: futureDate(4), startTime: '10:00', endTime: '10:00' };
const filterChoices = {
  type: ['Económico', 'SUV', 'Camioneta', 'Lujo'],
  transmission: ['Automática', 'Mecánica'],
  fuel: ['Gasolina', 'Híbrido', 'Eléctrico', 'Diésel'],
};
const choicesFor = group => group === 'type' ? [...new Set([...filterChoices.type,...listFleet().map(item=>item.type).filter(Boolean)])] : filterChoices[group];
function currentPriceBounds() { return deriveDemoPriceBounds(listFleet().map(vehicle=>({...vehicle,price:effectiveDailyRate(vehicle)}))); }
let priceBounds = currentPriceBounds();
const defaultFilters = () => ({ type: [], transmission: [], fuel: [], brand: '', minPrice: priceBounds.min, maxPrice: priceBounds.max });
let filters = defaultFilters();
let sort = 'recommended';
let search = readSearch();
const savedFavorites = favoritesStore.get('ids', []);
let favorites = new Set((Array.isArray(savedFavorites) ? savedFavorites : []).filter(id => listFleet().some(vehicle => vehicle.id === id)));
let favoritesOnly = new URLSearchParams(location.search).has('favorites');
let currentVehicle = null;
let returnDetailId = null;
let toastTimer;
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const layout = document.querySelector('#catalog-layout');
const detail = document.querySelector('#detail-view');
const list = document.querySelector('#vehicle-list');
const sortMenu = document.querySelector('#sort-menu');
const sortTrigger = document.querySelector('#sort-trigger');
const layer = document.querySelector('#dialog-layer');

function readSearch() {
  const saved = searchStore.get('criteria', {});
  return {
    city: cities.includes(saved?.city) ? saved.city : defaultSearch.city,
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(saved?.startDate ?? '') ? saved.startDate : defaultSearch.startDate,
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(saved?.endDate ?? '') ? saved.endDate : defaultSearch.endDate,
    startTime: /^\d{2}:\d{2}$/.test(saved?.startTime ?? '') ? saved.startTime : defaultSearch.startTime,
    endTime: /^\d{2}:\d{2}$/.test(saved?.endTime ?? '') ? saved.endTime : defaultSearch.endTime,
  };
}

function searchPeriod() { return { startAt: `${search.startDate}T${search.startTime}`, endAt: `${search.endDate}T${search.endTime}` }; }
function matchingAvailableVehicles() { const { startAt, endAt } = searchPeriod(); return availableFleet(search.city, startAt, endAt, listReservations()).map(vehicle => ({...vehicle, price:effectiveDailyRate(vehicle)})); }

function vehiclesForView() {
  const available=matchingAvailableVehicles();
  return favoritesOnly ? listFleet().filter(item=>favorites.has(item.id)).map(item=>({...item,price:effectiveDailyRate(item),unavailable:!available.some(vehicle=>vehicle.id===item.id)})) : available;
}

function announce(message) {
  const toast = document.querySelector('#catalog-toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
}

function renderSearch() {
  document.querySelector('#search-dates').textContent = `${formatDemoDate(search.startDate)} ${search.startTime} – ${formatDemoDate(search.endDate)} ${search.endTime}`;
  document.querySelector('#search-city').textContent = search.city;
}

function renderFilterGroup(group, targetId) {
  document.querySelector(targetId).innerHTML = choicesFor(group).map(value => {
    const count = vehiclesForView().filter(vehicle => vehicle[group] === value).length;
    const checked = filters[group].includes(value) ? ' checked' : '';
    return `<label class="filter-option"><input type="checkbox" data-filter-group="${group}" value="${value}"${checked}><span>${value} (${count})</span></label>`;
  }).join('');
}

function renderPriceRange() {
  const minimum = document.querySelector('#min-price');
  const maximum = document.querySelector('#max-price');
  for (const input of [minimum,maximum]) { input.min=priceBounds.min; input.max=priceBounds.max; }
  minimum.value = filters.minPrice;
  maximum.value = filters.maxPrice;
  minimum.style.zIndex = filters.minPrice >= priceBounds.max - 20000 ? '2' : '1';
  maximum.style.zIndex = '2';
  const scale = priceBounds.max - priceBounds.min;
  document.querySelector('#price-range').style.setProperty('--start', `${((filters.minPrice - priceBounds.min) / scale) * 100}%`);
  document.querySelector('#price-range').style.setProperty('--end', `${((filters.maxPrice - priceBounds.min) / scale) * 100}%`);
  document.querySelector('#min-price-label').textContent = formatDemoPrice(filters.minPrice);
  document.querySelector('#max-price-label').textContent = formatDemoPrice(filters.maxPrice);
}

function renderFilters() {
  renderFilterGroup('type', '#type-filters');
  renderFilterGroup('transmission', '#transmission-filters');
  renderFilterGroup('fuel', '#fuel-filters');
  document.querySelector('#brand-filter').textContent = filters.brand || 'Todas las marcas';
  renderPriceRange();
}

function cardMarkup(vehicle) {
  const chosen = favorites.has(vehicle.id);
  return `<article class="vehicle-card">
    <img class="vehicle-card__photo" src="${vehicle.image}" alt="${escapeText(vehicle.name)}" width="210" height="132">
    <div class="vehicle-card__content">
      <h3>${escapeText(vehicle.name)}</h3><p class="vehicle-card__type">${escapeText(vehicle.type)}</p>
      <p class="vehicle-card__specs">${vehicle.passengers} pasajeros&nbsp;&nbsp; · &nbsp;${vehicle.bags} maletas&nbsp;&nbsp; · &nbsp;${escapeText(vehicle.transmission)}&nbsp;&nbsp; · &nbsp;${escapeText(vehicle.fuel)}</p>
      <p class="vehicle-card__price">${formatDemoPrice(vehicle.price)}/día</p>${vehicle.unavailable?'<p class="vehicle-card__unavailable">No disponible en esta búsqueda</p>':''}
    </div>
    <div class="vehicle-card__actions">
      <button class="favorite-button" type="button" data-favorite="${escapeText(vehicle.id)}" aria-label="${chosen ? 'Quitar' : 'Marcar'} ${escapeText(vehicle.name)} como favorito" aria-pressed="${chosen}"><img src="./assets/catalog/heart.svg" alt="" width="24" height="24"></button>
      <button class="catalog-button" type="button" data-detail="${escapeText(vehicle.id)}">Ver detalles →</button>
    </div>
  </article>`;
}

function emptyReason() {
  const {startAt,endAt}=searchPeriod();
  if (!validPeriod(startAt,endAt)) return 'El período no es futuro o su fin no es posterior al inicio. Modifica fecha y hora.';
  const inCity=listFleet().filter(item=>item.city===search.city);
  if (!inCity.length) return `No hay unidades ficticias publicadas en ${search.city}. Prueba otra sede.`;
  if (!inCity.some(item=>item.state==='available')) return 'Todas las unidades de esta sede tienen un estado no reservable. Prueba otra sede.';
  if (!matchingAvailableVehicles().length) return 'Las unidades reservables de esta sede están ocupadas en ese período. Prueba otras fechas.';
  return 'Los filtros de gama, marca o costo excluyen los resultados disponibles. Cambia o limpia los filtros.';
}

function renderResults() {
  document.querySelector('#header-favorites').setAttribute('aria-pressed',String(favoritesOnly));
  document.title=favoritesOnly?'RentaDrive · Favoritos':'RentaDrive · Catálogo';
  const vehicles = sortDemoVehicles(filterDemoVehicles(vehiclesForView(), filters), sort);
  document.querySelector('#results-heading').textContent = `${favoritesOnly?'Favoritos':'Resultados'} (${vehicles.length} ${vehicles.length === 1 ? 'vehículo' : 'vehículos'})`;
  list.innerHTML = vehicles.length ? vehicles.map(cardMarkup).join('') : `<div class="empty-results"><h3>${favoritesOnly?'Sin favoritos para estos filtros':'No hay vehículos disponibles'}</h3><p>${favoritesOnly?'Marca el corazón de un vehículo en el catálogo o limpia los filtros.':emptyReason()}</p></div>`;
  const disclaimer = document.querySelector('.demo-disclaimer');
  if (disclaimer) disclaimer.textContent = `Flota, tarifas y disponibilidad locales de demostración · ${search.city} · período [inicio, fin).`;
  const labels = { recommended: 'Recomendados', 'price-asc': 'Menor precio', 'price-desc': 'Mayor precio' };
  document.querySelector('#sort-label').textContent = `Ordenar: ${labels[sort]}`;
  sortMenu.querySelectorAll('[data-sort]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.sort === sort)));
}

function renderDetail(vehicle) {
  const detailTransmission = vehicle.transmission === 'Mecánica' ? 'manual' : vehicle.transmission.toLowerCase();
  const specs = [
    `${vehicle.passengers} pasajeros`, `${vehicle.bags} maletas`, `Transmisión ${detailTransmission}`,
    `Combustible ${vehicle.fuel.toLowerCase()}`, vehicle.feature, 'Kilometraje incluido',
  ];
  detail.innerHTML = `<img class="vehicle-detail__image" src="${vehicle.image}" alt="${escapeText(vehicle.name)}" width="500" height="480">
    <div class="vehicle-detail__info">
      <span class="vehicle-detail__tag">${escapeText(vehicle.type)}</span>
      <h1 id="detail-title">${escapeText(vehicle.name)}</h1>
      <p class="vehicle-detail__subtitle">Ideal para recorrer ${escapeText(search.city)} con comodidad y seguridad.</p>
      <ul class="vehicle-detail__specs">${specs.map(spec => `<li>${escapeText(spec)}</li>`).join('')}</ul>
      <p class="vehicle-detail__price">${formatDemoPrice(vehicle.price)}/día</p>
      <div class="vehicle-detail__actions"><button class="detail-button detail-button--secondary" type="button" id="back-to-results">← Volver</button><button class="detail-button" type="button" id="reserve-now"${vehicle.unavailable?' disabled':''}>Reservar ahora</button></div>
      <p class="vehicle-detail__note">La reserva requiere cuenta cliente y se revalida al confirmar.</p>
      ${vehicle.video ? `<details class="vehicle-detail__video"><summary>Ver video ficticio del vehículo</summary><video controls preload="none" poster="${vehicle.image}" width="360"><source src="${vehicle.video}" type="video/webm">Tu navegador no admite este video.</video></details>` : '<p class="vehicle-detail__note">Video no disponible para esta ficha ficticia.</p>'}
    </div>`;
}

function showDetail(id, updateHash = true) {
  const available=matchingAvailableVehicles();
  const item=listFleet().find(item=>item.id===id);
  const vehicle=available.find(item=>item.id===id) ?? (favoritesOnly&&favorites.has(id)&&item ? {...item,price:effectiveDailyRate(item),unavailable:true}:null);
  if (!vehicle) return;
  currentVehicle = vehicle;
  returnDetailId = id;
  renderDetail(vehicle);
  layout.hidden = true;
  detail.hidden = false;
  if (updateHash) history.pushState({ catalogDetail: id }, '', `#${vehicle.id}`);
  detail.querySelector('#detail-title').setAttribute('tabindex', '-1');
  detail.querySelector('#detail-title').focus();
}

function showResults(updateHash = true) {
  currentVehicle = null;
  detail.hidden = true;
  layout.hidden = false;
  if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}`);
  const button = list.querySelector(`[data-detail="${returnDetailId}"]`) ?? list.querySelector('[data-detail]') ?? document.querySelector('#edit-search');
  button?.focus();
}

function openEditSearch() {
  const markup = `<form class="catalog-dialog" id="catalog-search-form">
    <h2 id="dialog-title">Modificar búsqueda</h2>
    <label class="catalog-dialog__field">Fecha de recogida<input name="startDate" type="date" value="${search.startDate}" required></label>
    <label class="catalog-dialog__field">Hora de recogida<input name="startTime" type="time" value="${search.startTime}" required></label>
    <label class="catalog-dialog__field">Fecha de devolución<input name="endDate" type="date" value="${search.endDate}" required></label>
    <label class="catalog-dialog__field">Hora de devolución<input name="endTime" type="time" value="${search.endTime}" required></label>
    <label class="catalog-dialog__field">Ciudad<select name="city">${cities.map(city => `<option value="${city}"${city === search.city ? ' selected' : ''}>${city}</option>`).join('')}</select></label>
    <p class="catalog-dialog__notice">Consulta local de demostración por sede, estado y período [inicio, fin). La hora final no se incluye.</p>
    <p class="catalog-dialog__error" id="search-error" role="alert" hidden></p>
    <div class="catalog-dialog__actions"><button class="detail-button detail-button--secondary" type="button" data-close-dialog>Cancelar</button><button class="detail-button" type="submit">Aplicar cambios</button></div>
  </form>`;
  openDialog(markup, 520, 'catalog-edit');
}

function openBrandFilter() {
  const brands = ['', ...new Set(listFleet().map(vehicle => vehicle.brand).filter(Boolean))];
  const markup = `<div class="catalog-dialog catalog-dialog--brand"><h2 id="dialog-title">Filtrar por marca</h2>
    <p class="catalog-dialog__notice">Filtra vehículos ficticios disponibles en la búsqueda actual.</p>
    ${brands.map(brand => `<button class="brand-choice" type="button" data-brand="${escapeText(brand)}" aria-pressed="${filters.brand === brand}">${escapeText(brand || 'Todas las marcas')}</button>`).join('')}
    <button class="detail-button detail-button--secondary" type="button" data-close-dialog>Cerrar</button>
  </div>`;
  openDialog(markup, 420, 'catalog-brand');
}

function openSort() {
  sortMenu.hidden = false;
  sortTrigger.setAttribute('aria-expanded', 'true');
  sortMenu.querySelector('[data-sort]')?.focus();
}

function closeSort(restoreFocus = true) {
  sortMenu.hidden = true;
  sortTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) sortTrigger.focus();
}

document.addEventListener('change', event => {
  const group = event.target.dataset.filterGroup;
  if (group && choicesFor(group)?.includes(event.target.value)) {
    filters[group] = [...document.querySelectorAll(`[data-filter-group="${group}"]:checked`)].map(input => input.value);
    renderResults();
  }
});

document.addEventListener('input', event => {
  if (event.target.id !== 'min-price' && event.target.id !== 'max-price') return;
  const value = Number(event.target.value);
  if (event.target.id === 'min-price') filters.minPrice = Math.min(value, filters.maxPrice);
  else filters.maxPrice = Math.max(value, filters.minPrice);
  renderPriceRange();
  renderResults();
});

document.addEventListener('click', event => {
  if (event.target.closest('#edit-search, #header-search')) { openEditSearch(); return; }
  if (event.target.closest('#brand-filter')) { openBrandFilter(); return; }
  if (event.target.closest('#clear-filters')) { filters = defaultFilters(); renderFilters(); renderResults(); return; }
  if (event.target.closest('#sort-trigger')) {
    if (sortMenu.hidden) openSort(); else closeSort();
    return;
  }
  const sortChoice = event.target.closest('[data-sort]');
  if (sortChoice) { sort = sortChoice.dataset.sort; renderResults(); closeSort(); return; }
  if (!sortMenu.hidden && !event.target.closest('#sort-menu')) { closeSort(false); }
  const brandChoice = event.target.closest('[data-brand]');
  if (brandChoice) { filters.brand = brandChoice.dataset.brand; renderFilters(); renderResults(); closeDialog(); return; }
  const favorite = event.target.closest('[data-favorite]');
  if (favorite) {
    if (favorites.has(favorite.dataset.favorite)) favorites.delete(favorite.dataset.favorite);
    else favorites.add(favorite.dataset.favorite);
    favoritesStore.set('ids', [...favorites]);
    renderFilters();renderResults();
    list.querySelector(`[data-favorite="${favorite.dataset.favorite}"]`)?.focus();
    return;
  }
  const details = event.target.closest('[data-detail]');
  if (details) { showDetail(details.dataset.detail); return; }
  if (event.target.closest('#back-to-results')) {
    if (history.state?.catalogDetail === currentVehicle?.id) history.back();
    else showResults();
    return;
  }
  if (event.target.closest('#reserve-now')) {
    const account = currentAccount();
    if (!account) { window.location.assign(`./index.html?auth=login&return=${currentVehicle.id}`); return; }
    if (account.role !== 'client') { announce('Solo una cuenta cliente puede reservar. El personal demo no puede hacerlo.'); return; }
    const { startAt, endAt } = searchPeriod();
    if (currentVehicle.unavailable || !validPeriod(startAt, endAt) || !matchingAvailableVehicles().some(item => item.id === currentVehicle.id)) { announce('La disponibilidad cambió. Modifica tu búsqueda.'); renderFilters(); renderResults(); showResults(); return; }
    const bookingStore = createStore('booking-draft');
    bookingStore.set('current', { vehicleId: currentVehicle.id, city: search.city, startAt, endAt, requestId: crypto.randomUUID() });
    window.location.assign('./booking.html');
    return;
  }
  if (event.target.closest('#header-favorites')) {
    favoritesOnly=!favoritesOnly;
    history.replaceState(null,'',favoritesOnly?'./catalog.html?favorites':'./catalog.html');
    document.querySelector('#header-favorites').setAttribute('aria-pressed',String(favoritesOnly));
    filters=defaultFilters(); showResults(false); renderFilters();renderResults();
  }
});

layer.addEventListener('submit', event => {
  if (event.target.id !== 'catalog-search-form') return;
  event.preventDefault();
  const form = event.target;
  const startDate = form.elements.startDate.value;
  const endDate = form.elements.endDate.value;
  const startTime = form.elements.startTime.value;
  const endTime = form.elements.endTime.value;
  if (!validPeriod(`${startDate}T${startTime}`, `${endDate}T${endTime}`)) {
    const error = form.querySelector('#search-error');
    error.textContent = 'Selecciona fecha y hora futuras; la devolución debe ser posterior a la recogida.';
    error.hidden = false;
    form.elements.endDate.focus();
    return;
  }
  search = { city: form.elements.city.value, startDate, endDate, startTime, endTime };
  searchStore.set('criteria', search);
  renderSearch();
  if (currentVehicle && !matchingAvailableVehicles().some(item => item.id === currentVehicle.id)) showResults();
  else if (currentVehicle) renderDetail(currentVehicle);
  renderFilters(); renderResults();
  closeDialog();
  announce('Disponibilidad ficticia recalculada para sede y período seleccionados.');
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !sortMenu.hidden) { event.preventDefault(); closeSort(); }
});

window.addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (listFleet().some(vehicle => vehicle.id === id)) showDetail(id, false);
  else showResults(false);
});

window.addEventListener('storage', event => {
  if (!event.key?.startsWith('rentadrive:fleet:') && !event.key?.startsWith('rentadrive:configuration:')) return;
  const previous = priceBounds;
  priceBounds = currentPriceBounds();
  if (filters.minPrice === previous.min) filters.minPrice = priceBounds.min;
  if (filters.maxPrice === previous.max) filters.maxPrice = priceBounds.max;
  renderFilters(); renderResults();
});

renderSearch();
renderFilters();
renderResults();
const initialId = location.hash.slice(1);
if (listFleet().some(vehicle => vehicle.id === initialId)) showDetail(initialId, false);
