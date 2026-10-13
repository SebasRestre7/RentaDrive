import { selectSessionMedia, sessionMedia } from './core/media.js';
import { reportsMarkup } from './components/reports.js';
import { currentAccount, logout, listDemoAccounts, assignDemoRole } from './services/auth.js';
import { createStore } from './core/storage.js';
import { localDateNow } from './services/periods.js';
import { listFleet, changeFleetState, saveDemoVehicle, listMaintenance, saveDemoMaintenance, closeDemoMaintenance } from './services/fleet.js';
import { listReservations } from './services/reservations.js';
import { listConfiguration, publishDemoConfiguration } from './services/configuration.js';
import { filterDemoAudit, recordDemoEvent } from './services/audit.js';
import { findDemoReservation, demoDeliveryAlternatives, reassignDemoDelivery, extendDemoDelivery, registerDemoDelivery, listDemoDeliveries } from './services/delivery.js';

const account = currentAccount();
const content = document.querySelector('#staff-content');
const notice = document.querySelector('#staff-notice');
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => `COP ${new Intl.NumberFormat('es-CO').format(value ?? 0)}`;
const today = localDateNow;
const roleName = {client:'Cliente',coordinator:'Coordinador',admin:'Administrador'};
let tab = account?.role === 'coordinator' ? 'delivery' : 'fleet';
let selectedReservation = null;
let selectedVehicle = null;
let selectedAccount = null;
let lastDelivery = null;
let photos = [];
let auditFilters = {};
let auditPage=0;
const actions={fleet:'fleet-state-form',config:'rate-form',delivery:'delivery-form'};

if (!account || !['coordinator','admin'].includes(account.role)) {
  content.innerHTML = '<section class="staff-card"><h1>Acceso restringido</h1><p>Inicia sesión localmente con una cuenta ficticia de coordinación o administración.</p><a href="./index.html?auth=login">Volver al acceso</a></section>';
  document.querySelector('.staff-side').hidden = true;
} else {
  document.querySelector('#staff-role').textContent = account.role === 'admin' ? 'ADMINISTRADOR' : 'COORDINADOR';
  document.querySelector('#staff-account').textContent = account.email;
}

