# SecuStock — Application Web de Gestion de Stock (Matériel de Sécurité)

Application professionnelle complète de gestion de stock, d'alertes en temps réel, de traçabilité des mouvements et d'inventaire physique pour une entreprise spécialisée dans les équipements de protection et sécurité (Caméras IP, Enregistreurs NVR/DVR, Alarmes anti-intrusion, Contrôle d'accès biométrique, Câbles, Alimentations et Extincteurs).

---

## 1. Architecture & Base de Données

- **Frontend** : React 19 + TypeScript + Tailwind CSS + Lucide Icons + Recharts
- **Backend** : Node.js / Express avec contrôle d'accès strict (RBAC)
- **Base de Données** : PostgreSQL hébergé sur Cloud SQL avec pool de connexions `pg.Pool`
- **ORM** : Drizzle ORM avec vérification de type et intégrité relationnelle
- **Devise** : Franc CFA (FCFA) sans approximation flottante
- **Magasin** : Magasin Central unique

---

## 2. Rôles et Droits d'Accès (RBAC)

L'application distingue deux profils d'utilisateurs avec validation côté serveur :

### Administrateur (`admin`)
- Accès illimité à toutes les fonctions
- Création, modification, archivage et suppression de produits
- Création de catégories et de fournisseurs
- Gestion des utilisateurs et promotion/rétrogradation de rôles
- Export et restauration complète de la base de données
- Consultation du journal d'audit immuable (`audit_logs`)

### Magasinier (`storekeeper`)
- Consultation du catalogue, des stocks disponibles et des emplacements
- Enregistrement des réceptions de marchandises (Entrées de stock)
- Enregistrement des sorties pour chantiers et ventes (avec contrôle anti-stock négatif)
- Réalisation des inventaires physiques avec calcul automatique des écarts
- Consultation de l'historique des mouvements et export CSV

---

## 3. Règles de Gestion et Sécurité du Stock

1. **Intégrité Atomique** : Toute modification de stock (entrée, sortie, régularisation) s'exécute au sein d'une transaction PostgreSQL.
2. **Contrôle Strict des Sorties** : Il est techniquement impossible de sortir une quantité supérieure au stock disponible. La requête est rejetée avec une alerte explicite.
3. **Protection de l'Historique** : Un produit ayant au moins un mouvement de stock ne peut pas être supprimé afin de garantir la traçabilité comptable. Il doit être **archivé**.
4. **Inventaire Régularisé** : Aucun stock n'est modifié silencieusement. Tout écart physique constaté génère un mouvement de régularisation automatique `REG-YYYYMMDD-XXXX` horodaté avec l'opérateur responsable.
5. **Alertes Automatiques** :
   - **Disponible** : Quantité > Seuil minimal
   - **Stock faible** : 0 < Quantité ≤ Seuil minimal
   - **Rupture** : Quantité = 0

---

## 4. Guide de Création du Premier Administrateur

1. À la première utilisation, le premier utilisateur qui se connecte ou dont l'e-mail correspond au propriétaire du projet (`aboubakarsiidibe@gmail.com`) reçoit automatiquement le rôle **Administrateur**.
2. Dans le menu **Paramètres & Rôles**, l'administrateur peut à tout moment modifier le rôle de n'importe quel autre compte enregistré.
3. Un sélecteur rapide de profil dans l'en-tête permet également de basculer instantanément entre le profil **Directeur Admin** et **Magasinier Chef** pour vérifier la conformité des permissions.

---

## 5. Procédure de Sauvegarde et Restauration

### Sauvegarde (Export JSON)
1. Rendez-vous dans **Paramètres & Rôles** > onglet **Sauvegarde & Restauration**.
2. Cliquez sur **Télécharger le fichier de sauvegarde (.json)**.
3. Le fichier généré contient l'ensemble des données structurées : catégories, articles, fournisseurs, mouvements, sessions d'inventaire et journal d'audit.

### Restauration
1. Ouvrez le fichier JSON de sauvegarde précédemment téléchargé.
2. Copiez l'intégralité du contenu JSON.
3. Collez-le dans le champ de restauration et cliquez sur **Exécuter la Restauration**.
4. Les tables sont mises à jour sans risque d'écrasement intempestif grâce aux contraintes `ON CONFLICT DO NOTHING`.

---

## 6. Peuplement du Jeu de Démonstration (Démo Sécurité)

Pour initialiser immédiatement des articles de sécurité réalistes :
- Cliquez sur le bouton **Peupler le matériel démo** disponible dans le tableau de bord ou dans les paramètres.
- Cela créera automatiquement des caméras dômes Hikvision 4MP, caméras tubes Dahua 8MP 4K, enregistreurs NVR 16 et 32 voies, centrales d'alarme sans fil Ajax Systems, terminaux biométriques ZKTeco, rouleaux de câbles RJ45 Cat6, extincteurs 6 kg, alimentations secourues 12V 10A et batteries au plomb 7Ah.

---

## 7. Gestion des Retours de Marchandise

Le module **Retours de Marchandise** gère deux flux essentiels :

### A. Retour Client / Chantier (`CUSTOMER`)
- Réception de matériel retourné par un client ou surplus d'un chantier d'installation.
- Choix de l'impact sur le stock :
  - **Réintégration directe** : si le matériel est neuf et fonctionnel, le stock disponible est immédiatement incrémenté (+Qte) et un mouvement d'entrée tracé est généré.
  - **Quarantaine SAV** : si le matériel est défectueux ou nécessite une expertise, il est enregistré dans le registre des retours sans fausser le stock disponible pour la vente.

### B. Retour Fournisseur / SAV (`SUPPLIER`)
- Expédition d'articles défectueux ou surplus vers le distributeur / constructeur.
- Déstockage atomique immédiat (-Qte) avec validation anti-stock négatif.
- Rapprochement avec le fournisseur agréé, le motif et la référence de bon de retour.

---

## 8. Remise à Zéro Complète du Magasin (Magasin Vierge)

- Dans **Paramètres & Rôles** > onglet **Sauvegarde & Restauration** > **Zone de Danger**, un bouton dédié permet à l'administrateur de purger l'ensemble des articles, mouvements, réceptions, sorties et inventaires pour retrouver un magasin vierge (statistiques à 0).
- Les 13 familles/catégories de sécurité et les comptes utilisateurs restent opérationnels pour commencer immédiatement la saisie de vos articles réels.
