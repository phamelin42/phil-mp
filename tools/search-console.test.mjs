import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { assertion, collecter, lireLignes, requete } from './search-console.mjs';

test('assertion signée RS256, vérifiable avec la clé publique', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const compte = {
    client_email: 'rapport@projet.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
  const [entete, charge, signature] = assertion(compte, 1_000).split('.');
  const ok = createVerify('RSA-SHA256')
    .update(`${entete}.${charge}`)
    .verify(publicKey, signature, 'base64url');
  assert.ok(ok);
  const contenu = JSON.parse(Buffer.from(charge, 'base64url').toString());
  assert.equal(contenu.exp - contenu.iat, 3600);
  assert.match(contenu.scope, /webmasters\.readonly$/);
});

test('lignes : forme stable, valeurs arrondies, lignes illisibles écartées', () => {
  const lignes = lireLignes({
    rows: [
      { keys: ['devis plombier'], clicks: 3, impressions: 120, ctr: 0.025, position: 8.456 },
      { keys: [42] },
      { pas: 'de clés' },
    ],
  });
  assert.deepEqual(lignes, [
    { cle: 'devis plombier', clics: 3, impressions: 120, ctr: 0.025, position: 8.5 },
  ]);
  assert.deepEqual(lireLignes(null), []);
});

test('une propriété « domaine » est filtrée sur le sous-domaine du produit', () => {
  const corps = requete({
    debut: '2026-09-01',
    fin: '2026-09-30',
    dimensions: ['query'],
    domaine: 'devis-artisan.phamelin.fr',
  });
  assert.deepEqual(corps.dimensionFilterGroups, [
    {
      filters: [
        { dimension: 'page', operator: 'contains', expression: '://devis-artisan.phamelin.fr/' },
      ],
    },
  ]);
  assert.equal('dimensionFilterGroups' in requete({ debut: 'a', fin: 'b', dimensions: [] }), false);
});

test('sans secrets : ok false, pas d’exception', async () => {
  const sortie = await collecter({
    mois: '2026-09',
    env: {},
    fetch: () => assert.fail('aucun appel'),
  });
  assert.equal(sortie.ok, false);
});

// Décision de Phil (09/11/2026) : la Search Console n'est pas branchée ; le
// rapport doit pouvoir distinguer ce choix d'une panne.
test('sans secrets : non branchée, sans erreur à signaler', async () => {
  const sortie = await collecter({ mois: '2026-09', env: {}, fetch: () => assert.fail() });
  assert.equal(sortie.branchee, false);
  assert.equal(sortie.erreur, null);
});

test('secrets présents mais API en échec : branchée, avec son erreur', async () => {
  const sortie = await collecter({
    mois: '2026-09',
    env: { GSC_SERVICE_ACCOUNT: '{}', GSC_PROPRIETE: 'sc-domain:phamelin.fr' },
    fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }),
  });
  assert.equal(sortie.ok, false);
  assert.equal(sortie.branchee, true);
  assert.match(sortie.erreur, /^Search Console : /);
});
