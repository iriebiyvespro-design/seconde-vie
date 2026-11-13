import { spawn } from 'child_process';
import http from 'http';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9335;
  const userDataDir = 'C:\\Users\\PC\\AppData\\Local\\Temp\\edge_test_boost_' + Date.now();

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

    const evalInPage = async (expression) => {
      const res = await sendCDP(pageWs, 'Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    };

    await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2500);

    // Seeder un utilisateur avec une annonce lui appartenant
    await evalInPage(`
      localStorage.setItem('sv_user', JSON.stringify({
        id: 101,
        username: 'vendeur_test',
        full_name: 'Vendeur Test',
        email: 'vendeur@test.ci',
        phone: '+225 07 11 22 33 44',
        commune: 'Cocody'
      }));
      window.location.hash = '#mon-compte';
      window.location.reload();
    `);
    await sleep(3000);

    const profileCheck = await evalInPage(`(() => {
      const text = document.body.innerText;
      return {
        hasMyAdsTab: text.includes('Mes Annonces'),
        hasEmptyState: text.includes("Vous n'avez pas encore publié d'annonce"),
        hasProfile: text.includes('Vendeur Test')
      };
    })()`);

    console.log('Test UserProfile avec compte authentifié :', profileCheck);
  } finally {
    edgeProcess.kill();
  }
}

run().catch(console.error);

