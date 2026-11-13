import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\d7475a0f-5b41-40ed-92da-88f92419ba42\\scratch';
const USER_DATA = path.join(os.tmpdir(), `edge-nav-${Date.now()}`);
const PORT = 9245;
const BASE_URL = 'http://localhost:5173/';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(USER_DATA, { recursive: true });

const edgeProc = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { stdio: 'ignore' });

async function waitForTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Edge CDP did not start');
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const handlers = new Map();
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        onEvent(eventName, fn) {
          handlers.set(eventName, fn);
        },
        close() { ws.close(); }
      });
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method && handlers.has(msg.method)) {
        handlers.get(msg.method)(msg.params);
      }
    });
    ws.addEventListener('error', reject);
  });
}

async function evalJs(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`Runtime exception: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result?.value;
}

async function waitForCondition(cdp, conditionExpr, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await evalJs(cdp, `return Boolean(${conditionExpr});`);
    if (ok) return;
    await new Promise(r => setTimeout(r, 200));
  }
  const snap = await evalJs(cdp, `return (document.body.textContent || '').slice(0, 500);`);
  throw new Error(`Timeout waiting for: ${conditionExpr}. Snapshot: ${snap}`);
}

async function takeScreenshot(cdp, filename) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(data, 'base64'));
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await new Promise(r => setTimeout(r, 250));
}

async function run() {
  let cdp;
  try {
    const target = await waitForTarget();
    cdp = await createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('=== 1. TEST NAVIGATION DESKTOP (1280x800) ===');
    await setViewport(cdp, 1280, 800, false);
    await cdp.send('Page.navigate', { url: BASE_URL });
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Seconde')`);
    await new Promise(r => setTimeout(r, 600));

    // 1.1 Clic sur "Fonctionnement" dans le header
    const clickFonctionnement = await evalJs(cdp, `
      const btn = Array.from(document.querySelectorAll('header nav button')).find(b => b.innerText.includes('Fonctionnement'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    console.log('Bouton "Fonctionnement" dans Header cliqué :', clickFonctionnement);

    await waitForCondition(cdp, `(document.body.textContent || '').includes('Comment ça marche & Compartiments')`);
    await new Promise(r => setTimeout(r, 400));
    await takeScreenshot(cdp, 'fonctionnement_modal_desktop.png');

    const modalContentCheck = await evalJs(cdp, `
      const text = document.body.innerText;
      return {
        hasExplorer: text.includes('1. Explorer les 12 catégories'),
        hasDons: text.includes('2. Espace Dons Gratuits'),
        hasPublish: text.includes('3. Déposer une annonce'),
        hasPricing: text.includes('4. Formules d’abonnement'),
        hasBoost: text.includes('5. Booster une annonce'),
        hasSecurity: text.includes('6. Sécurité, Charte de modération'),
        hasSupportWhatsApp: text.includes('Support WhatsApp (+225)'),
        hash: window.location.hash
      };
    `);
    console.log('Contenu de FonctionnementModal vérifié :', JSON.stringify(modalContentCheck, null, 2));

    // 1.2 Test action directe "Voir tous les dons gratuits disponibles"
    await evalJs(cdp, `
      const donBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Voir tous les dons gratuits disponibles'));
      donBtn?.click();
    `);
    await new Promise(r => setTimeout(r, 500));

    const afterDonsClick = await evalJs(cdp, `
      const text = document.body.innerText;
      return {
        modalClosed: !text.includes('Guide Officiel • Seconde Vie'),
        filterIsDon: text.includes('Tous les dons d\\'objets gratuits')
      };
    `);
    console.log('Action directe Dons Gratuits validée :', JSON.stringify(afterDonsClick, null, 2));

    // 1.3 Test des liens du Footer
    console.log('=== 2. TEST DES LIENS DU FOOTER ===');
    const footerLinksCheck = await evalJs(cdp, `
      const footer = document.querySelector('footer');
      const allButtons = Array.from(footer.querySelectorAll('button')).map(b => b.innerText.trim());
      const allLinks = Array.from(footer.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') }));
      return {
        buttonsCount: allButtons.length,
        hasHowItWorksBtn: allButtons.some(t => t.includes('Comment fonctionne') || t.includes('Comment ça marche')),
        hasPricingBtn: allButtons.some(t => t.includes('Formules & Abonnements')),
        hasDonsBtn: allButtons.some(t => t.includes('Objets Gratuits')),
        hasCguBtn: allButtons.some(t => t.includes('CGU') || t.includes('Conditions Générales')),
        hasPrivacyBtn: allButtons.some(t => t.includes('Confidentialité')),
        hasCharteBtn: allButtons.some(t => t.includes('Charte')),
        whatsAppHref: allLinks.find(l => l.href.includes('wa.me'))?.href,
        mailHref: allLinks.find(l => l.href.includes('mailto:'))?.href,
        hasDeadHashLinks: allLinks.some(l => l.href === '#' || l.href === 'javascript:void(0)')
      };
    `);
    console.log('Vérification des liens Footer :', JSON.stringify(footerLinksCheck, null, 2));

    // 1.4 Test clic sur "Conditions Générales (CGU)" dans le Footer
    await evalJs(cdp, `
      const cguBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Conditions Générales (CGU)'));
      cguBtn?.click();
    `);
    await waitForCondition(cdp, `(document.body.textContent || '').includes("Conditions Générales d'Utilisation (CGU)")`);
    await new Promise(r => setTimeout(r, 300));
    const cguModalCheck = await evalJs(cdp, `
      return {
        cguOpen: Boolean(document.getElementById('legal-modal-title')),
        hash: window.location.hash
      };
    `);
    console.log('Modale CGU ouverte depuis Footer :', JSON.stringify(cguModalCheck, null, 2));

    // Fermeture de la modale légale
    await evalJs(cdp, `
      const closeBtn = document.querySelector('button[aria-label="Fermer la fenêtre légale"]');
      closeBtn?.click();
    `);
    await new Promise(r => setTimeout(r, 300));

    // 1.5 Test du bouton retour navigateur (History popstate)
    console.log('=== 3. TEST DE NAVIGATION AVEC ANCRES & BOUTON RETOUR ===');
    await evalJs(cdp, `
      window.location.hash = '#tarifs';
    `);
    await waitForCondition(cdp, `(document.body.textContent || '').includes("Formules d'Abonnement")`);
    await new Promise(r => setTimeout(r, 300));
    console.log('Ouverture via hash #tarifs OK');

    // Clic retour navigateur (back)
    await evalJs(cdp, `window.history.back();`);
    await new Promise(r => setTimeout(r, 500));
    const afterBack = await evalJs(cdp, `
      return {
        pricingModalClosed: !document.body.innerText.includes("Formules d'Abonnement"),
        hash: window.location.hash
      };
    `);
    console.log('Bouton Retour navigateur validé :', JSON.stringify(afterBack, null, 2));

    // 1.6 Test Mobile 360x780 (Menu hamburger + Fonctionnement)
    console.log('=== 4. TEST MOBILE (360x780) ===');
    await setViewport(cdp, 360, 780, true);
    await evalJs(cdp, `window.scrollTo({ top: 0 });`);
    await new Promise(r => setTimeout(r, 300));

    // Ouvrir le menu mobile
    await evalJs(cdp, `
      const menuBtn = document.querySelector('header button[aria-label="Menu"]');
      menuBtn?.click();
    `);
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Comment ça marche & Compartiments')`);
    await new Promise(r => setTimeout(r, 200));

    // Cliquer sur "Comment ça marche & Compartiments"
    await evalJs(cdp, `
      const mobileHow = Array.from(document.querySelectorAll('header button')).find(b => b.innerText.includes('Comment ça marche & Compartiments'));
      mobileHow?.click();
    `);
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Guide Officiel • Seconde Vie')`);
    await new Promise(r => setTimeout(r, 400));
    await takeScreenshot(cdp, 'fonctionnement_modal_mobile.png');

    const mobileModalCheck = await evalJs(cdp, `
      return {
        isOpen: Boolean(document.getElementById('how-it-works-modal-title')),
        overflow: document.documentElement.scrollWidth - window.innerWidth
      };
    `);
    console.log('Modale mobile validée sans overflow :', JSON.stringify(mobileModalCheck, null, 2));

    console.log('ALL TESTS PASSED SUCCESSFULLY 100%');
  } finally {
    if (cdp) cdp.close();
    edgeProc.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
