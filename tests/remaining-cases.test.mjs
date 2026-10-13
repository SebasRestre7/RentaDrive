import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage { values=new Map(); getItem(key){return this.values.get(key)??null;} setItem(key,value){this.values.set(key,String(value));} removeItem(key){this.values.delete(key);} }
globalThis.window={localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage()};
const {registerClient,prepareDemoStaff,login,listDemoAccounts,assignDemoRole,logout}=await import('../js/services/auth.js');
const {listFleet,changeFleetState,saveDemoVehicle,listMaintenance,saveDemoMaintenance,closeDemoMaintenance}=await import('../js/services/fleet.js');
const {availableFleet}=await import('../js/services/availability.js');
const {publishDemoConfiguration,effectiveDailyRate,effectivePolicy}=await import('../js/services/configuration.js');
const {createDemoQuote}=await import('../js/services/quote.js');
const {confirmDemoReservation,listReservations}=await import('../js/services/reservations.js');
const {findDemoReservation,demoDeliveryAlternatives,reassignDemoDelivery,extendDemoDelivery,registerDemoDelivery,listDemoDeliveries}=await import('../js/services/delivery.js');
const {filterDemoAudit,demoAuditEvents}=await import('../js/services/audit.js');
const {deriveDemoPriceBounds,filterDemoVehicles}=await import('../js/catalog-data.js');
const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const startAt=`${date(5)}T10:00`,endAt=`${date(6)}T10:00`;
const profile={demoOnly:true,documentType:'CC',documentNumber:'DEMO-2001',fullName:'Persona Ficticia',address:'Calle Ficticia 1',postalCode:'000000',phonePrimary:'0000000001',phoneSecondary:'0000000002',email:'otro@example.invalid',gender:'Prefiero no informar',birthDate:'1995-01-01',educationLevel:'Demo',licenseNumber:'LIC-DEMO',licenseCategory:'B1',licenseExpiry:date(365),password:'SoloDemo!2026',confirmPassword:'SoloDemo!2026'};
const client=await registerClient(profile);
const fixtures=await prepareDemoStaff();
const coordinator=await login(fixtures[0].email,fixtures[0].password);
logout();
const admin=await login(fixtures[1].email,fixtures[1].password);

test('CU-014 role access, allowed values, reassignment and read-only audit filters',()=>{
  assert.equal(listDemoAccounts(admin).some(item=>item.id===client.id),true);
  assert.throws(()=>listDemoAccounts(client),/Solo administración/);
  assert.throws(()=>assignDemoRole(admin,client.id,'cashier'),/Rol no permitido/);
  assert.throws(()=>assignDemoRole(client,admin.id,'client'),/Solo administración/);
  const changed=assignDemoRole(admin,client.id,'coordinator');
  assert.equal(changed.role,'coordinator');
  assignDemoRole(admin,client.id,'client');
  const filtered=filterDemoAudit(admin,{action:'assign-demo-role',reference:client.id});
  assert.equal(filtered.length,2);
  assert.equal(filtered.every(item=>item.actorId===admin.id&&item.at&&item.result==='success'),true);
  assert.throws(()=>filterDemoAudit(client),/Solo administración/);
});

