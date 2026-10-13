import {currentAccount,logout} from '../services/auth.js';
export function renderSession() {
  const account=currentAccount();
  const host=document.querySelector('[data-session]');
  if(!host)return;
  host.replaceChildren();
  const homeActions=host.closest('.site-header__actions');homeActions?.querySelectorAll('[data-overlay]').forEach(button=>button.hidden=Boolean(account));
  if(!account){ if(homeActions)return; const link=document.createElement('a');link.href='./index.html?auth=login';link.textContent='Iniciar sesión';host.append(link);return; }
  const label=document.createElement('span'); label.textContent=account.fullName+' · '+({client:'Cliente',admin:'Administrador',coordinator:'Coordinador'}[account.role])+' · '+account.email;
  const button=document.createElement('button');button.type='button';button.textContent='Cerrar sesión';button.addEventListener('click',()=>{logout();location.assign('./index.html');});
  host.append(label);if(!document.querySelector('#staff-logout'))host.append(button);else document.querySelector('#staff-account').hidden=true;
}
renderSession();
window.addEventListener('storage',renderSession);
window.addEventListener('rentadrive-session',renderSession);
