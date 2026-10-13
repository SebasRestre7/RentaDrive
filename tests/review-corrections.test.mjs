import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{values=new Map();getItem(key){return this.values.get(key)??null;}setItem(key,value){this.values.set(key,String(value));}removeItem(key){this.values.delete(key);}}
globalThis.window={localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage()};
const {createStore}=await import('../js/core/storage.js');
const {listFleet,saveDemoVehicle,changeFleetState}=await import('../js/services/fleet.js');
const {publishDemoConfiguration,listConfiguration}=await import('../js/services/configuration.js');
const {createDemoQuote}=await import('../js/services/quote.js');
const {reviewDemoReservationQuote,reviewedDemoReservationQuote,confirmDemoReservation,listReservations}=await import('../js/services/reservations.js');
const {findDemoReservation}=await import('../js/services/delivery.js');
const {selectSessionMedia,clearSessionMedia,durableVehicle}=await import('../js/core/media.js');
const {reportFixture,reportsMarkup}=await import('../js/components/reports.js');
const admin={id:'demo-admin',role:'admin'},coordinator={id:'demo-coordinator',role:'coordinator'},client={id:'demo-client',role:'client',email:'review@example.invalid',licenseExpiry:'2099-01-01'};
const date=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const request={account:client,vehicleId:'toyota-hilux',city:'Medellín',startAt:`${date(10)}T10:00`,endAt:`${date(11)}T10:00`,policyId:'premium',currency:'USD',requestId:'review-snapshot-demo'};
test('tariff edit appends source-linked revision, freezes reviewed quote and reservation, revalidates availability',()=>{
 const vehicle=listFleet().find(item=>item.id===request.vehicleId);
 const source=publishDemoConfiguration(admin,'rate',{gama:vehicle.type,mode:'daily',amountCop:210000,validFrom:date(0),validThrough:date(40)});
 const reviewed=reviewDemoReservationQuote(request);assert.equal(reviewed.dailyPrice,210000);
 const original=structuredClone(source);
 const revision=publishDemoConfiguration(admin,'rate',{...source,sourceId:source.id,amountCop:230000});
 assert.equal(revision.sourceId,source.id);assert.notEqual(revision.id,source.id);assert.deepEqual(listConfiguration('rate')[0],original);
 assert.equal(createDemoQuote(vehicle,'premium',request.startAt,request.endAt,'USD').dailyPrice,230000);
 assert.deepEqual(reviewedDemoReservationQuote(request),reviewed);
 const result=confirmDemoReservation(request).reservation;assert.deepEqual(result.quote,reviewed);assert.equal(result.qrPayload,result.id);
 publishDemoConfiguration(admin,'rate',{...revision,sourceId:revision.id,amountCop:250000});
 assert.deepEqual(listReservations()[0].quote,reviewed);
 assert.throws(()=>confirmDemoReservation({...request,requestId:'second-request'}),/disponible/);
 assert.throws(()=>publishDemoConfiguration(admin,'rate',{...source,sourceId:'missing'}),/origen/);
});
test('legacy prefixed and exact visible QR codes resolve the same saved reservation',()=>{
 const saved=listReservations()[0];assert.equal(findDemoReservation(coordinator,saved.id).id,saved.id);assert.equal(findDemoReservation(coordinator,`RENTADRIVE-DEMO:${saved.id}`).id,saved.id);
 createStore('reservations').set('items',[{...saved,qrPayload:`RENTADRIVE-DEMO:${saved.id}`}]);assert.equal(findDemoReservation(coordinator,saved.id).id,saved.id);
});
test('unauthorized master/config/delivery API calls stay blocked',()=>{
 for(const actor of [client,coordinator]){assert.throws(()=>saveDemoVehicle(actor,{}),/administración/);assert.throws(()=>publishDemoConfiguration(actor,'rate',{}),/administración/);}
 assert.throws(()=>findDemoReservation(admin,'anything'),/coordinación/);assert.throws(()=>reviewDemoReservationQuote({...request,account:admin}),/cliente/);
});
test('local media validates type/size, overlays session previews, and never stores object URLs',()=>{
 const base=listFleet().find(item=>item.id==='renault-sandero');
 assert.throws(()=>selectSessionMedia(base.id,'image',new Blob(['text'],{type:'text/plain'})),/2 MB/);
 assert.throws(()=>selectSessionMedia(base.id,'video',new Blob([new Uint8Array(20*1024*1024+1)],{type:'video/mp4'})),/20 MB/);
 const url=selectSessionMedia(base.id,'image',new Blob(['fixture'],{type:'image/png'}));assert.match(url,/^blob:/);
 let preview=listFleet().find(item=>item.id===base.id);assert.equal(preview.image,url);assert.equal(durableVehicle(preview).image,base.image);
 saveDemoVehicle(admin,{...preview,...durableVehicle(preview),mode:'update',licenseCategory:'B1',color:'Demo',consumption:'Demo',mileage:10,doors:4});
 changeFleetState(admin,base.id,'contingency','Demo media check');
 assert.equal(window.localStorage.getItem('rentadrive:fleet:items').includes('blob:'),false);
 clearSessionMedia();preview=listFleet().find(item=>item.id===base.id);assert.equal(preview.image,base.image);assert.equal(preview.video,base.video);
});
test('reports are fixed Figma fixtures, with honest unsupported controls and text data',()=>{
 assert.equal(reportFixture.months.reduce((sum,item)=>sum+item[1],0).toFixed(1),'45.2');assert.equal(reportFixture.ratings.reduce((sum,item)=>sum+item[1],0),100);
 const markup=reportsMarkup();assert.match(markup,/Exportación PDF no implementada/);assert.match(markup,/período fijo/);assert.match(markup,/<table>/);assert.match(markup,/STU901/);
});