function notify(message, error=false) { notice.textContent = message; notice.className = error ? 'staff-error' : 'staff-success'; }
function tabs() { return account.role === 'admin' ? [['fleet','Vehículos y estados'],['config','Tarifas y convenios'],['roles','Roles y bitácora'],['reports','Reportes']] : [['delivery','Entregas']]; }
function render() {
  document.querySelector('#staff-nav').innerHTML = tabs().map(([id,label])=>`<button type="button" data-tab="${id}"${id===tab?' aria-current="page"':''}>${label}</button>`).join('');
  const heading = {fleet:'Vehículos y estados',config:'Tarifas, pólizas y convenios',roles:'Roles y bitácora',delivery:'Entregas de demostración',reports:'Reportes'}[tab];
  document.querySelector('#staff-heading').textContent = heading;
  document.querySelector('#staff-intro').textContent = '';
  document.querySelector('.staff-demo').hidden=tab==='reports';
  content.innerHTML = tab==='reports' ? reportsMarkup() : tab === 'fleet' ? fleetMarkup() : tab === 'config' ? configMarkup() : tab === 'roles' ? rolesMarkup() : deliveryMarkup();
  actionPanels();
  for (const wrapper of content.querySelectorAll('.staff-table-wrap')) {
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role','region');
    const title = wrapper.closest('.staff-card')?.querySelector('h2')?.textContent ?? 'Datos';
    wrapper.setAttribute('aria-label',`${title}: tabla con desplazamiento horizontal`);
    const cue = document.createElement('p');
    cue.className = 'staff-table-cue';
    cue.textContent = 'Desliza horizontalmente o usa las flechas con la tabla enfocada para ver todas las columnas.';
    wrapper.before(cue);
  }
  updateTableCues();
}
const field = (label,name,type='text',value='',extra='') => `<label class="staff-field">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const select = (label,name,items,selected='') => `<label class="staff-field">${label}<select name="${name}">${items.map(([value,text])=>`<option value="${escape(value)}"${value===selected?' selected':''}>${escape(text)}</option>`).join('')}</select></label>`;
const states = [['available','Disponible'],['rented','Alquilado'],['maintenance','Mantenimiento'],['contingency','Contingencia']];
if (account && ['coordinator','admin'].includes(account.role)) render();

function fleetMarkup() {
  const fleet = listFleet();
  const vehicle = fleet.find(item=>item.id===selectedVehicle) ?? fleet[0];
  if (!selectedVehicle) selectedVehicle=vehicle?.id;
  return `<section class="staff-card"><h2>Flota y disponibilidad</h2><p class="staff-note">Solo las unidades disponibles en la sede y sin reserva solapada aparecen en el catálogo. Transiciones oficiales y autorización de contingencia pendientes; esta vista no asigna contingencias.</p><div class="staff-table-wrap"><table class="staff-table"><thead><tr><th>Unidad</th><th>Sede</th><th>Estado</th><th>Reservas confirmadas</th><th>Acción</th></tr></thead><tbody>${fleet.map(item=>`<tr><td>${escape(item.name)}<br><small>${escape(item.id)}</small></td><td>${escape(item.city)}</td><td><span class="staff-badge${item.state==='available'?'':' staff-badge--blocked'}">${escape(states.find(s=>s[0]===item.state)?.[1]??item.state)}</span></td><td>${listReservations().filter(r=>r.vehicleId===item.id&&r.status==='confirmed').length}</td><td><button type="button" data-select-vehicle="${escape(item.id)}">Seleccionar</button></td></tr>`).join('')}</tbody></table></div></section>
  <section class="staff-card"><h2>Estado y contingencia · ${escape(vehicle?.name)}</h2><form id="fleet-state-form"><input type="hidden" name="vehicleId" value="${escape(vehicle?.id)}"><div class="staff-grid">${select('Nuevo estado','nextState',states,vehicle?.state)}${field('Motivo obligatorio','reason','text','','required')}</div><p class="staff-note">Se rechaza repetir estado, marcar «alquilado» manualmente o retirar una unidad con reservas confirmadas. El catálogo se recalcula desde el estado local.</p><div class="staff-actions"><button class="staff-button" type="submit">Actualizar estado</button></div></form></section>
  <section class="staff-card"><h2>Mantenimiento vinculado</h2><form id="maintenance-form"><input type="hidden" name="vehicleId" value="${escape(vehicle?.id)}"><div class="staff-grid">${field('Motivo de mantenimiento','reason','text','','required')}</div><div class="staff-actions"><button class="staff-button staff-button--secondary" type="submit">Abrir mantenimiento</button></div></form><ul>${listMaintenance().filter(item=>item.vehicleId===vehicle?.id).map(item=>`<li>${escape(item.reason)} · ${escape(item.status)} ${item.status==='open'?`<button class="staff-button staff-button--secondary" type="button" data-close-maintenance="${escape(item.id)}">Cerrar</button>`:''}</li>`).join('')||'<li>Sin registros de mantenimiento.</li>'}</ul></section>
  <section class="staff-card"><h2>Ficha de vehículo</h2><p class="staff-note">Las rutas empaquetadas se conservan. Selección local: solo durante esta página; al recargar se restauran. Sin carga a servidor.</p><form id="vehicle-form"><div class="staff-grid staff-grid--three">${select('Acción','mode',[['create','Registrar nueva'],['update','Editar seleccionada']])}${field('ID único','id','text','','required')}${field('Marca','brand','text','','required')}${field('Modelo / nombre','name','text','','required')}${field('Gama','type','text','','required')}${select('Sede','city',['Medellín','Bogotá','Cartagena','Cali'].map(x=>[x,x]))}${field('Pasajeros','passengers','number','5','min="1" required')}${field('Maletas','bags','number','2','min="0" required')}${field('Kilometraje','mileage','number','1000','min="0" required')}${field('Color','color','text','','required')}${field('Consumo','consumption','text','','required')}${field('Combustible','fuel','text','','required')}${field('Característica','feature','text','','required')}${field('Puertas','doors','number','4','min="1" required')}${select('Transmisión','transmission',[['Mecánica','Mecánica'],['Automática','Automática']])}${field('Categoría licencia declarada','licenseCategory','text','','required')}${field('Tarifa COP/día','price','number','80000','min="1" required')}${field('Imagen local','image','text','./assets/catalog/sandero-card.png','required')}${field('Video local','video','text','./assets/catalog/sandero-demo.webm','required')}</div><div class="staff-grid"><label class="staff-field">Imagen PNG/JPEG/WebP · máx. 2 MB<input type="file" id="vehicle-image-file" accept="image/png,image/jpeg,image/webp"></label><label class="staff-field">Video WebM/MP4 · máx. 20 MB<input type="file" id="vehicle-video-file" accept="video/webm,video/mp4"></label></div><div id="vehicle-media-preview" class="staff-media-preview"></div><div class="staff-actions"><button class="staff-button staff-button--secondary" id="load-selected-vehicle" type="button">Cargar unidad seleccionada</button><button class="staff-button" type="submit">Guardar ficha</button></div></form></section>`;
}

function configMarkup() {
  const rows = ['rate','policy','agreement'].flatMap(kind=>listConfiguration(kind).map(item=>`<tr><td>${kind}</td><td>${escape(item.gama??item.policyId??item.company)}</td><td>${escape(item.validFrom)} → ${escape(item.validThrough)}</td><td>${item.validThrough < today()?'Vencida':'Vigente o futura'}</td></tr>`));
  return `<section class="staff-card"><h2>Configuración publicada</h2><p class="staff-note">Datos ficticios. Solo configuraciones vigentes se aplican a cotizaciones nuevas; las reservas guardan su precio anterior. La tarifa por kilómetro se guarda, pero no se calcula sin una fórmula aprobada.</p><div class="staff-table-wrap"><table class="staff-table"><thead><tr><th>Tipo</th><th>Alcance</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="4">Sin cambios publicados; se usan precios demo base.</td></tr>'}</tbody></table></div></section>
  <div class="staff-grid"><section class="staff-card"><h2>Tarifa por gama y kilometraje</h2><form id="rate-form">${select('Tarifa a editar (crea revisión)','sourceId',[['','Nueva tarifa'],...listConfiguration('rate').map(item=>[item.id,`${item.gama} · ${item.amountCop} · ${item.validFrom} → ${item.validThrough}`])])}<div class="staff-grid">${select('Gama','gama',[['Camioneta','Camioneta'],['Económico','Económico'],['SUV','SUV'],['Lujo','Lujo']])}${select('Modalidad','mode',[['daily','Por día'],['kilometre','Por kilómetro (pendiente de fórmula)']])}${field('Km mínimo','kmMin','number','0','min="0" required')}${field('Km máximo','kmMax','number','999999','min="0" required')}${field('Valor COP','amountCop','number','','min="1" required')}${field('Desde','validFrom','date',today(),'required')}${field('Hasta','validThrough','date',today(),'required')}</div><div class="staff-actions"><button class="staff-button" type="submit">Publicar tarifa</button></div></form></section>
  <section class="staff-card"><h2>Póliza y cobertura</h2><form id="policy-form"><div class="staff-grid">${select('Póliza','policyId',[['basic','Básica'],['intermediate','Intermedia'],['premium','Premium']])}${field('Precio diario COP','dailyPrice','number','','min="0" required')}${field('Cobertura declarada','coverage','text','','required')}${field('Desde','validFrom','date',today(),'required')}${field('Hasta','validThrough','date',today(),'required')}</div><div class="staff-actions"><button class="staff-button" type="submit">Publicar póliza</button></div></form></section></div>
  <section class="staff-card"><h2>Convenio empresarial</h2><form id="agreement-form"><div class="staff-grid staff-grid--three">${field('Empresa ficticia','company','text','','required')}${field('Descuento del alquiler %','discountPercent','number','5','min="5" max="10" required')}${field('Desde','validFrom','date',today(),'required')}${field('Hasta','validThrough','date',today(),'required')}</div><p class="staff-note">Entre 5 % y 10 % solo sobre alquiler; no se activa automáticamente en una reserva sin identificación de convenio aprobada. Conversiones USD/EUR del prototipo no son TRM vigente.</p><div class="staff-actions"><button class="staff-button" type="submit">Publicar convenio</button></div></form></section>`;
}

function rolesMarkup() {
  const accounts = listDemoAccounts(account);
  const selected = accounts.find(item=>item.id===selectedAccount) ?? accounts[0];
  if (!selectedAccount) selectedAccount=selected?.id;
  const allEvents = filterDemoAudit(account,auditFilters).slice().reverse();
  const pages=Math.max(1,Math.ceil(allEvents.length/10));auditPage=Math.min(auditPage,pages-1);
  const events=allEvents.slice(auditPage*10,auditPage*10+10);
  return `<section class="staff-card"><h2>Usuarios y permisos</h2><p class="staff-note">Registro público: cliente. Solo administración reasigna los tres roles RN-004 en esta demostración local. No es seguridad de producción.</p><div class="staff-table-wrap"><table class="staff-table"><thead><tr><th>Correo ficticio</th><th>Rol</th><th>Acción</th></tr></thead><tbody>${accounts.map(item=>`<tr><td>${escape(item.email)}</td><td>${escape(roleName[item.role])}</td><td><button type="button" data-select-account="${escape(item.id)}">Seleccionar</button></td></tr>`).join('')}</tbody></table></div></section>
  ${selected?`<section class="staff-card"><h2>Asignar rol · ${escape(selected.email)}</h2><form id="role-form"><input type="hidden" name="accountId" value="${escape(selected.id)}"><div class="staff-grid">${select('Rol permitido','role',[['client','Cliente'],['coordinator','Coordinador'],['admin','Administrador']],selected.role)}</div><div class="staff-actions"><button class="staff-button" type="submit">Guardar rol y auditar</button></div></form></section>`:''}
  <section class="staff-card"><h2>Bitácora local de operaciones</h2><p class="staff-note">Consulta de solo lectura desde esta interfaz. LocalStorage puede alterarse o borrarse fuera de ella: no es un registro inmutable.</p><form id="audit-form" class="staff-grid staff-grid--three">${field('Actor ID','actorId','text',auditFilters.actorId??'')}${field('Acción contiene','action','text',auditFilters.action??'')}${select('Resultado','result',[['','Todos'],['success','Correcto'],['rejected','Rechazado']],auditFilters.result??'')}${field('Referencia contiene','reference','text',auditFilters.reference??'')}<div class="staff-actions"><button class="staff-button" type="submit">Filtrar</button></div></form><div class="staff-table-wrap"><table class="staff-table"><thead><tr><th>Fecha y hora</th><th>Actor</th><th>Acción</th><th>Resultado</th><th>Referencia</th></tr></thead><tbody>${events.map(item=>`<tr><td>${escape(item.at)}</td><td>${escape(item.actorId)}<br><small>${escape(item.role)}</small></td><td>${escape(item.action)}</td><td>${escape(item.result)}</td><td>${escape(item.reference)}</td></tr>`).join('')||'<tr><td colspan="5">No hay eventos para estos filtros.</td></tr>'}</tbody></table></div><div class="staff-actions"><button type="button" data-audit-page="-1"${auditPage===0?' disabled':''}>Anterior</button><span id="audit-page-label">Página ${auditPage+1} de ${pages} · ${allEvents.length} eventos</span><button type="button" data-audit-page="1"${auditPage===pages-1?' disabled':''}>Siguiente</button></div></section>`;
}

function deliveryMarkup() {
  const reservation = selectedReservation ? listReservations().find(item=>item.id===selectedReservation) : null;
  const vehicle = reservation && listFleet().find(item=>item.id===reservation.vehicleId);
  const existing = reservation && listDemoDeliveries(account).find(item=>item.reservationId===reservation.id);
  return `<section class="staff-card"><h2>Buscar reserva confirmada</h2><form id="find-form" class="staff-grid"><label class="staff-field">QR leído, código de reserva o documento ficticio<input name="query" autocomplete="off" required placeholder="RD-…"></label><div class="staff-actions"><button class="staff-button" type="submit">Buscar</button></div></form></section>
  ${reservation?`<section class="staff-card"><h2>Reserva ${escape(reservation.id)}</h2><p>${escape(vehicle?.name)} · ${escape(reservation.city)} · ${escape(reservation.startAt)} → ${escape(reservation.endAt)}</p><p class="staff-note">Licencia vigente: ${escape((awaitingAccount(reservation.accountId))?.licenseExpiry??'sin dato')} · Categoría: ${escape((awaitingAccount(reservation.accountId))?.licenseCategory??'sin dato')}. No existe matriz oficial de categorías: debe verificarse manualmente y registrarse esa verificación.</p>${existing?`<p class="staff-success">Entrega registrada el ${escape(existing.deliveredAt)}. Firma, anticipo y correo: simulados.</p><button class="staff-button staff-button--secondary" type="button" id="show-acta">Ver contrato y acta simulados</button>`:`<div class="staff-grid"><section><h3>Cambio de vehículo</h3><form id="reassign-form">${select('Alternativa disponible en sede y período','vehicleId',demoDeliveryAlternatives(account,reservation.id).map(item=>[item.id,`${item.name} · ${money(item.price)}/día`]))}<p class="staff-note">Sin regla para ajuste económico; solo se permite cotización igual.</p><button class="staff-button staff-button--secondary" type="submit">Reasignar si procede</button></form></section><section><h3>Ampliación de período</h3><form id="extend-form">${field('Nueva fecha y hora final','endAt','datetime-local',reservation.endAt,'required')}<p class="staff-note">Se recalcula la cotización ficticia y se comprueba solapamiento [inicio, fin).</p><button class="staff-button staff-button--secondary" type="submit">Comprobar y ampliar</button></form></section></div>`}</section>`:''}
  ${reservation&&!existing?`<section class="staff-card"><h2>Registrar entrega y evidencia ficticia</h2><form id="delivery-form"><div class="staff-grid">${field('Kilometraje al entregar','mileage','number','','min="0" required')}${field('Combustible %','fuelPercent','number','100','min="0" max="100" required')}${field('Anticipo pactado COP · simulado, no cobrado','advanceCop','number','0','min="0" required')}${field('Nombre ficticio para firma simulada','signer','text','','required')}</div><div class="staff-grid"><label class="staff-field">Fotografías de prueba (se guardan localmente, máx. 2 × 200 KB)<input id="delivery-photos" type="file" accept="image/*" multiple required></label><div><label><input name="identityChecked" type="checkbox" required> Verifiqué identidad ficticia</label><br><label><input name="categoryChecked" type="checkbox" required> Verifiqué manualmente la categoría de licencia</label><br><label><input name="signatureAcknowledged" type="checkbox" required> Firma del contrato/acta SIMULADA, sin valor legal</label></div></div><div class="staff-photo-list" id="photo-preview"></div><p class="staff-note">Una licencia vencida bloquea automáticamente. La categoría no puede validarse automáticamente sin correspondencia oficial categoría↔vehículo. La hora de entrega se registra al guardar; fotografías reciben marca de tiempo local.</p><div class="staff-actions"><button class="staff-button" type="submit">Registrar entrega simulada</button></div></form></section>`:''}
  ${lastDelivery||existing?`<section class="staff-card"><h2>Contrato y acta de entrega · simulación</h2><div class="staff-document" id="acta">${actaMarkup(lastDelivery??existing,reservation)}</div><p class="staff-note">Copia digital por correo: simulada, no enviada. Anticipo: registrado ficticiamente, no cobrado.</p><div class="staff-actions"><button class="staff-button staff-button--secondary" type="button" id="download-acta">Descargar acta de texto ficticia</button></div></section>`:''}`;
}
function awaitingAccount(id) { return (createStore('accounts').get('items',[])??[]).find(item=>item.id===id); }
function actaMarkup(delivery,reservation) { return `RentaDrive · DOCUMENTO FICTICIO / SIN VALOR LEGAL\nReserva: ${escape(reservation?.id)}\nEntrega: ${escape(delivery.deliveredAt)}\nCoordinador: ${escape(delivery.coordinatorId)}\nVehículo: ${escape(delivery.vehicleId)}\nKilometraje: ${escape(delivery.mileage)} · Combustible: ${escape(delivery.fuelPercent)} %\nFotografías con marca de tiempo: ${delivery.photos.length}\nFirma: ${escape(delivery.signer)} (${escape(delivery.signatureStatus)})\nAnticipo: ${money(delivery.advanceCop)} (${escape(delivery.advanceStatus)})\nCopia: ${escape(delivery.copyStatus)}`; }

document.addEventListener('click',event=>{
  const page=event.target.closest('[data-audit-page]');if(page){auditPage=Math.max(0,auditPage+Number(page.dataset.auditPage));render();return;}
  const nav=event.target.closest('[data-tab]'); if(nav){tab=nav.dataset.tab;notice.textContent='';render();document.querySelector('#staff-heading').focus();return;}
  const vehicle=event.target.closest('[data-select-vehicle]');if(vehicle){selectedVehicle=vehicle.dataset.selectVehicle;render();return;}
  if(event.target.id==='load-selected-vehicle'){
    const item=listFleet().find(entry=>entry.id===selectedVehicle);const form=content.querySelector('#vehicle-form');
    if(!item||!form)return;
    form.elements.mode.value='update';
    for(const name of ['id','name','brand','type','city','fuel','transmission','licenseCategory','color','consumption','image','video','feature','passengers','bags','mileage','doors','price']){
      if(form.elements[name])form.elements[name].value=(name==='image'?item.packagedImage:name==='video'?item.packagedVideo:item[name])??({licenseCategory:'B1',color:'Demo',consumption:'Demo',mileage:0,doors:4}[name]??'');
    }
    previewMedia(item.id);form.elements.id.focus();notify('Ficha seleccionada cargada para edición explícita.');return;
  }
  const user=event.target.closest('[data-select-account]');if(user){selectedAccount=user.dataset.selectAccount;render();return;}
  const maintenance=event.target.closest('[data-close-maintenance]');if(maintenance){try{closeDemoMaintenance(account,maintenance.dataset.closeMaintenance);render();notify('Mantenimiento ficticio cerrado. Actualiza el estado por separado.');}catch(error){notify(error.message,true);}return;}
  if(event.target.id==='staff-logout'){logout();location.assign('./index.html');return;}
  if(event.target.id==='download-acta'){const blob=new Blob([content.querySelector('#acta')?.textContent??''],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`acta-demo-${selectedReservation}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;}
  if(event.target.id==='show-acta'){content.querySelector('#acta')?.scrollIntoView({block:'center'});}
});

