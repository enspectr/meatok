'use strict';

window.addEventListener('beforeinstallprompt', (evt) => { evt.prompt(); });
window.addEventListener('appinstalled', (evt) => { console.log('Installed'); });
