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
  console.log('--- TEST RESTAURATION CATEGORY GRID & FOOTER CLEANUP ---');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9334;
  const userDataDir = 'C:\\Users\\PC\\AppData\\Local\\Temp\\edge_test_cat_' + Date.now();

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

    const target = versionData.find(t => t.type === 'page') || versionData[0];
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

    // Navigation
    await sendCDP(pageWs, 'Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(4000);

    const pageContent = await evalInPage(`(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyLen: document.body.innerText.length,
        textSnippet: document.body.innerText.slice(0, 300)
      };
    })()`);
    console.log('Page Content Check :', pageContent);

    // 1. Vérification de la section Catégories (CategoryGrid)
    const catCheck = await evalInPage(`(() => {
      const text = document.body.innerText;
      const section = document.getElementById('categories');
      const hasBadge = text.includes('NAVIGATION PAR UNIVERS');
      const hasTitle = text.includes('Explorez par catégorie');
      const hasSubtitle = text.includes('Faites glisser ou sélectionnez une catégorie');
      const hasMultipleProductRows = document.querySelectorAll('[data-category-row]').length > 0;
      
      const cards = section ? Array.from(section.querySelectorAll('h3')).map(h => h.innerText.trim()) : [];

      return {
        hasBadge,
        hasTitle,
        hasSubtitle,
        hasMultipleProductRows,
        categoryCardsCount: cards.length,
        categoriesSample: cards.slice(0, 5)
      };
    })()`);

    console.log('Resultats Grille Catégories :', catCheck);

    if (!catCheck.hasBadge || !catCheck.hasTitle) {
      throw new Error('ERREUR : Titre ou badge de la section Catégorie manquant !');
    }
    if (catCheck.hasMultipleProductRows) {
      throw new Error('ERREUR : Les rangées de produits par catégorie sont encore présentes !');
    }
    if (catCheck.categoryCardsCount < 12) {
      throw new Error('ERREUR : Il doit y avoir 12 cartes de catégories, trouvé: ' + catCheck.categoryCardsCount);
    }

    // 2. Vérification du Footer
    const footerCheck = await evalInPage(`(() => {
      const footer = document.querySelector('footer');
      if (!footer) return { found: false };
      const fText = footer.innerText;

      const hasEspaceMembreTitle = fText.includes('ESPACE MEMBRE');
      const hasMentionsLegalesTitle = fText.includes('MENTIONS LÉGALES');
      const hasMonCompte = fText.includes('Mon Compte & Paramètres');
      const hasMesAnnonces = fText.includes('Mes Annonces en ligne');
      const hasMesFavoris = fText.includes('Mes Favoris sauvegardés');
      
      const hasMentionsLink = fText.includes('Mentions légales');
      const hasCGULink = fText.includes('Conditions Générales (CGU)');
      const hasPrivacyLink = fText.includes('Politique de confidentialité');
      const hasRulesLink = fText.includes('Charte de modération & Sécurité');

      // Vérifier le bas du footer (ligne copyright)
      const copyrightBar = footer.querySelector('.border-t.border-slate-800');
      const bottomText = copyrightBar ? copyrightBar.innerText : '';
      const hasDuplicateBottomLegal = bottomText.includes('•') && (bottomText.includes('CGU') || bottomText.includes('Confidentialité'));

      return {
        found: true,
        hasEspaceMembreTitle,
        hasMentionsLegalesTitle,
        hasMonCompte,
        hasMesAnnonces,
        hasMesFavoris,
        hasMentionsLink,
        hasCGULink,
        hasPrivacyLink,
        hasRulesLink,
        hasDuplicateBottomLegal
      };
    })()`);

    console.log('Resultats Footer :', footerCheck);

    if (footerCheck.hasDuplicateBottomLegal) {
      throw new Error('ERREUR : Le doublon de liens légaux en bas du footer est toujours présent !');
    }
    if (!footerCheck.hasEspaceMembreTitle || !footerCheck.hasMentionsLegalesTitle) {
      throw new Error('ERREUR : Titres ESPACE MEMBRE ou MENTIONS LÉGALES manquants dans le Footer !');
    }
    if (!footerCheck.hasMentionsLink) {
      throw new Error('ERREUR : Le lien Mentions légales est manquant dans le Footer !');
    }

    // 3. Clic sur le lien "Mentions légales" pour tester l'ouverture de la modale
    await evalInPage(`(() => {
      const links = Array.from(document.querySelectorAll('footer button'));
      const mentionsBtn = links.find(b => b.innerText.trim() === 'Mentions légales');
      if (mentionsBtn) mentionsBtn.click();
    })()`);
    await sleep(1500);

    const modalCheck = await evalInPage(`(() => {
      const text = document.body.innerText;
      return {
        isModalOpen: text.includes('Informations Légales & Éditeur') || text.includes('Éditeur & Hébergeur officiel'),
        hasCloudflare: text.includes('Cloudflare Pages'),
        hasEmail: text.includes('contact@secondevie.ci')
      };
    })()`);

    console.log('Resultats Modale Mentions Légales :', modalCheck);

    if (!modalCheck.isModalOpen || !modalCheck.hasCloudflare) {
      throw new Error('ERREUR : La modale des Mentions légales ne s\'affiche pas avec les détails de l\'éditeur et hébergeur !');
    }

    console.log('--- TOUS LES TESTS SONT VALIDES AVEC SUCCÈS (100%) ! ---');
  } finally {
    edgeProcess.kill();
  }
}

run().catch((err) => {
  console.error('ECHEC DU TEST :', err);
  process.exit(1);
});
