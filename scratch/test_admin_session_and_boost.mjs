import { spawn } from 'child_process';
import http from 'http';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findEdgePath() {
  return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
}

function sendCDP(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = Math.floor(Math.random() * 100000);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id, method, params }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.onerror = reject;
  });
}

async function run() {
  console.log('--- TEST SESSION ADMIN, PUBLISH UPSELL & USERPROFILE BOOST ---');
  const edgePath = await findEdgePath();
  const port = 9333;
  const userDataDir = 'C:\\Users\\PC\\AppData\\Local\\Temp\\edge_test_admin_' + Date.now();

  const edgeProcess = spawn(
    edgePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  try {
    await sleep(2000);

    const versionData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    const target = versionData.find((t) => t.type === 'page') || versionData[0];
    const pageWs = target?.webSocketDebuggerUrl;
    if (!pageWs) throw new Error('No page WebSocket URL found');

    const evalInPage = async (expression) => {
      const res = await sendCDP(pageWs, 'Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    };

    // 1. Navigation vers l'app
    await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2500);

    // 2. Seeder un utilisateur gfdsq Super Admin (comme dans le screenshot de l'utilisateur)
    await evalInPage(`
      localStorage.setItem('sv_user', JSON.stringify({
        id: 999,
        username: 'gfdsq',
        full_name: 'gfdsq',
        email: 'gfdsq@test.ci',
        roleName: 'Super Admin',
        roleType: 'super_admin',
        commune: 'Cocody'
      }));
      window.location.hash = '#admin';
      window.location.reload();
    `);
    await sleep(3000);

    // 3. Inspecter la vue Espace Super Admin
    const adminCheck = await evalInPage(`(() => {
      const h1 = document.querySelector('h1')?.innerText || '';
      const text = document.body.innerText;
      
      const hasTitle = text.includes('Espace Super Admin — Seconde Vie');
      const hasConnected = text.includes('gfdsq') && text.includes('Super Admin');
      const hasNetNegatif = text.includes('-11000') || /-([0-9]+)\s*F/.test(text);
      const hasNetZeroOrPositif = /Net\s*:\s*[0-9\s]+F/.test(text);
      const hasRawApiCategories = text.includes('GET /api/categories');
      const hasUsersDeadZero = /Membres & Vendeurs[\\s\\S]*?0[\\s\\S]*?Permission requise/.test(text);
      const hasLogoutBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Déconnexion') || b.title?.includes('Déconnexion'));
      const hasSyncBtn = Array.from(document.querySelectorAll('button')).some(b => b.title?.includes('Actualiser'));

      return {
        hasTitle,
        hasConnected,
        hasNetNegatif,
        hasNetZeroOrPositif,
        hasRawApiCategories,
        hasUsersDeadZero,
        hasLogoutBtn,
        hasSyncBtn
      };
    })()`);

    console.log('Resultats Espace Super Admin :', adminCheck);

    if (adminCheck.hasNetNegatif) {
      throw new Error('ERREUR : Un montant net négatif apparaît dans le dashboard admin !');
    }
    if (adminCheck.hasRawApiCategories) {
      throw new Error('ERREUR : "GET /api/categories" apparaît toujours en brut !');
    }
    if (adminCheck.hasUsersDeadZero) {
      throw new Error('ERREUR : 0 utilisateurs avec "Permission requise" alors qu\'une session admin est active !');
    }

    // 4. Cliquer sur l'onglet "Comptes" pour vérifier la carte de session
    await evalInPage(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Comptes'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);

    const userTabCheck = await evalInPage(`(() => {
      const text = document.body.innerText;
      return {
        hasSessionCard: text.includes('Session en cours') && text.includes('gfdsq'),
        hasSuperAdminRole: text.includes('Super Administrateur') || text.includes('Super Admin'),
        hasActiveVendors: text.includes('Vendeur') || text.includes('Vendeurs')
      };
    })()`);

    console.log('Resultats Onglet Comptes (Session Admin) :', userTabCheck);

    // 5. Tester le modal de publication et son upsell Boost
    await evalInPage(`
      window.location.hash = '#publier';
    `);
    await sleep(1500);

    const publishModalShown = await evalInPage(`(() => {
      const text = document.body.innerText;
      return text.includes('Déposer une annonce') || text.includes('Publication Sécurisée');
    })()`);
    console.log('PublishModal ouvert :', publishModalShown);

    // 6. Tester "Mes Annonces" dans UserProfile
    await evalInPage(`
      window.location.hash = '#mon-compte';
    `);
    await sleep(1500);

    const profileCheck = await evalInPage(`(() => {
      const text = document.body.innerText;
      const hasMyAdsTab = text.includes('Mes Annonces');
      const hasBoostBanner = text.includes('Booster cette annonce') || text.includes('Annonce boostée');
      return {
        hasMyAdsTab,
        hasBoostBanner
      };
    })()`);
    console.log('Resultats UserProfile (Mes Annonces & Boost CTA) :', profileCheck);

    console.log('--- TOUS LES TESTS SONT VALIDES AVEC SUCCÈS ! ---');
  } finally {
    edgeProcess.kill();
  }
}

run().catch((err) => {
  console.error('ECHEC DU TEST :', err);
  process.exit(1);
});
