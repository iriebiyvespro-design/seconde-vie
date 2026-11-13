import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA = path.join(os.tmpdir(), `edge-footer-${Date.now()}`);
const PORT = 9252;
const BASE_URL = 'http://localhost:5173/';

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

async function run() {
  let cdp;
  try {
    const target = await waitForTarget();
    cdp = await createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('=== TEST 1 : VISITEUR NON CONNECTÉ (ANONYME) ===');
    await cdp.send('Page.navigate', { url: BASE_URL });
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Seconde')`);
    await evalJs(cdp, `
      localStorage.removeItem('sv_user');
      localStorage.removeItem('sv_jwt');
    `);
    await cdp.send('Page.reload');
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Seconde')`);
    await new Promise(r => setTimeout(r, 500));

    const anonymousCheck = await evalJs(cdp, `
      const footer = document.querySelector('footer');
      const footerText = footer ? footer.innerText : '';
      const waLink = footer.querySelector('a[href*="wa.me"]');
      return {
        hasSuperAdminInFooter: footerText.includes('Espace Super Admin') || footerText.includes('Super Admin'),
        whatsAppHref: waLink ? waLink.getAttribute('href') : null,
        whatsAppText: waLink ? waLink.innerText.trim() : null
      };
    `);
    console.log('Résultat Visiteur Anonyme :', JSON.stringify(anonymousCheck, null, 2));

    if (anonymousCheck.hasSuperAdminInFooter) {
      throw new Error('ERREUR : "Espace Super Admin" est visible pour un visiteur non connecté !');
    }
    console.log('✅ PASS : "Espace Super Admin" bien masqué aux visiteurs anonymes.');

    console.log('=== TEST 2 : MEMBRE ORDINAIRE CONNECTÉ (NON ADMIN) ===');
    await evalJs(cdp, `
      localStorage.setItem('sv_user', JSON.stringify({
        id: 42,
        username: 'koffi_membre',
        full_name: 'Koffi Paul',
        email: 'koffi@test.ci',
        roleName: 'Public',
        roleType: 'authenticated'
      }));
      localStorage.setItem('sv_jwt', 'fake-member-jwt');
    `);
    await cdp.send('Page.reload');
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Seconde')`);
    await new Promise(r => setTimeout(r, 500));

    const memberCheck = await evalJs(cdp, `
      const footer = document.querySelector('footer');
      const footerText = footer ? footer.innerText : '';
      return {
        hasSuperAdminInFooter: footerText.includes('Espace Super Admin') || footerText.includes('Super Admin')
      };
    `);
    console.log('Résultat Membre Ordinaire :', JSON.stringify(memberCheck, null, 2));

    if (memberCheck.hasSuperAdminInFooter) {
      throw new Error('ERREUR : "Espace Super Admin" est visible pour un membre ordinaire !');
    }
    console.log('✅ PASS : "Espace Super Admin" bien masqué aux membres ordinaires.');

    console.log('=== TEST 3 : ADMINISTRATEUR CONNECTÉ (SUPER ADMIN) ===');
    await evalJs(cdp, `
      localStorage.setItem('sv_user', JSON.stringify({
        id: 99,
        username: 'admin_secondevie',
        full_name: 'Administrateur',
        email: 'fdigitalet@gmail.com',
        roleName: 'Super Admin',
        roleType: 'super_admin'
      }));
      localStorage.removeItem('sv_jwt');
    `);
    await cdp.send('Page.reload');
    await waitForCondition(cdp, `(document.body.textContent || '').includes('Seconde')`);
    await new Promise(r => setTimeout(r, 600));

    const debugState = await evalJs(cdp, `
      return {
        storedUser: localStorage.getItem('sv_user'),
        storedJwt: localStorage.getItem('sv_jwt'),
        bodyTextSnippet: document.body.innerText.slice(0, 300)
      };
    `);
    console.log('DEBUG STATE IN BROWSER :', JSON.stringify(debugState, null, 2));

    const adminCheck = await evalJs(cdp, `
      const footer = document.querySelector('footer');
      const footerText = footer ? footer.innerText : '';
      const adminBtn = Array.from(footer.querySelectorAll('button')).find(b => b.innerText.includes('Espace Super Admin'));
      return {
        hasSuperAdminInFooter: footerText.includes('Espace Super Admin'),
        adminBtnFound: Boolean(adminBtn)
      };
    `);
    console.log('Résultat Super Admin :', JSON.stringify(adminCheck, null, 2));

    if (!adminCheck.hasSuperAdminInFooter || !adminCheck.adminBtnFound) {
      throw new Error('ERREUR : "Espace Super Admin" devrait être visible pour le Super Admin !');
    }
    console.log('✅ PASS : "Espace Super Admin" bien visible UNIQUEMENT pour le Super Admin.');

    console.log('=== TEST 4 : TEST DU LIEN ET FORMAT WHATSAPP ===');
    const waDetails = await evalJs(cdp, `
      const waLink = document.querySelector('footer a[href*="wa.me"]');
      const url = waLink ? waLink.href : '';
      const urlObj = new URL(url);
      return {
        href: url,
        pathname: urlObj.pathname,
        hasPhoneInPath: /\\d{10,}/.test(urlObj.pathname),
        hasMessage: urlObj.searchParams.has('text'),
        message: urlObj.searchParams.get('text')
      };
    `);
    console.log('Détails du lien WhatsApp :', JSON.stringify(waDetails, null, 2));
    if (!waDetails.hasPhoneInPath || !waDetails.hasMessage) {
      throw new Error('ERREUR : Le lien WhatsApp est incomplet ou invalide !');
    }
    console.log('✅ PASS : Le lien WhatsApp du support est 100% conforme et fonctionnel.');

    console.log('ALL FOOTER ADJUSTMENT TESTS PASSED 100%');
  } finally {
    if (cdp) cdp.close();
    edgeProc.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
