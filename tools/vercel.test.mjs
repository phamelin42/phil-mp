import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assurerDomaine,
  assurerProjet,
  client,
  compte,
  configDeploiement,
  nomProjet,
} from './vercel.mjs';

/** Faux Vercel : un état en mémoire, et la liste des appels reçus. */
function fauxVercel({ projets = {}, domaines = {}, defaultTeamId = null } = {}) {
  const appels = [];
  const fetch = async (url, init) => {
    const u = new URL(url);
    const corps = init.body ? JSON.parse(init.body) : null;
    appels.push(`${init.method} ${u.pathname}${u.search}`);
    const rep = (statut, json) => new Response(JSON.stringify(json), { status: statut });
    let m;
    if (u.pathname === '/v2/user') return rep(200, { user: { id: 'u1', defaultTeamId } });
    if ((m = /^\/v9\/projects\/([^/]+)\/domains\/(.+)$/.exec(u.pathname))) {
      const d = domaines[`${m[1]}/${decodeURIComponent(m[2])}`];
      return d ? rep(200, d) : rep(404, { error: { code: 'not_found' } });
    }
    if ((m = /^\/v9\/projects\/([^/]+)$/.exec(u.pathname))) {
      return projets[m[1]] ? rep(200, projets[m[1]]) : rep(404, { error: { code: 'not_found' } });
    }
    if (u.pathname === '/v11/projects') {
      projets[corps.name] = { id: `prj_${corps.name}`, framework: corps.framework };
      return rep(200, projets[corps.name]);
    }
    if ((m = /^\/v10\/projects\/([^/]+)\/domains$/.exec(u.pathname))) {
      domaines[`${m[1]}/${corps.name}`] = { name: corps.name, verified: true };
      return rep(200, domaines[`${m[1]}/${corps.name}`]);
    }
    return rep(500, { error: { message: 'inattendu' } });
  };
  return { fetch, appels, projets, domaines };
}

test('premier déploiement : crée le projet statique et attache le sous-domaine', async () => {
  const v = fauxVercel();
  const appel = client({ jeton: 'j', fetch: v.fetch });
  const projet = await assurerProjet(appel, nomProjet('devis-artisan'));
  const domaine = await assurerDomaine(appel, 'mp-devis-artisan', 'devis-artisan.phamelin.fr');
  assert.deepEqual(projet, { id: 'prj_mp-devis-artisan', cree: true });
  assert.equal(v.projets['mp-devis-artisan'].framework, null);
  assert.deepEqual(domaine, { ajoute: true, verifie: true });
});

test('déploiements suivants : rien n’est recréé', async () => {
  const v = fauxVercel({
    projets: { 'mp-devis-artisan': { id: 'prj_1' } },
    domaines: { 'mp-devis-artisan/devis-artisan.phamelin.fr': { verified: true } },
  });
  const appel = client({ jeton: 'j', fetch: v.fetch });
  assert.deepEqual(await assurerProjet(appel, 'mp-devis-artisan'), { id: 'prj_1', cree: false });
  assert.deepEqual(await assurerDomaine(appel, 'mp-devis-artisan', 'devis-artisan.phamelin.fr'), {
    ajoute: false,
    verifie: true,
  });
  assert.equal(v.appels.filter((a) => a.startsWith('POST')).length, 0);
});

test('compte : équipe par défaut du jeton, sinon compte personnel ; teamId transmis', async () => {
  assert.deepEqual(await compte(client({ jeton: 'j', fetch: fauxVercel().fetch })), {
    teamId: null,
    orgId: 'u1',
  });
  const v = fauxVercel({ defaultTeamId: 'team_9' });
  const c = await compte(client({ jeton: 'j', fetch: v.fetch }));
  assert.deepEqual(c, { teamId: 'team_9', orgId: 'team_9' });
  await assurerProjet(client({ jeton: 'j', fetch: v.fetch, teamId: c.teamId }), 'mp-x');
  assert.ok(v.appels.slice(-1)[0].endsWith('?teamId=team_9'));
});

test('une erreur de Vercel remonte avec son statut, sans le jeton', async () => {
  const fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403 });
  await assert.rejects(assurerProjet(client({ jeton: 'secret', fetch }), 'mp-x'), (e) => {
    assert.match(e.message, /HTTP 403 Forbidden/);
    assert.doesNotMatch(e.message, /secret/);
    return true;
  });
});

test('produit pas prêt : servi en noindex ; prêt : en-têtes du produit seuls', () => {
  const vercelJson = {
    cleanUrls: true,
    headers: [{ source: '/(.*)', headers: [{ key: 'A', value: 'b' }] }],
  };
  const pret = configDeploiement(vercelJson, true);
  const brouillon = configDeploiement(vercelJson, false);
  assert.deepEqual(pret, vercelJson);
  assert.equal(brouillon.headers.length, 2);
  assert.deepEqual(brouillon.headers[1].headers, [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  ]);
  assert.equal(vercelJson.headers.length, 1, 'la configuration du produit n’est pas modifiée');
});