document.addEventListener('change',async event=>{
  if(event.target.id==='staff-action') { actions[tab]=event.target.value;actionPanels(false);return; }
  if(event.target.closest('#rate-form')) {
    if(event.target.name==='sourceId') { const item=listConfiguration('rate').find(item=>item.id===event.target.value);if(item)for(const name of ['gama','mode','amountCop','kmMin','kmMax','validFrom','validThrough'])event.target.form.elements[name].value=item[name]; }
    toggleKilometres();return;
  }
  if(event.target.closest('#vehicle-form')&&event.target.name==='mode'&&event.target.value==='update'){document.querySelector('#load-selected-vehicle').click();return;}
  if(['vehicle-image-file','vehicle-video-file'].includes(event.target.id)) {
    try{const form=event.target.form;const id=form.elements.id.value;if(!id)throw new Error('Indica primero el ID del vehículo.');const kind=event.target.id.includes('image')?'image':'video';selectSessionMedia(id,kind,event.target.files[0]);previewMedia(id);notify('Vista previa solo en esta página; al recargar vuelve el recurso empaquetado.');}catch(error){event.target.value='';notify(error.message,true);}return;
  }
  if(event.target.id!=='delivery-photos')return;
  try{
    const files=[...event.target.files];if(files.length>2||files.some(file=>file.size>200000||!file.type.startsWith('image/')))throw new Error('Selecciona hasta dos imágenes ficticias de máximo 200 KB cada una.');
    photos=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,dataUrl:reader.result,capturedAt:new Date().toISOString()});reader.onerror=reject;reader.readAsDataURL(file);})));
    content.querySelector('#photo-preview').innerHTML=photos.map(item=>`<img src="${item.dataUrl}" alt="Evidencia ficticia adjuntada ${escape(item.capturedAt)}">`).join('');notify(`${photos.length} foto(s) de prueba adjuntada(s) localmente.`);
  }catch(error){photos=[];event.target.value='';notify(error.message,true);}
});