test('CU-007 publication validates ranges, applies new demo price/policy, and expires by date',()=>{
  const vehicle=listFleet().find(item=>item.id==='toyota-hilux');
  const before=createDemoQuote(vehicle,'basic',startAt,endAt);
  assert.throws(()=>publishDemoConfiguration(admin,'agreement',{company:'Demo S.A.',discountPercent:11,validFrom:date(0),validThrough:date(30)}),/5 % y 10 %/);
  assert.throws(()=>publishDemoConfiguration(admin,'agreement',{company:'Demo S.A.',discountPercent:5,validFrom:'2026-02-30',validThrough:date(30)}),/vigencia/);
  assert.throws(()=>publishDemoConfiguration(client,'rate',{}),/Solo administración/);
  const rate=publishDemoConfiguration(admin,'rate',{gama:'Camioneta',mode:'daily',kmMin:0,kmMax:999999,amountCop:210000,validFrom:date(0),validThrough:date(30)});
  publishDemoConfiguration(admin,'policy',{policyId:'basic',coverage:'Básica ficticia',dailyPrice:30000,validFrom:date(0),validThrough:date(30)});
  publishDemoConfiguration(admin,'agreement',{company:'Empresa Demo',discountPercent:5,validFrom:date(0),validThrough:date(30)});
  assert.equal(effectiveDailyRate(vehicle),210000);
  assert.equal(effectivePolicy('basic').dailyPrice,30000);
  assert.equal(effectivePolicy('basic').id,'basic');
  assert.equal(effectiveDailyRate(vehicle,date(40)),vehicle.price);
  assert.equal(effectivePolicy('basic',date(40)).dailyPrice,25000);
  const after=createDemoQuote(vehicle,'basic',startAt,endAt,'COP','Empresa Demo');
  assert.equal(after.rental,210000);
  assert.equal(after.discount,10500);
  assert.equal(before.totalCop,225000); // previously calculated snapshot does not mutate
  assert.equal(rate.kind,'rate');
  const fixture={mode:'create',id:'demo-extra',name:'Unidad Demo',brand:'Demo',type:'Económico',city:'Cali',passengers:4,bags:2,feature:'Aire acondicionado',mileage:0,color:'Azul',consumption:'Demo',fuel:'Gasolina',doors:4,transmission:'Mecánica',licenseCategory:'B1',price:90000,image:'./assets/catalog/sandero-card.png',video:'./assets/catalog/sandero-demo.webm'};
  const created=saveDemoVehicle(admin,fixture);
  assert.equal(listFleet().find(item=>item.id===created.id).city,'Cali');
  assert.equal(created.bags,2);
  assert.equal(created.feature,'Aire acondicionado');
  assert.throws(()=>saveDemoVehicle(admin,fixture),/ya existe/);
  assert.throws(()=>saveDemoVehicle(admin,{...fixture,mode:'update',id:'missing'}),/No existe/);
  assert.equal(saveDemoVehicle(admin,{...fixture,mode:'update',price:95000}).price,95000);
});

test('CU-008 state and maintenance change CU-006 public results, reject conflicting reservations',()=>{
  const city='Medellín';
  assert.equal(availableFleet(city,startAt,endAt,[]).some(item=>item.id==='mazda-cx-5'),true);
  changeFleetState(admin,'mazda-cx-5','contingency','Reserva de reemplazo ficticia');
  assert.equal(availableFleet(city,startAt,endAt,[]).some(item=>item.id==='mazda-cx-5'),false);
  assert.throws(()=>changeFleetState(admin,'mazda-cx-5','contingency','Repetir'),/ya tiene/);
  assert.throws(()=>changeFleetState(admin,'mazda-cx-5','rented','Manual'),/solo puede surgir/);
  const maintenance=saveDemoMaintenance(admin,'mazda-cx-5','Revisión ficticia');
  assert.equal(listMaintenance().find(item=>item.id===maintenance.id).status,'open');
  assert.throws(()=>changeFleetState(admin,'mazda-cx-5','available','Abrir'),/Cierra el mantenimiento/);
  closeDemoMaintenance(admin,maintenance.id);
  changeFleetState(admin,'mazda-cx-5','available','Revisión cerrada');
  assert.equal(availableFleet(city,startAt,endAt,[]).some(item=>item.id==='mazda-cx-5'),true);
});

