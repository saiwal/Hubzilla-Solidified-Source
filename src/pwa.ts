// src/pwa.ts
export function initPWA() {
  window.addEventListener('pwa-update-available', () => {
    showUpdateToast();
  });
}

function showUpdateToast() {
  if (document.getElementById('pwa-toast')) return;

  const el = document.createElement('div');
  el.id = 'pwa-toast';
  el.innerHTML = `
    <span>Update available</span>
    <button id="pwa-reload">Reload</button>
    <button id="pwa-dismiss">Later</button>
  `;
  Object.assign(el.style, {
    position:        'fixed',
    bottom:          '72px',    // clears the mobile bottom nav bar
    left:            '50%',
    transform:       'translateX(-50%)',
    background:      '#1e293b',
    color:           '#f1f5f9',
    border:          '1px solid #334155',
    padding:         '10px 16px',
    borderRadius:    '10px',
    display:         'flex',
    gap:             '10px',
    alignItems:      'center',
    zIndex:          '9999',
    fontSize:        '13px',
    boxShadow:       '0 4px 24px rgba(0,0,0,0.5)',
    whiteSpace:      'nowrap',
  });
  document.body.appendChild(el);

  document.getElementById('pwa-reload')?.addEventListener('click', () => {
    window.location.reload();
  });
  document.getElementById('pwa-dismiss')?.addEventListener('click', () => {
    el.remove();
  });
}