document.addEventListener('submit',event=>{
  const form=event.target;const formId=form.getAttribute('id');if(!formId||!form.closest('#staff-content'))return;event.preventDefault();
  const data=Object.fromEntries(new FormData(form));
  try{
    if(formId==='fleet-state-form')changeFleetState(account,data.vehicleId,data.nextState,data.reason);
    else if(formId==='maintenance-form')saveDemoMaintenance(account,data.vehicleId,data.reason);
    else if(formId==='vehicle-form')saveDemoVehicle(account,data);
    else if(['rate-form','policy-form','agreement-form'].includes(formId))publishDemoConfiguration(account,formId.split('-')[0],data);
    else if(formId==='role-form')assignDemoRole(account,data.accountId,data.role);
    else if(formId==='audit-form'){auditPage=0;auditFilters=Object.fromEntries(Object.entries(data).filter(([,value])=>value));render();notify('Bitácora filtrada; no se modificaron eventos.');return;}
    else if(formId==='find-form'){selectedReservation=findDemoReservation(account,data.query).id;lastDelivery=null;photos=[];render();notify('Reserva confirmada encontrada.');return;}
    else if(formId==='reassign-form'){if(!data.vehicleId)throw new Error('No hay alternativa disponible.');reassignDemoDelivery(account,selectedReservation,data.vehicleId);}
    else if(formId==='extend-form')extendDemoDelivery(account,selectedReservation,data.endAt);
    else if(formId==='delivery-form'){lastDelivery=registerDemoDelivery(account,selectedReservation,{...data,photos});photos=[];}
    else return;
    render();notify('Operación guardada en este navegador.');
  }catch(error){notify(error.message,true);recordDemoEvent({actorId:account?.id??'unknown',role:account?.role??'none',action:`rejected-${formId}`,reference:data.vehicleId??data.accountId??selectedReservation??'',result:'rejected'});}
});

