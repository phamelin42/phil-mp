// Seul point de contact avec l'API de Vercel (déploiement, deployer.mjs).
// Idempotent : un projet ou un domaine déjà en place est laissé tel quel.
// Le jeton (secret VERCEL_TOKEN) n'apparaît jamais dans un message d'erreur.

const API = 'https://api.vercel.com';
const DELAI_MS = 20_000;

/** Client minimal ; `fetch` s'injecte en test. */
export function client({ jeton, fetch, teamId = null }) {
  return async function appel(methode, chemin, corps) {
    const url = new URL(chemin, API);
    if (teamId) url.searchParams.set('teamId', teamId);
    const rep = await fetch(url, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const texte = await rep.text();
    let json = null;
    try {
      json = texte ? JSON.parse(texte) : null;
    } catch {
      // réponse non JSON : on garde le statut seul
    }
    return { statut: rep.status, json };
  };
}

function echec(quoi, { statut, json }) {
  const detail = json?.error?.message ?? json?.error?.code ?? '';
  return new Error(`Vercel, ${quoi} : HTTP ${statut} ${detail}`.trim());
}

/**
 * Compte visé : l'équipe donnée (VERCEL_TEAM_ID), sinon l'équipe par défaut du
 * jeton, sinon le compte personnel. `orgId` est ce qu'attend la CLI.
 */
export async function compte(appel, teamIdForce = null) {
  const r = await appel('GET', '/v2/user');
  if (r.statut !== 200 || !r.json?.user?.id) throw echec('lecture du compte', r);
  const teamId = teamIdForce || r.json.user.defaultTeamId || null;
  return { teamId, orgId: teamId || r.json.user.id };
}

/** Projet `nom`, créé s'il n'existe pas : site statique, sans build côté Vercel. */
export async function assurerProjet(appel, nom) {
  const r = await appel('GET', `/v9/projects/${encodeURIComponent(nom)}`);
  if (r.statut === 200) return { id: r.json.id, cree: false };
  if (r.statut !== 404) throw echec(`lecture du projet ${nom}`, r);
  const c = await appel('POST', '/v11/projects', { name: nom, framework: null });
  if (c.statut !== 200 && c.statut !== 201) throw echec(`création du projet ${nom}`, c);
  return { id: c.json.id, cree: true };
}

/** Domaine attaché au projet, ajouté s'il manque. */
export async function assurerDomaine(appel, nom, domaine) {
  const chemin = `/v9/projects/${encodeURIComponent(nom)}/domains/${encodeURIComponent(domaine)}`;
  const r = await appel('GET', chemin);
  if (r.statut === 200) return { ajoute: false, verifie: r.json?.verified !== false };
  if (r.statut !== 404) throw echec(`lecture du domaine ${domaine}`, r);
  const a = await appel('POST', `/v10/projects/${encodeURIComponent(nom)}/domains`, {
    name: domaine,
  });
  if (a.statut !== 200 && a.statut !== 201) throw echec(`ajout du domaine ${domaine}`, a);
  return { ajoute: true, verifie: a.json?.verified !== false };
}

/**
 * vercel.json du dossier déployé : en-têtes et URL propres du produit. Un
 * produit pas encore prêt (`npm run lancement` en échec) est servi en
 * `noindex` : visible pour le relire, jamais indexé avec des textes à rédiger.
 */
export function configDeploiement(vercelJson, pret) {
  const config = {
    cleanUrls: vercelJson.cleanUrls ?? true,
    headers: structuredClone(vercelJson.headers ?? []),
  };
  if (!pret) {
    config.headers.push({
      source: '/(.*)',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    });
  }
  return config;
}

/** Nom du projet Vercel d'un produit. */
export function nomProjet(slug) {
  return `mp-${slug}`;
}
