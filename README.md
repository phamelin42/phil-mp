# Micro-produits — dix PWA en dix semaines

Un micro-produit web par semaine, chacun visant 200 à 500 € par mois. C'est
l'addition qui fait le revenu. L'acquisition est quasi gratuite : chaque
produit répond à une requête que les gens tapent déjà.

Workspace Angular unique : deux bibliothèques partagées (`@mp/core`,
`@mp/ui`), une application par produit, un schematic qui crée un produit en
une commande. Seuls le module métier et le contenu éditorial sont propres à
chaque produit (`docs/adr-002-architecture.md`).

Chaque produit est servi, pour l'instant, sur un sous-domaine de
`phamelin.fr` (`devis-artisan.phamelin.fr`…) ; un domaine propre se donnera
à un produit qui a du trafic.

- Règles et architecture : [`CLAUDE.md`](CLAUDE.md)
- Rôle de l'agent et rapport mensuel : [`AGENTS.md`](AGENTS.md)
- Contribuer : [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Contenu unique par produit : [`docs/contenu-unique.md`](docs/contenu-unique.md)
- Tunnel de conversion : [`docs/tunnel.md`](docs/tunnel.md)
- Mise en ligne : [`docs/lancement.md`](docs/lancement.md)

## Créer le produit de la semaine

```sh
npm install
npm run nouveau-produit -- garde-alternee
npm run icones -- garde-alternee
npm run verify:ci
```

Puis les deux fiches créées dans `prompts/<slug>/` : le module métier, et le
contenu éditorial.

## Décisions

- **Umami plutôt que Google Analytics 4** : sans cookie, donc sans bandeau ni
  visites perdues sur un refus (`docs/adr-001-mesure-audience.md`). La Search
  Console complète.
- **Gratuit d'abord** : l'intérêt pour une offre complète se mesure ; le
  paiement ne se construit, après ADR, que pour un produit qui a du trafic.
- **Ionic pour les formulaires**, prêts pour une application mobile : les
  mêmes composants serviront dans l'app (`docs/adr-003-bibliotheque-graphique.md`).
- **Empaquetage natif en option**, seulement sur trafic réel : TWA comme
  Pattern Reader (`docs/play-store.md` de crochet-helper), Capacitor si une API native
  manque.

## Calendrier

| Semaine | Produit                      | Adresse                                                                        | Requête visée                               | État                         |
| ------- | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------- |
| 1       | Devis Artisan                | [devis-artisan.phamelin.fr](https://devis-artisan.phamelin.fr)                 | modèle devis plombier auto-entrepreneur     | prêt                         |
| 2       | Planning Garde Alternée      | [garde-alternee.phamelin.fr](https://garde-alternee.phamelin.fr)               | calendrier garde alternée à imprimer        | prêt                         |
| 3       | Inventaire Collection        | [inventaire-collection.phamelin.fr](https://inventaire-collection.phamelin.fr) | application inventaire collection           | prêt                         |
| 4       | Prix Fait Main               | [prix-fait-main.phamelin.fr](https://prix-fait-main.phamelin.fr)               | calculer prix de vente création fait main   | construit, mesure à brancher |
| 5       | Contrat Location Saisonnière | [contrat-saisonnier.phamelin.fr](https://contrat-saisonnier.phamelin.fr)       | modèle contrat location saisonnière gratuit | construit, mesure à brancher |
| 6       | Road Trip Van                |                                                                                | itinéraire van aménagé France               |                              |
| 7       | Recette à l'Échelle          |                                                                                | convertir recette 6 personnes en 10         |                              |
| 8       | Carnet d'Entretien           |                                                                                | carnet entretien voiture en ligne           |                              |
| 9       | Planning Révisions           |                                                                                | planning révision bac à imprimer            |                              |
| 10      | Volume Aquarium              |                                                                                | calcul volume aquarium litres               |                              |

- **prêt** : module métier et contenu rédigés, `npm run lancement` ne signale
  plus rien ; reste la liste manuelle de `docs/lancement.md`.
- **construit, mesure à brancher** : outil et contenu faits, mais le site
  Umami n'est pas encore créé (`produit.json` → `mesure.siteId`) ; le
  produit est servi en `noindex` jusque-là.

Domaine de chaque produit : `<slug>.phamelin.fr` (`produits.json`).