function toggleKilometres(){const form=content.querySelector('#rate-form');if(!form)return;for(const name of ['kmMin','kmMax'])form.elements[name].closest('label').hidden=form.elements.mode.value==='daily';}
function previewMedia(id){const preview=content.querySelector('#vehicle-media-preview');if(!preview)return;const media=sessionMedia(id);preview.replaceChildren();for(const [kind,url]of Object.entries(media)){const node=document.createElement(kind==='image'?'img':'video');node.src=url;if(kind==='image')node.alt='Vista previa local';else node.controls=true;preview.append(node);}}
function actionPanels(create=true){
  const entries={fleet:[['fleet-state-form','Cambiar estado'],['maintenance-form','Mantenimiento'],['vehicle-form','Registrar / editar ficha']],config:[['rate-form','Tarifa'],['policy-form','Póliza'],['agreement-form','Convenio']],delivery:[['delivery-form','Registrar entrega'],['reassign-form','Reasignar vehículo'],['extend-form','Ampliar período']]}[tab];
  if(!entries)return;
  const available=entries.filter(([id])=>content.querySelector('#'+id));if(!available.length)return;
  if(create){const wrapper=document.createElement('div');wrapper.className='staff-card staff-action-selector';wrapper.innerHTML=select('Acción a realizar','staffAction',available,actions[tab]);wrapper.querySelector('select').id='staff-action';content.prepend(wrapper);}
  const selector=content.querySelector('#staff-action');if(!available.some(([id])=>id===actions[tab]))actions[tab]=available[0][0];selector.value=actions[tab];
  for(const[id]of available)content.querySelector('#'+id).closest('section').hidden=id!==actions[tab];
  toggleKilometres();
}

function updateTableCues() {
  for (const wrapper of content.querySelectorAll('.staff-table-wrap')) {
    wrapper.previousElementSibling?.classList.toggle('is-scrollable',wrapper.scrollWidth > wrapper.clientWidth + 1);
  }
}
window.addEventListener('resize',updateTableCues);