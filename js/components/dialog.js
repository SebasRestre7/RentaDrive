const layer = document.querySelector('#dialog-layer');
let returnFocus = null;

export function closeDialog() {
  layer.replaceChildren();
  layer.hidden = true;
  document.body.style.overflow = '';
  returnFocus?.focus();
  returnFocus = null;
}

export function openDialog(markup, width, type) {
  if (layer.hidden) returnFocus = document.activeElement;
  layer.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-type="${type}" style="--dialog-width:${width}px">${markup}</section>`;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  layer.querySelector('.dialog__close, input, button')?.focus();
}

layer.addEventListener('click', (event) => {
  if (event.target === layer || event.target.closest('[data-close-dialog]')) closeDialog();
});

document.addEventListener('keydown', (event) => {
  if (layer.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = [...layer.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')].filter(item => item.getClientRects().length && !item.closest('[hidden]'));
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
