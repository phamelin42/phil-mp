// Déploie chaque produit sur Vercel, à son sous-domaine (`produit.json` →
// `domaine`) : build, projet créé s'il manque, domaine attaché s'il manque,
// puis mise en production du dossier statique. Lancé par
// .github/workflows/deployer.yml après une CI verte sur main.
//   VERCEL_TOKEN=… node tools/deployer.mjs [slug]
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { application, produits } from './apps.mjs';
import {
  assurerDomaine,
  assurerProjet,
  client,
  compte,
  configDeploiement,
  nomProjet,
} from './vercel.mjs';

const jeton = process.env['VERCEL_TOKEN'];
if (!jeton) {
  console.error('VERCEL_TOKEN absent : rien à déployer.');
  process.exit(1);
}

function lancer(cmd, args, options = {}) {
  return spawnSync(cmd, args, { stdio: 'inherit', ...options }).status === 0;
}

function resume(ligne) {
  console.log(ligne);
  if (process.env['GITHUB_STEP_SUMMARY'])
    appendFileSync(process.env['GITHUB_STEP_SUMMARY'], `${ligne}\n`);
}

const { teamId, orgId } = await compte(client({ jeton, fetch }), process.env['VERCEL_TEAM_ID']);
const appel = client({ jeton, fetch, teamId });
const cibles = process.argv[2] ? [application(process.argv[2])] : produits();
let echecs = 0;

for (const app of cibles) {
  const produit = JSON.parse(readFileSync(join(app.racine, 'produit.json'), 'utf8'));
  const nom = nomProjet(app.nom);
  try {
    if (!lancer('node', ['tools/construire.mjs', app.nom])) throw new Error('build en échec');
    const pret = lancer('node', ['tools/check-lancement.mjs', app.nom], { stdio: 'ignore' });
    const vercelJson = JSON.parse(readFileSync(join(app.racine, 'vercel.json'), 'utf8'));
    writeFileSync(
      join(app.dist, 'vercel.json'),
      JSON.stringify(configDeploiement(vercelJson, pret)),
    );

    const projet = await assurerProjet(appel, nom);
    const domaine = await assurerDomaine(appel, nom, produit.domaine);
    const ok = lancer(
      'npx',
      ['--yes', 'vercel@latest', 'deploy', app.dist, '--prod', '--yes', '--token', jeton],
      { env: { ...process.env, VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projet.id } },
    );
    if (!ok) throw new Error('vercel deploy en échec');
    resume(
      `- ${app.nom} : https://${produit.domaine}` +
        (projet.cree ? ' (projet créé)' : '') +
        (domaine.ajoute ? ' (domaine ajouté)' : '') +
        (domaine.verifie ? '' : ' — domaine en attente de vérification DNS') +
        (pret ? '' : ' — noindex : pas encore prêt (npm run lancement)'),
    );
  } catch (e) {
    echecs++;
    resume(
      `- ${app.nom} : échec — ${String(e instanceof Error ? e.message : e).replaceAll(jeton, '***')}`,
    );
  }
}

process.exit(echecs ? 1 : 0);