test('CU-003 searches QR/code/identity, reassigns equal quote, extends [start,end), blocks invalid licence, records delivery once',()=>{
  const args={account:client,vehicleId:'toyota-hilux',city:'Medellín',startAt,endAt,policyId:'basic',requestId:'remaining-1'};
  const reservation=confirmDemoReservation(args).reservation;
  const original=listFleet().find(item=>item.id==='toyota-hilux');
  const edit={...original,mode:'update',licenseCategory:'B1',color:'Demo',consumption:'Demo',mileage:0,doors:4,video:original.video};
  assert.throws(()=>saveDemoVehicle(admin,{...edit,city:'Bogotá'}),/reservas confirmadas/);
  assert.throws(()=>saveDemoVehicle(admin,{...edit,name:'Otra unidad'}),/reservas confirmadas/);
  assert.equal(saveDemoVehicle(admin,{...edit,price:205000}).id,original.id);
  assert.throws(()=>changeFleetState(admin,'toyota-hilux','maintenance','Cambio conflictivo'),/reservas confirmadas/);
  assert.equal(findDemoReservation(coordinator,reservation.id).id,reservation.id);
  assert.equal(findDemoReservation(coordinator,reservation.qrPayload).id,reservation.id);
  assert.equal(findDemoReservation(coordinator,profile.documentNumber).id,reservation.id);
  assert.throws(()=>findDemoReservation(admin,reservation.id),/Solo coordinación/);
  assert.equal(demoDeliveryAlternatives(coordinator,reservation.id).some(item=>item.id==='hilux-maintenance'),false);
  const reassigned=reassignDemoDelivery(coordinator,reservation.id,'mazda-cx-5');
  assert.equal(reassigned.vehicleId,'mazda-cx-5');
  const extended=extendDemoDelivery(coordinator,reservation.id,`${date(7)}T10:00`);
  assert.equal(extended.extensionImpactCop>0,true);
  assert.throws(()=>confirmDemoReservation({...args,vehicleId:'mazda-cx-5',requestId:'remaining-2',startAt:endAt,endAt:`${date(7)}T10:00`}),/dejó de estar disponible/);
});

test('CU-003 licence and evidence validation, simulated contract/advance and no repeat',()=>{
  const reservation=listReservations().find(item=>item.requestId==='remaining-1');
  const photo={name:'demo.png',dataUrl:'data:image/png;base64,AA==',capturedAt:new Date().toISOString()};
  const base={mileage:1000,fuelPercent:80,advanceCop:50000,signer:'Cliente Ficticia',identityChecked:true,categoryChecked:true,signatureAcknowledged:true,photos:[photo]};
  const key='rentadrive:accounts:items';const accounts=JSON.parse(window.localStorage.getItem(key));
  window.localStorage.setItem(key,JSON.stringify(accounts.map(item=>item.id===client.id?{...item,licenseExpiry:'2000-01-01'}:item)));
  assert.throws(()=>registerDemoDelivery(coordinator,reservation.id,base),/licencia vencida/);
  window.localStorage.setItem(key,JSON.stringify(accounts));
  assert.throws(()=>registerDemoDelivery(coordinator,reservation.id,{...base,categoryChecked:false}),/verifica manualmente/);
  assert.throws(()=>registerDemoDelivery(coordinator,reservation.id,{...base,photos:[]}),/foto/);
  const record=registerDemoDelivery(coordinator,reservation.id,base);
  assert.equal(record.signatureStatus,'simulada, sin firma electrónica real');
  assert.equal(record.copyStatus,'correo simulado, no enviado');
  assert.equal(record.advanceStatus,'registrado en simulación, no cobrado');
  assert.equal(record.advanceCop,50000);
  assert.equal(listDemoDeliveries(coordinator)[0].advanceCop,50000);
  assert.equal(listDemoDeliveries(coordinator).length,1);
  assert.equal(listFleet().find(item=>item.id===record.vehicleId).state,'rented');
  assert.throws(()=>changeFleetState(admin,record.vehicleId,'available','Liberar'),/devolución/);
  assert.throws(()=>registerDemoDelivery(coordinator,reservation.id,base),/ya se registró/);
  assert.equal(demoAuditEvents().some(item=>item.action==='register-demo-delivery'&&item.reference===reservation.id),true);
});

test('CU-007 published demo price above former cap remains visible in CU-006 default cost range',()=>{
  publishDemoConfiguration(admin,'rate',{gama:'Económico',mode:'daily',kmMin:0,kmMax:999999,amountCop:605000,validFrom:date(0),validThrough:date(30)});
  const available=availableFleet('Cali',startAt,endAt,[]).map(vehicle=>({...vehicle,price:effectiveDailyRate(vehicle)}));
  const bounds=deriveDemoPriceBounds(available);
  assert.equal(bounds.max,610000);
  assert.equal(bounds.min,50000);
  assert.equal(available.some(vehicle=>vehicle.price===605000),true);
  assert.equal(filterDemoVehicles(available,{type:[],transmission:[],fuel:[],brand:'',minPrice:bounds.min,maxPrice:bounds.max}).length,available.length);
});
