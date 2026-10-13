const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {Decoder,Detector,grayscale,binarize}=require('./vendor/qrcode-decoder.cjs');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webm':'video/webm'};
const server = http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(request.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end();return;}
  response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(response);
});
let browser;
const date=offset=>{const value=new Date();value.setDate(value.getDate()+offset);return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;};
const check=(condition,message)=>{if(!condition)throw new Error(message);};

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1280,height:832}});
  fs.mkdirSync(path.join(root,'docs/review'),{recursive:true});
  const overflow=async()=>{const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&!el.closest('[hidden]')).slice(0,8).map(el=>el.tagName+'.'+el.className)}));check(size.scroll<=size.width+1,'Viewport horizontal overflow '+JSON.stringify(size));};
  const mobileNavTabGeometry=async()=>{
    const items=await page.locator('#staff-nav button').evaluateAll(buttons=>buttons.map(button=>button.dataset.tab));
    await page.locator('.staff-brand').focus();
    for(const id of items){
      await page.keyboard.press('Tab');
      const focused=await page.evaluate(()=>{const node=document.activeElement;const rect=node.getBoundingClientRect();const nav=document.querySelector('#staff-nav').getBoundingClientRect();return {id:node.dataset.tab,left:rect.left,right:rect.right,navLeft:nav.left,navRight:nav.right,viewport:innerWidth};});
      check(focused.id===id,'Mobile Tab order skipped staff '+id);
      check(focused.left>=focused.navLeft&&focused.right<=focused.navRight&&focused.right<=focused.viewport,'Mobile focused staff label clipped: '+JSON.stringify(focused));
    }
    check(await page.locator('#staff-nav').evaluate(nav=>nav.scrollWidth<=nav.clientWidth+1),'Mobile staff nav still needs a horizontal scroller');
  };
  const capture=async name=>page.screenshot({path:path.join(root,'docs/review',name+'.png'),fullPage:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  const open=async file=>page.goto(`${base}/${file}`,{waitUntil:'networkidle',timeout:20000});
  const action=async id=>page.locator('#staff-action').selectOption(id);
  const scanQr=async()=>{const pixels=await page.locator('#booking-qr').evaluate(async canvas=>{const image=new Image();image.src=canvas.toDataURL('image/png');await image.decode();const copy=document.createElement('canvas');copy.width=image.width;copy.height=image.height;const ctx=copy.getContext('2d');ctx.drawImage(image,0,0);return {width:copy.width,height:copy.height,data:Array.from(ctx.getImageData(0,0,copy.width,copy.height).data)};});const bitmap=binarize(grayscale({...pixels,data:new Uint8ClampedArray(pixels.data)}),pixels.width,pixels.height);for(const detected of new Detector().detect(bitmap)){try{return new Decoder().decode(detected.matrix).content;}catch{}}throw new Error('QR PNG could not be decoded');};
  const login=async credential=>{await open('index.html');if(await page.locator('[data-session] button').count()){await page.locator('[data-session] button').click();await page.waitForLoadState('networkidle');}await page.locator('[data-overlay="login"]').first().click();await page.locator('#login-email').fill(credential.email);await page.locator('#login-password').fill(credential.password);await page.locator('#login-form button[type="submit"]').click();if(credential.email.endsWith('@rentadrive.invalid'))await page.waitForURL('**/staff.html');else await page.locator('[data-session]').filter({hasText:credential.email}).waitFor();};
  await open('index.html');
  // Staff fixtures are intentionally prepared outside public signup; all customer actions below use visible UI.
  const staff=await page.evaluate(async()=>await(await import('./js/services/auth.js')).prepareDemoStaff());
  await login(staff[1]);await page.waitForURL('**/staff.html');
  check((await page.locator('#staff-heading').textContent()).includes('Vehículos'),'Admin login did not open staff UI');

  // CU-007 vehicle creation data integrity and CU-006 dynamic brand option.
  await action('vehicle-form');
  const vehicleForm=page.locator('#vehicle-form');
  await vehicleForm.locator('input[name="id"]').fill('browser-brand');
  await vehicleForm.locator('input[name="brand"]').fill('DemoMarca');
  await vehicleForm.locator('input[name="name"]').fill('Auto Demo');
  await vehicleForm.locator('input[name="type"]').fill('Económico');
  await vehicleForm.locator('select[name="city"]').selectOption('Cali');
  await vehicleForm.locator('input[name="color"]').fill('Azul ficticio');
  await vehicleForm.locator('input[name="consumption"]').fill('Demo');
  await vehicleForm.locator('input[name="fuel"]').fill('Gasolina');
  await vehicleForm.locator('input[name="feature"]').fill('Aire acondicionado');
  await vehicleForm.locator('input[name="licenseCategory"]').fill('B1');
  await vehicleForm.locator('button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),`CU-007 vehicle UI creation failed: ${await page.locator('#staff-notice').textContent()}`);
  for(const [name,value] of Object.entries({id:'browser-brand',brand:'DemoMarca',name:'Auto Demo',type:'Económico',color:'Azul ficticio',consumption:'Demo',fuel:'Gasolina',feature:'Aire acondicionado',licenseCategory:'B1'}))await page.locator(`#vehicle-form input[name="${name}"]`).fill(value);
  await page.locator('#vehicle-form select[name="city"]').selectOption('Cali');
  await page.locator('#vehicle-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('ya existe'),'Duplicate vehicle ID was not rejected');

  // Action-specific editing and document-session file previews; no durable blob URLs.
  await page.locator('[data-select-vehicle="browser-brand"]').click();await action('vehicle-form');
  await page.locator('#vehicle-form select[name="mode"]').selectOption('update');
  check(await page.locator('#vehicle-form input[name="brand"]').inputValue()==='DemoMarca','Vehicle edit selection not populated');
  await page.locator('#vehicle-image-file').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  check((await page.locator('#staff-notice').textContent()).includes('2 MB'),'Invalid media type was not rejected');
  await page.locator('#vehicle-image-file').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(root,'assets/catalog/sandero-card.png'))});
  await page.locator('#vehicle-video-file').setInputFiles({name:'demo.webm',mimeType:'video/webm',buffer:fs.readFileSync(path.join(root,'assets/catalog/sandero-demo.webm'))});
  check(await page.locator('#vehicle-media-preview img').evaluate(img=>img.src.startsWith('blob:')&&img.complete&&img.naturalWidth>0),'Selected local image has no immediate valid preview');
  check(await page.locator('#vehicle-media-preview video').evaluate(video=>video.src.startsWith('blob:')),'Selected local video preview missing');
  await page.waitForFunction(()=>document.querySelector('#vehicle-media-preview video')?.videoWidth>0);
  const validPreview=await page.locator('#vehicle-media-preview img').getAttribute('src');await page.locator('#vehicle-image-file').setInputFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1)});check((await page.locator('#staff-notice').textContent()).includes('2 MB'),'Oversize media not rejected');check(await page.locator('#vehicle-media-preview img').getAttribute('src')===validPreview,'Rejected file replaced existing valid preview');
  await overflow();await capture('vehicle-form-desktop');await page.setViewportSize({width:390,height:844});await overflow();await mobileNavTabGeometry();await capture('vehicle-form-mobile');await page.setViewportSize({width:1280,height:832});
  await page.locator('#vehicle-form button[type="submit"]').click();
  check(await page.evaluate(()=>!localStorage.getItem('rentadrive:fleet:items').includes('blob:')),'Object URL escaped into durable fleet data');
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-select-vehicle="browser-brand"]').click();await action('vehicle-form');await page.locator('#vehicle-form select[name="mode"]').selectOption('update');
  check(await page.locator('#vehicle-form input[name="image"]').inputValue()==='./assets/catalog/sandero-card.png','Reload did not restore original packaged image');
  check(await page.locator('#vehicle-media-preview img').count()===0,'Blob preview survived reload');
  await action('fleet-state-form');await page.locator('#fleet-state-form input[name="reason"]').fill('Retained action draft');await action('maintenance-form');check(await page.locator('#fleet-state-form').isVisible()===false,'Irrelevant state form remained visible');await action('fleet-state-form');check(await page.locator('#fleet-state-form input[name="reason"]').inputValue()==='Retained action draft','Switching action discarded values');

  // CU-008 maintenance opens through UI, excludes the unit publicly, and requires close before release.
  await page.locator('[data-select-vehicle="browser-brand"]').click();
  await action('maintenance-form');
  await page.locator('#maintenance-form input[name="reason"]').fill('Revisión ficticia de prueba');
  await page.locator('#maintenance-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-008 maintenance open failed');
  check((await page.locator('#maintenance-form').locator('..').textContent()).includes('Revisión ficticia de prueba · open'),'CU-008 open maintenance record missing');
  await action('fleet-state-form');
  await page.locator('#fleet-state-form select[name="nextState"]').selectOption('available');
  await page.locator('#fleet-state-form input[name="reason"]').fill('Liberación prematura ficticia');
  await page.locator('#fleet-state-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('Cierra el mantenimiento abierto'),'CU-008 open maintenance did not block release');
  await open('catalog.html');
  await page.locator('#edit-search').click();
  await page.locator('#catalog-search-form select[name="city"]').selectOption('Cali');
  await page.locator('#catalog-search-form button[type="submit"]').click();
  check(await page.locator('[data-detail="browser-brand"]').count()===0,'CU-008 maintenance did not exclude vehicle from CU-006');
  await login(staff[1]);await page.waitForURL('**/staff.html');
  await page.locator('[data-select-vehicle="browser-brand"]').click();
  await action('maintenance-form');
  await page.locator('[data-close-maintenance]').click();
  check((await page.locator('#staff-notice').textContent()).includes('cerrado'),'CU-008 maintenance close failed');
  check((await page.locator('#maintenance-form').locator('..').textContent()).includes('Revisión ficticia de prueba · closed'),'CU-008 closed maintenance record missing');
  await action('fleet-state-form');
  await page.locator('#fleet-state-form select[name="nextState"]').selectOption('available');
  await page.locator('#fleet-state-form input[name="reason"]').fill('Revisión ficticia terminada');
  await page.locator('#fleet-state-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-008 release after maintenance close failed');

  // CU-008 state → CU-006 public availability.
  await page.locator('[data-select-vehicle="mazda-cx-5"]').click();
  await action('fleet-state-form');
  await page.locator('#fleet-state-form select[name="nextState"]').selectOption('contingency');
  await page.locator('#fleet-state-form input[name="reason"]').fill('Contingencia ficticia de prueba');
  await page.locator('#fleet-state-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-008 state change failed');

  // CU-007 valid demo daily rate; later the browser quote must show it.
  await page.locator('[data-tab="config"]').click();
  await action('rate-form');
  await page.locator('#rate-form input[name="amountCop"]').fill('205000');
  await action('rate-form');
  await page.locator('#rate-form input[name="validThrough"]').fill(date(30));
  await action('rate-form');
  await page.locator('#rate-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-007 rate publication failed');
  await action('policy-form');
  await page.locator('#policy-form select[name="policyId"]').selectOption('intermediate');
  await action('policy-form');
  await page.locator('#policy-form input[name="dailyPrice"]').fill('47000');
  await action('policy-form');
  await page.locator('#policy-form input[name="coverage"]').fill('Cobertura intermedia ficticia de prueba');
  await action('policy-form');
  await page.locator('#policy-form input[name="validThrough"]').fill(date(30));
  await action('policy-form');
  await page.locator('#policy-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-007 policy publication failed');
  check((await page.locator('.staff-table').first().textContent()).includes('policy'),'CU-007 published policy missing from UI');
  await action('agreement-form');
  await page.locator('#agreement-form input[name="company"]').fill('Empresa Ficticia Browser');
  await action('agreement-form');
  await page.locator('#agreement-form input[name="discountPercent"]').fill('7');
  await action('agreement-form');
  await page.locator('#agreement-form input[name="validThrough"]').fill(date(30));
  await action('agreement-form');
  await page.locator('#agreement-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-007 agreement publication failed');
  check((await page.locator('.staff-table').first().textContent()).includes('Empresa Ficticia Browser'),'CU-007 published agreement missing from UI');
  await page.locator('#staff-logout').click();await page.waitForURL('**/index.html');

  // CU-001 full public registration and login, without account/reservation service seeding.
  await page.locator('[data-overlay="register"]').first().click();
  await page.locator('#register-name').fill('Cliente Ficticia');
  await page.locator('#register-email').fill('browser@example.invalid');
  await page.locator('#register-password').fill('BrowserDemo!2026');
  await page.locator('#register-confirm').fill('BrowserDemo!2026');
  await page.locator('#register-form button[type="submit"]').click();
  const details=page.locator('#register-details-form');
  await details.locator('select[name="documentType"]').selectOption('CC');
  for(const [name,value] of Object.entries({documentNumber:'BROWSER-DEMO',address:'Calle Demo',postalCode:'000000',phonePrimary:'0000000001',phoneSecondary:'0000000002',birthDate:'1995-01-01',educationLevel:'Demo',licenseNumber:'LIC-DEMO',licenseCategory:'B1',licenseExpiry:'2099-01-01'}))await details.locator(`[name="${name}"]`).fill(value);
  await details.locator('select[name="gender"]').selectOption('Prefiero no informar');
  await details.locator('input[name="demoOnly"]').check();
  await details.locator('button[type="submit"]').click();
  check((await page.locator('#login-note').textContent()).includes('Cuenta cliente ficticia creada'),'CU-001 registration UI failed');
  await page.locator('#login-password').fill('BrowserDemo!2026');
  await page.locator('#login-form button[type="submit"]').click();
  await page.locator('.search-panel__submit').click();await page.waitForURL('**/catalog.html');

  check((await page.locator('[data-session]').textContent()).includes('browser@example.invalid'),'Catalog current-profile indicator missing');
  // CU-006 location, period, state, gama, brand and price filters through visible catalog controls.
  check((await page.locator('#results-heading').textContent()).includes('2 vehículos'),'CU-006 contingency exclusion failed');
  await page.locator('#brand-filter').click();
  check(await page.locator('[data-brand="DemoMarca"]').count()===1,'Admin-added brand missing from filter');
  await page.locator('[data-brand="DemoMarca"]').click();
  check((await page.locator('#results-heading').textContent()).includes('1 vehículo') && await page.locator('[data-detail="browser-brand"]').count()===1,'CU-006 brand filter failed');
  await page.locator('#clear-filters').click();
  await page.locator('#edit-search').click();
  await page.locator('#catalog-search-form input[name="startDate"]').fill(date(5));
  await page.locator('#catalog-search-form input[name="endDate"]').fill(date(6));
  await page.locator('#catalog-search-form select[name="city"]').selectOption('Bogotá');
  await page.locator('#catalog-search-form button[type="submit"]').click();
  check((await page.locator('#results-heading').textContent()).includes('1 vehículo'),'CU-006 Bogotá/period search failed');
  await page.locator('#edit-search').click();
  await page.locator('#catalog-search-form select[name="city"]').selectOption('Medellín');
  await page.locator('#catalog-search-form button[type="submit"]').click();
  check((await page.locator('#results-heading').textContent()).includes('2 vehículos'),'CU-006 Medellín/period search failed');
  await page.locator('[data-filter-group="type"][value="Camioneta"]').check();
  check((await page.locator('#results-heading').textContent()).includes('1 vehículo'),'CU-006 gama filter failed');
  await page.locator('#clear-filters').click();
  await page.locator('#max-price').evaluate(element=>{element.value='100000';element.dispatchEvent(new Event('input',{bubbles:true}));});
  check((await page.locator('#results-heading').textContent()).includes('1 vehículo'),'CU-006 cost filter failed');
  await page.locator('#clear-filters').click();
  await page.locator('[data-detail="toyota-hilux"]').click();
  check((await page.locator('#detail-title').textContent()).includes('Toyota Hilux'),'CU-006 vehicle detail failed');

  await page.locator('#back-to-results').click();
  // Favorites reuse catalog composition and persist; reserved/blocked saved cars remain inspectable.
  await page.locator('[data-favorite="toyota-hilux"]').click();await page.locator('#header-favorites').click();
  check((await page.locator('#results-heading').textContent()).includes('Favoritos (1'),'Dedicated favorites view missing');
  await page.reload({waitUntil:'networkidle'});check(await page.locator('[data-favorite="toyota-hilux"]').getAttribute('aria-pressed')==='true','Favorite marker did not persist');
  await overflow();await capture('favorites-desktop');await page.setViewportSize({width:390,height:844});await overflow();check(await page.locator('#header-favorites').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),'Mobile favorites navigation is clipped');check(await page.locator('[data-session] button').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),'Mobile shared logout is clipped');await capture('favorites-mobile');await page.setViewportSize({width:1280,height:832});await page.locator('#header-favorites').click();await page.locator('[data-detail="toyota-hilux"]').click();

  // CU-002 policy → updated quote → review → confirmation using only visible controls.
  await page.locator('#reserve-now').click();await page.waitForURL('**/booking.html');
  check((await page.locator('[data-session]').textContent()).includes('browser@example.invalid'),'Booking current-profile indicator missing');
  check((await page.locator('.booking-price').textContent()).includes('205.000'),'CU-007 published rate did not reach new quote');
  check(await page.locator('input[name="policy"][value="intermediate"]').count()===1,`CU-007 policy choice missing: ${await page.locator('body').textContent()}`);
  await page.locator('input[name="policy"][value="intermediate"]').check();
  check((await page.locator('.booking-policy').filter({has:page.locator('input[value="intermediate"]')}).textContent()).includes('47.000'),'CU-007 published policy price did not reach new quote');
  await page.locator('#booking-action').click();
  check((await page.locator('h1').textContent()).includes('Revisa tu reserva'),'CU-002 review stage missing');
  check((await page.locator('.booking-price').textContent()).includes('252.000'),'CU-002 policy/rate total incorrect');
  check((await page.locator('.booking-price').textContent()).includes('ConvenioNo aplicado'),'CU-007 agreement applied without approved client binding');
  // Editing a tariff appends a revision and preserves the explicitly reviewed quote on reload.
  await login(staff[1]);await page.waitForURL('**/staff.html');await page.locator('[data-tab="config"]').click();
  const rateId=await page.locator('#rate-form select[name="sourceId"] option').last().getAttribute('value');
  await page.locator('#rate-form select[name="sourceId"]').selectOption(rateId);
  check(await page.locator('#rate-form input[name="amountCop"]').inputValue()==='205000','Rate edit did not prefill old amount');
  check(await page.locator('#rate-form input[name="validThrough"]').inputValue()===date(30),'Rate edit validity not prefilled');
  check(await page.locator('#rate-form input[name="kmMin"]').isVisible()===false,'Daily tariff exposes irrelevant kilometre ranges');
  await page.locator('#rate-form input[name="amountCop"]').fill('215000');await page.locator('#rate-form button[type="submit"]').click();
  const revisionCheck=await page.evaluate(async()=>{const rates=(await import('./js/services/configuration.js')).listConfiguration('rate');return rates.length===2&&rates[1].sourceId===rates[0].id&&rates[0].amountCop==='205000';});check(revisionCheck,'Tariff revision destroyed original or lacks source linkage');
  await login({email:'browser@example.invalid',password:'BrowserDemo!2026'});await open('booking.html');
  check((await page.locator('h1').textContent()).includes('Revisa'),'Reviewed booking stage did not persist: '+await page.locator('body').textContent());
  check((await page.locator('.booking-price').textContent()).includes('252.000'),'Tariff edit silently repriced reviewed quote');
  await page.locator('#booking-action').click();
  check((await page.locator('.booking-success h1').textContent()).includes('Reserva confirmada'),'CU-002 confirmation missing');
  const reservationId=(await page.locator('.booking-code strong').textContent()).trim();
  check(/^RD-[A-F0-9]{8}$/.test(reservationId),'CU-002 reservation code invalid');
  check(await scanQr()===reservationId,'QR decoded PNG differs from visible code');
  await page.reload({waitUntil:'networkidle'});check(await scanQr()===reservationId,'QR payload did not survive reload');
  check((await page.locator('.booking-communications').textContent()).includes('no enviadas'),'CU-002 simulated communications not labelled');
  await open('catalog.html');
  check((await page.locator('#results-heading').textContent()).includes('1 vehículo'),'CU-006 confirmed overlap did not remove reserved Toyota');
  await page.locator('#edit-search').click();
  await page.locator('#catalog-search-form input[name="startDate"]').fill(date(6));
  await page.locator('#catalog-search-form input[name="endDate"]').fill(date(7));
  await page.locator('#catalog-search-form button[type="submit"]').click();
  check(await page.locator('[data-detail="toyota-hilux"]').count()===1,'CU-006 [start,end) exact boundary failed');

  // Unavailable favorites are not silently erased, and remove remains durable.
  await page.locator('#header-favorites').click();
  // The last period is adjacent, so use the reserved period again.
  await page.locator('#edit-search').click();await page.locator('#catalog-search-form input[name="startDate"]').fill(date(5));await page.locator('#catalog-search-form input[name="endDate"]').fill(date(6));await page.locator('#catalog-search-form button[type="submit"]').click();
  check(await page.locator('[data-favorite="toyota-hilux"]').count()===1,'Unavailable saved favorite disappeared');await page.locator('[data-detail="toyota-hilux"]').click();check(await page.locator('#reserve-now').isDisabled(),'Unavailable favorite can be reserved');await page.locator('#back-to-results').click();await page.locator('[data-favorite="toyota-hilux"]').click();await page.reload({waitUntil:'networkidle'});check(await page.locator('[data-favorite="toyota-hilux"]').count()===0,'Favorite removal did not persist');

  // CU-014 allowed role + audit UI, using the account created in the public form.
  await login(staff[1]);await page.waitForURL('**/staff.html');
  await page.locator('[data-tab="roles"]').click();
  await page.locator('.staff-table tr').filter({hasText:'browser@example.invalid'}).locator('[data-select-account]').click();
  await page.locator('#role-form select[name="role"]').selectOption('coordinator');
  await page.locator('#role-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-014 role assign failed');
  await page.locator('#role-form select[name="role"]').selectOption('client');
  await page.locator('#role-form button[type="submit"]').click();
  await page.locator('#audit-form input[name="action"]').fill('assign-demo-role');
  await page.locator('#audit-form button[type="submit"]').click();
  check((await page.locator('.staff-table').last().locator('tbody tr').count())>=2,'CU-014 audit filter failed');
  await page.locator('#audit-form input[name="action"]').fill('');await page.locator('#audit-form button[type="submit"]').click();
  const eventCount=await page.evaluate(async()=>{const auth=await import('./js/services/auth.js');return (await import('./js/services/audit.js')).filterDemoAudit(auth.currentAccount(),{}).length;});check(eventCount>20,'Audit fixture has insufficient real journey events for pagination proof');
  check(await page.locator('.staff-table').last().locator('tbody tr').count()===10,'Audit exceeds 10 rows per page');await page.locator('[data-audit-page="1"]').click();check((await page.locator('#audit-page-label').textContent()).includes('Página 2'),'Audit next page failed');await page.locator('[data-audit-page="-1"]').click();check((await page.locator('#audit-page-label').textContent()).includes('Página 1'),'Audit previous page failed');
  await page.locator('[data-audit-page="1"]').click();await page.locator('#audit-form input[name="action"]').fill('no-such-event');await page.locator('#audit-form button[type="submit"]').click();check((await page.locator('#audit-page-label').textContent()).includes('Página 1 de 1 · 0 eventos'),'Filtered audit did not reset/clamp');check((await page.locator('.staff-table').last().textContent()).includes('No hay eventos'),'Empty audit missing descriptive row');
  await page.locator('#staff-logout').click();await page.waitForURL('**/index.html');

  // CU-003 coordinator UI lookup by actual confirmation QR payload, evidence and persisted simulated delivery.
  await login(staff[0]);await page.waitForURL('**/staff.html');
  await page.locator('#find-form input[name="query"]').fill(`RENTADRIVE-DEMO:${reservationId}`);
  await page.locator('#find-form button[type="submit"]').click();
  check((await page.locator('#staff-content').textContent()).includes(reservationId),'CU-003 QR lookup failed');
  await page.locator('#delivery-form input[name="mileage"]').fill('1234');
  await page.locator('#delivery-form input[name="fuelPercent"]').fill('80');
  await page.locator('#delivery-form input[name="advanceCop"]').fill('50000');
  await page.locator('#delivery-form input[name="signer"]').fill('Cliente Ficticia');
  await page.locator('#delivery-form input[name="identityChecked"]').check();
  await page.locator('#delivery-form input[name="categoryChecked"]').check();
  await page.locator('#delivery-form input[name="signatureAcknowledged"]').check();
  await page.locator('#delivery-photos').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/H28AAAAASUVORK5CYII=','base64')});
  await page.locator('#delivery-form button[type="submit"]').click();
  check((await page.locator('#staff-content').textContent()).includes('correo simulado, no enviado'),`CU-003 delivery failed: ${await page.locator('#staff-notice').textContent()}`);
  check((await page.locator('#acta').textContent()).includes('Anticipo: COP 50.000 (registrado en simulación, no cobrado)'),'CU-003 simulated advance missing from act');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#find-form input[name="query"]').fill(reservationId);
  await page.locator('#find-form button[type="submit"]').click();
  check((await page.locator('#staff-content').textContent()).includes('Entrega registrada'),'CU-003 delivery persistence failed');
  check((await page.locator('#acta').textContent()).includes('Anticipo: COP 50.000 (registrado en simulación, no cobrado)'),'CU-003 simulated advance did not persist in act');
  // CU-007 → CU-006 regression: a new published price above the old COP 500,000 cap remains visible by default.
  await login(staff[1]);await page.waitForURL('**/staff.html');
  await page.locator('[data-tab="config"]').click();
  await action('rate-form');
  await page.locator('#rate-form select[name="gama"]').selectOption('Económico');
  await action('rate-form');
  await page.locator('#rate-form input[name="amountCop"]').fill('605000');
  await action('rate-form');
  await page.locator('#rate-form input[name="validThrough"]').fill(date(30));
  await action('rate-form');
  await page.locator('#rate-form button[type="submit"]').click();
  check((await page.locator('#staff-notice').textContent()).includes('guardada'),'CU-007 high rate publication failed');
  await open('catalog.html');
  await page.locator('#edit-search').click();
  await page.locator('#catalog-search-form select[name="city"]').selectOption('Cali');
  await page.locator('#catalog-search-form button[type="submit"]').click();
  check(await page.locator('[data-detail="browser-brand"]').count()===1,'CU-006 high-priced available vehicle was hidden by default cost range');
  check((await page.locator('#max-price-label').textContent()).includes('610.000'),'CU-006 price range did not expand to published rate');
  await page.locator('[data-session] button').click();await page.waitForURL('**/index.html');check(await page.locator('[data-overlay="login"]').first().isVisible(),'Shared catalog logout did not restore guest controls');
  await login(staff[1]);await page.waitForURL('**/staff.html');await page.locator('[data-tab="reports"]').click();
  check((await page.locator('.reports').textContent()).includes('45.2M'),'Reports fixture missing');check(await page.locator('.report-filters button').last().isDisabled(),'Unsupported PDF export claims success');
  await overflow();await capture('reports-desktop');await page.setViewportSize({width:390,height:844});await overflow();await mobileNavTabGeometry();await capture('reports-mobile');
  check(errors.length===0,`Page errors: ${errors.join('; ')}`);
  console.log('BROWSER JOURNEY PASS: public CU001→CU006→CU002→coordinator CU003; admin CU007 rate/policy/agreement, CU008 state/maintenance, CU014 roles/audit; >500000 rate remains catalog-visible; QR PNG decoded exactly before/after reload; favorites/save/remove/unavailable, sessions, action retention, local media/reload, tariff revision/snapshot, audit >20 paginated, reports; 1280x832+390x844 overflow/screenshot; mobile staff Tab focus geometry including Roles/Reports; no pageerror');
})().catch(error=>{console.error('BROWSER JOURNEY FAIL:',error.message);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
