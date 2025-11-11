import React, {useState} from 'react';
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import axios from 'axios'; // Import axios

import {useNetInfo} from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
//importation de l'URL de connexion
import monurl from '../api/urldeconnexion.js';
import AuthenticationService from '../authentificationservice'; // Assurez-vous que le chemin est correct
// IMPORTANT: Activer les promesses AVANT d'ouvrir la base de données
//SQLite.enablePromise(true);

const dbName = 'bd_bonamas_local.db';
const bonamasDirectory = `${RNFS.ExternalDirectoryPath}/Bonamas`;
const destinationPath = `${bonamasDirectory}/${dbName}`;
//const dbPath = `${RNFS.ExternalDirectoryPath}/Bonamas/${dbName}`;
//const dbPath = `${RNFS.DocumentDirectoryPath}/Bonamas/${dbName}`;
//const dbPath = `${RNFS.DocumentDirectoryPath}/${dbName}`;

const db = SQLite.openDatabase(
  {name: dbName, location: 'default'},
  () => {
    console.log('📂 Base SQLite ouverte');
    console.log('Chemin de la base de données:', destinationPath);

    // Exemple de requête pour vérifier que la base de données fonctionne
    db.transaction(tx => {
      tx.executeSql(
        'SELECT name FROM sqlite_master WHERE type="table"',
        [],
        (_tx, results) => {
          console.log('Tables dans la base de données:');
          for (let i = 0; i < results.rows.length; i++) {
            console.log(results.rows.item(i).name);
          }
        },
        error => {
          console.log('❌ Erreur lors de la récupération des tables:', error);
        },
      );
    });
  },
  error => {
    console.log('❌ Erreur ouverture SQLite:', error);
  },
);

// ==========================
// 🔹 Vider toutes les tables
// ==========================

// Réinitialiser toutes les tables locales et les flags
const resetDatabase = async () => {
  try {
    const tables = [
      'etablissements',
      'etablissementannees',
      'eleves',
      'elevesinscrits',
      'ues',
      'uesannees',
      'commandesues',
      'detailscommandeues',
      'receptiondrena',
      'detailsreceptiondrena',
      'receptions',
      'detailsreceptions',
      'stockmanuels',
      'manuelseleves',
      'manuelsues',
      'drenas',
      'colis',
      'detailsreceptioncentrale',
    ];

    // Vider chaque table
    for (const table of tables) {
      try {
        await executeSql(`DELETE FROM ${table}`);
        console.log(`🗑️ Données supprimées de ${table}`);
      } catch (err) {
        console.warn(`⚠️ Impossible de vider ${table} :`, err.message);
      }
    }

    // Réinitialiser les flags
    await AsyncStorage.multiRemove([
      'etabDataInitialized',
      'drenaDataInitialized',
    ]);

    console.log('🔄 Base locale réinitialisée avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors du reset de la base locale :', error.message);
  }
};

const resetDatabaseDrena = async () => {
  try {
    const tables = [
      'drenas',
      'colis',
      'detailsreceptioncentrale',
      'receptiondrena',
      'receptions',
      'ues',
      'uesannees',
      'detailsreceptiondrena',
      'stockmanuels',
      'commandesues',
      'detailscommandeues',
      'detailsreceptiondrena',
      'detailsreceptions',
      'detailstransferts',
      'eleves',
      'elevesinscrits',
      'etablissementannees',
      'etablissements',
      'etatmanuels',
      'genre',
      'groupe',
      'manuels',
      'manuelseleves',
      'manuelsues',
    ];

    // Vider chaque table
    for (const table of tables) {
      try {
        await executeSql(`DELETE FROM ${table}`);
        console.log(`🗑️ Données supprimées de ${table}`);
      } catch (err) {
        console.warn(`⚠️ Impossible de vider ${table} :`, err.message);
      }
    }

    // Réinitialiser uniquement le flag DRENA
    await AsyncStorage.removeItem('drenaDataInitialized');

    console.log('🔄 Base locale DRENA réinitialisée avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors du reset de la base DRENA :', error.message);
  }
};

// Fonction générique pour exécuter une requête
const executeSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, results) => resolve(results),
        (_, error) => reject(error),
      );
    });
  });
};

// ==========================
// 🔹 Insertion dynamique
// ==========================

const createTables = () => {
  db.transaction(
    tx => {
      tx.executeSql(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        http_method TEXT DEFAULT NULL,
        http_path TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT NULL
      );
      `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS admin_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT NULL
        );
        
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS admin_role_users (
          role_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT NULL,
          PRIMARY KEY (role_id, user_id)
        );
        `);
      tx.executeSql(`	
          CREATE TABLE IF NOT EXISTS admin_role_permissions (
          role_id INTEGER NOT NULL,
          permission_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT NULL
          );
          `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER DEFAULT 0,
          username TEXT NOT NULL UNIQUE,
          password TEXT DEFAULT NULL,
          drenas_id INTEGER DEFAULT NULL,
          etablissements_id INTEGER DEFAULT NULL,
          ues_id INTEGER DEFAULT NULL,
          name TEXT NOT NULL,
          avatar TEXT DEFAULT NULL,
          api_code TEXT DEFAULT NULL UNIQUE,
          api_pass TEXT DEFAULT NULL UNIQUE,
          remember_token TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT NULL
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS anneescolaires (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          libelleanneescolaire TEXT NOT NULL UNIQUE,
          libelleabrege TEXT DEFAULT NULL,
          datedebut TEXT DEFAULT NULL, -- Stocké en format YYYY-MM-DD
          datefin TEXT DEFAULT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT (datetime('now')),
          created_by INTEGER DEFAULT NULL,
          updated_by INTEGER DEFAULT NULL,
          deleted_by INTEGER DEFAULT NULL
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS api (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL,
          year TEXT NOT NULL,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          exception TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at TEXT DEFAULT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS auteurs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nomauteur TEXT DEFAULT NULL,
          prenomauteur TEXT DEFAULT NULL,
          telephoneauteur TEXT DEFAULT NULL,
          emailauteur TEXT DEFAULT NULL,
          payss_id INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT (datetime('now')),
          created_by INTEGER DEFAULT NULL,
          updated_by INTEGER DEFAULT NULL,
          deleted_by INTEGER DEFAULT NULL
        );
        `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY,
            libelleclasse TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS colis (
            id INTEGER PRIMARY KEY,
            lots_id INTEGER,
            etablissements_id INTEGER NOT NULL,
            numerocolis TEXT NOT NULL UNIQUE,
            numerobonlivraison TEXT,
            nombretotalmanuelscolis INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS commandesues (
            id INTEGER PRIMARY KEY,
            uuid TEXT DEFAULT NULL,
            ues_id INTEGER NOT NULL,
            anneescolaires_id INTEGER NOT NULL,
            nombretotalmanuel INTEGER,
            datesouscription DATE,
            presouscrit INTEGER DEFAULT 0,
            souscrit INTEGER DEFAULT 0,
            numeroremiseue TEXT,
            dateremiseue DATE,
            nombremanuelsremisue INTEGER,
            dateretourprevueue DATE,
            numeroretourue TEXT,
            dateretoureffectiveue DATE,
            nombremanuelsretournesue INTEGER,
            remiseuefinalise INTEGER DEFAULT 0,
            retouruefinalise INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(commandesues);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE commandesues ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS destinatairemanuels (
            id INTEGER PRIMARY KEY,
            destinataire TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS detailscommandeues (
            id INTEGER PRIMARY KEY,
            commandesues_id INTEGER NOT NULL,
            manuels_id INTEGER NOT NULL,
            nombremanuel INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS detailsreceptioncentrale (
            id INTEGER PRIMARY KEY,
            receptioncentrale_id INTEGER NOT NULL,
            manuels_id INTEGER NOT NULL,
            nombremanuel INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS detailsreceptiondrena (
            id INTEGER PRIMARY KEY,
            receptiondrena_id INTEGER NOT NULL,
            etablissements_id INTEGER NOT NULL,
            manuels_id INTEGER NOT NULL,
            nombremanuel INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS detailsreceptions (
            id INTEGER PRIMARY KEY,
            receptions_id INTEGER NOT NULL,
            manuels_id INTEGER NOT NULL,
            destinatairemanuels_id INTEGER,
            nombremanuelrecus INTEGER,
            nombremanuelsrecusenbonetat INTEGER,
            numdebutplage TEXT,
            numfinplage TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS drenas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          designation TEXT NOT NULL UNIQUE,
          adressedreana TEXT,
          telephonedrena TEXT,
          emaildrena TEXT,
          codedrena TEXT,
          codedrenaabrege TEXT,
          numreception INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS editeurs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nomediteur TEXT NOT NULL UNIQUE,
          adresseediteur TEXT,
          emailediteur TEXT,
          telephoneediteur TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS eleves (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT NULL,
          matriculeeleve TEXT NOT NULL UNIQUE,
          nomeleve TEXT,
          prenomseleve TEXT,
          genre_id INTEGER NOT NULL,
          datenaissanceeleve TEXT,
          lieunaissanceeleve TEXT,
          numeroactenaissance TEXT,
          dateetablissementacte DATE,
          lieuetabactenaiss TEXT,
          photoeleve TEXT,
          nationalite_id INTEGER,
          penalite REAL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(eleves);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE eleves ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////
      tx.executeSql(`
            CREATE TABLE IF NOT EXISTS elevesinscrits (
            id INTEGER PRIMARY KEY,
            uuid TEXT DEFAULT NULL,
            reference TEXT DEFAULT NULL,
            anneescolaires_id INTEGER NOT NULL,
            eleves_id INTEGER NOT NULL,
            etablissements_id INTEGER NOT NULL,
            classes_id INTEGER NOT NULL,
            groupe_id INTEGER DEFAULT NULL,
            penalite REAL NOT NULL DEFAULT 0,
            penalite_reference TEXT DEFAULT NULL,
            penalite_idtransaction TEXT DEFAULT NULL,
            penalite_operateur TEXT DEFAULT NULL,
            penalite_montantpaye TEXT DEFAULT NULL,
            penalite_datepaiement TEXT DEFAULT NULL,
            penalite_heurepaiement TEXT DEFAULT NULL,
            penalite_paye INTEGER NOT NULL DEFAULT 0,
            montantsouscription REAL DEFAULT NULL,
            montantapayer REAL DEFAULT NULL,
            idtransaction TEXT DEFAULT NULL,
            operateur TEXT DEFAULT NULL,
            montantpaye REAL DEFAULT 0,
            datepaiement TEXT DEFAULT NULL,
            heurepaiement TEXT DEFAULT NULL,
            presouscrit INTEGER NOT NULL DEFAULT 0,
            souscrit INTEGER NOT NULL DEFAULT 0,
            numeroremiseeleve TEXT DEFAULT NULL,
            dateremiseeleve TEXT DEFAULT NULL,
            nombremanuelsremiseleve INTEGER DEFAULT NULL,
            dateretourprevueeleve TEXT DEFAULT NULL,
            numeroretoureleve TEXT DEFAULT NULL,
            dateretoureffectiveeleve TEXT DEFAULT NULL,
            nombremanuelsretourneseleve INTEGER DEFAULT NULL,
            remisefinalise INTEGER DEFAULT 0,
            retourfinalise INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER DEFAULT NULL,
            updated_by INTEGER DEFAULT NULL,
            deleted_by INTEGER DEFAULT NULL
          );
        `);
      //////////////////////////////
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(elevesinscrits);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'penalite_reference') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE elevesinscrits ADD COLUMN penalite_reference TEXT DEFAULT NULL;',
          );
        }
      });
      tx.executeSql('PRAGMA table_info(elevesinscrits);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE elevesinscrits ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS etablissementannees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          etablissements_id INTEGER NOT NULL,
          anneescolaires_id INTEGER NOT NULL,
          nbmanuelsrecus INTEGER,
          nbmanuelsenstock INTEGER,
          penaliteelve REAL,
          nbmanuelsremisens INTEGER,
          nbmanuelsretourens INTEGER,
          nbmanuelsremiseleve INTEGER,
          nbmanuelsretoureleve INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (etablissements_id, anneescolaires_id)
        );
        `);

      tx.executeSql(`
        CREATE TRIGGER IF NOT EXISTS apresInsertionAnneescolaire
        AFTER INSERT ON anneescolaires
        BEGIN
          INSERT INTO etablissementannees (anneescolaires_id, etablissements_id)
          SELECT NEW.id, id FROM etablissements;
        END;
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS etablissementmanuels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          manuels_id INTEGER NOT NULL,
          etablissementannees_id INTEGER NOT NULL,
          penaliteelve REAL,
          nbmanuelsremisens INTEGER,
          nbmanuelsretourens INTEGER,
          nbmanuelsremiseleve INTEGER,
          nbmanuelsretoureleve INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS etablissements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          drenas_id INTEGER NOT NULL,
          nometablissement TEXT NOT NULL,
          codeetablissement TEXT,
          adresseetablissement TEXT,
          emailetablissement TEXT,
          telephoneetablissement TEXT,
          milieu TEXT NOT NULL,
          statut TEXT NOT NULL,
          numremise INTEGER DEFAULT 0,
          numretour INTEGER DEFAULT 0,
          nummanuel INTEGER DEFAULT 0,
          numreception INTEGER DEFAULT 0,
          validated INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS etatmanuels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codeetat TEXT NOT NULL,
          etatmanuel TEXT,
          description TEXT NOT NULL,
          penalite REAL,
          montantpenalite REAL,
          etoile TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS genre (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          genre TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS groupe (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anneescolaires_id INTEGER NOT NULL,
          etablissements_id INTEGER NOT NULL,
          classes_id INTEGER NOT NULL,
          libellegroupe TEXT,
          effectif INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS "lots" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "anneescolaires_id" INTEGER NOT NULL,
          "editeurs_id" INTEGER NOT NULL,
          "drenas_id" INTEGER NOT NULL,
          "denominationlot" TEXT DEFAULT NULL,
          "nombretotalmanuelscommandes" INTEGER DEFAULT NULL,
          "confirmationdecommande" INTEGER DEFAULT NULL,
          "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "deleted_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "created_by" INTEGER DEFAULT NULL,
          "updated_by" INTEGER DEFAULT NULL,
          "deleted_by" INTEGER DEFAULT NULL
        );
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_commandes_editeurs1_idx" ON "lots" ("editeurs_id");
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_commandes_drenas1_idx" ON "lots" ("drenas_id");
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_lots_anneescolaires1_idx" ON "lots" ("anneescolaires_id");
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS "manuels" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "auteurs_id" INTEGER DEFAULT NULL,
          "typemanuels_id" INTEGER NOT NULL,
          "classes_id" INTEGER NOT NULL,
          "matieres_id" INTEGER NOT NULL,
          "titre" TEXT DEFAULT NULL,
          "isbn" TEXT DEFAULT NULL,
          "referencemanuel" TEXT DEFAULT NULL,
          "couverture" TEXT DEFAULT NULL,
          "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "deleted_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "created_by" INTEGER DEFAULT NULL,
          "updated_by" INTEGER DEFAULT NULL,
          "deleted_by" INTEGER DEFAULT NULL
        );
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_manuels_auteurs1_idx" ON "manuels" ("auteurs_id");
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_manuels_typemanuels1_idx" ON "manuels" ("typemanuels_id");
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_manuels_classes1_idx" ON "manuels" ("classes_id");
        `);
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS "fk_manuels_matieres1_idx" ON "manuels" ("matieres_id");
        `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS "manuelseleves" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT NULL,
          "manuels_id" INTEGER DEFAULT NULL,
          "exemplairemanuelseleve_id" INTEGER DEFAULT NULL,
          "couverture" TEXT DEFAULT NULL,
          "elevesinscrits_id" INTEGER NOT NULL,
          "etatmanuelsremiseeleve_id" INTEGER DEFAULT NULL,
          "rendu" INTEGER DEFAULT 0,
          "etatmanuelsretoureleve_id" INTEGER DEFAULT NULL,
          "montantpenalite" REAL DEFAULT NULL,
          "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP,
          "deleted_at" TEXT DEFAULT NULL,
          "created_by" INTEGER DEFAULT NULL,
          "updated_by" INTEGER DEFAULT NULL,
          "deleted_by" INTEGER DEFAULT NULL,
          UNIQUE("elevesinscrits_id", "manuels_id"),
          FOREIGN KEY("exemplairemanuelseleve_id") REFERENCES "stockmanuels"("id"),
          FOREIGN KEY("elevesinscrits_id") REFERENCES "elevesinscrits"("id"),
          FOREIGN KEY("etatmanuelsremiseeleve_id") REFERENCES "etatmanuelsremiseeleve"("id"),
          FOREIGN KEY("etatmanuelsretoureleve_id") REFERENCES "etatmanuelsretoureleve"("id"),
          FOREIGN KEY("manuels_id") REFERENCES "manuels"("id")
        );
        `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(manuelseleves);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE manuelseleves ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS manuelsues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT NULL,
          commandesues_id INTEGER NOT NULL,
          manuels_id INTEGER NOT NULL,
          exemplairemanuels_id INTEGER,
          etatmanuelsalaremise_id INTEGER,
          etatmanuelsauretour_id INTEGER,
          rendu INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (exemplairemanuels_id)
        );
        `);

      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(manuelsues);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE manuelsues ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS matieres (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          libellematiere TEXT UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS nationalite (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          libellenationalite TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS parametrages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anneescolaires_id INTEGER NOT NULL,
          denominationrepublique TEXT,
          denominationministere TEXT,
          logoministere TEXT,
          devise TEXT,
          nomministre TEXT,
          civiliteministre TEXT,
          genre_id INTEGER,
          dateretour DATE,
          coutmanuel REAL NOT NULL DEFAULT 0,
          numremise INTEGER NOT NULL DEFAULT 0,
          numretour INTEGER NOT NULL DEFAULT 0,
          montantsouscription REAL UNSIGNED DEFAULT 0,
          indexDemarrageLot INTEGER NOT NULL DEFAULT 0,
          indexDemarrageLotStock INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS password_resets (
          email TEXT NOT NULL,
          token TEXT NOT NULL,
          created_at TIMESTAMP,
          PRIMARY KEY (email)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS payss (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nompays TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (nompays)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS personal_access_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tokenable_type TEXT NOT NULL,
          tokenable_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          token TEXT NOT NULL,
          abilities TEXT,
          last_used_at TIMESTAMP,
          created_at TIMESTAMP,
          updated_at TIMESTAMP
        );
        `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS receptioncentrale (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anneescolaires_id INTEGER NOT NULL,
          editeurs_id INTEGER NOT NULL,
          numeroborlivraisonedit TEXT NOT NULL,
          numerobonreceptioncentrale TEXT NOT NULL,
          nombretotalmanuelsrecus INTEGER,
          datereceptioncentrale TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (numeroborlivraisonedit),
          UNIQUE (numerobonreceptioncentrale)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS receptiondrena (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anneescolaires_id INTEGER NOT NULL,
          drenas_id INTEGER NOT NULL,
          editeurs_id INTEGER,
          numerobordereaulivraison TEXT,
          numerobonreceptiondrena TEXT NOT NULL,
          nombretotalmanuelsrecus INTEGER,
          datereceptiondrena TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (numerobordereaulivraison),
          UNIQUE (numerobonreceptiondrena)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS receptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receptiondrena_id INTEGER,
          etablissements_id INTEGER NOT NULL,
          editeurs_id INTEGER,
          numerobonlivraison TEXT,
          numerobondereception TEXT NOT NULL,
          nombretotalmanuelsrecus INTEGER,
          nombretotalmanuelsenbonetat INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (numerobondereception)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS responses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender BLOB NOT NULL,
          reference TEXT,
          number TEXT,
          code TEXT NOT NULL DEFAULT '',
          data TEXT NOT NULL,
          date TEXT,
          time TEXT,
          done INTEGER DEFAULT 0,
          updated_at TEXT
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS statutmanules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          statut TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS stockmanuels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          etablissements_id INTEGER NOT NULL,
          manuels_id INTEGER NOT NULL,
          receptions_id INTEGER NOT NULL,
          destinatairemanuels_id INTEGER,
          statutmanules_id INTEGER NOT NULL DEFAULT 1,
          etatmanuels_id INTEGER NOT NULL DEFAULT 1,
          referenceexemplaire TEXT,
          datepremiereenservice TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ordre INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS typemanuels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          libelletypemanuel TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (libelletypemanuel)
        );
        `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS ues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT NULL,
          etablissements_id INTEGER NOT NULL,
          matieres_id INTEGER NOT NULL,
          suffixe TEXT,
          denominationue TEXT,
          nomeresponsableue TEXT,
          adresseresponsableue TEXT,
          emailresponsableue TEXT,
          telephoneresponsableue TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER
        );
        `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(ues);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql('ALTER TABLE ues ADD COLUMN uuid TEXT DEFAULT NULL;');
        }
      });
      ////////////////////////////////

      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS uesannees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT NULL,
          ues_id INTEGER NOT NULL,
          anneescolaires_id INTEGER NOT NULL,
          matriculeresponsablece TEXT,
          nomresponsablece TEXT,
          emailresponsablece TEXT,
          contactresponsablece TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          updated_by INTEGER,
          deleted_by INTEGER,
          UNIQUE (ues_id, anneescolaires_id)
        );
        `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(uesannees);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE uesannees ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////
      tx.executeSql(`
        CREATE TRIGGER apresinsertionmanuelues
        AFTER INSERT ON manuelsues
        FOR EACH ROW
        BEGIN
          UPDATE stockmanuels
          SET statutmanules_id = 2
          WHERE id = NEW.exemplairemanuels_id;
        END;
        `);
      tx.executeSql(`
        CREATE TRIGGER miseajourapresmodifue
        AFTER UPDATE ON manuelsues
        FOR EACH ROW
        BEGIN
          -- Ajoutez ici les actions à effectuer après la mise à jour
        END;
        `);
      tx.executeSql(`
        CREATE TRIGGER miseajourueapressuppression
        BEFORE DELETE ON manuelsues
        FOR EACH ROW
        BEGIN
          UPDATE stockmanuels
          SET statutmanules_id = 1
          WHERE id = OLD.exemplairemanuels_id;
        END;
        `);
      tx.executeSql(`
        CREATE TRIGGER "miseajourapressuppression" 
        BEFORE DELETE ON "manuelseleves" 
        FOR EACH ROW
        BEGIN
          IF OLD."exemplairemanuelseleve_id" IS NOT NULL THEN
            UPDATE "stockmanuels" SET "statutmanules_id" = 1 WHERE "id" = OLD."exemplairemanuelseleve_id";
          END IF;
        END;
        `);
      tx.executeSql(`
        CREATE TRIGGER "miseajourpenaliteapresmodif" 
        AFTER UPDATE ON "manuelseleves"
        FOR EACH ROW
        BEGIN
          -- Logique à ajouter ici selon vos besoins
        END;
        `);
      tx.executeSql(`
        CREATE TRIGGER IF NOT EXISTS "apresinsertionmanuelseleve"
        AFTER INSERT ON "manuelseleves"
        FOR EACH ROW
        BEGIN
          IF NEW.exemplairemanuelseleve_id IS NOT NULL THEN
            UPDATE stockmanuels SET statutmanules_id = 2 WHERE id = NEW.exemplairemanuelseleve_id;
          END IF;
        END;
        `);

      tx.executeSql(`
        DROP TABLE IF EXISTS cemanuels;
        `);
      tx.executeSql(`
        CREATE VIEW cemanuels AS
        SELECT commandesues.anneescolaires_id AS anneescolaires_id,
               ues.etablissements_id AS etablissements_id,
               SUM(detailscommandeues.nombremanuel) AS manuels
        FROM detailscommandeues
        JOIN commandesues ON commandesues.id = detailscommandeues.commandesues_id
        JOIN ues ON ues.id = commandesues.ues_id
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS cenonpresouscrits;
        `);
      tx.executeSql(`
        CREATE VIEW cenonpresouscrits AS
        SELECT commandesues.anneescolaires_id AS anneescolaires_id,
               ues.etablissements_id AS etablissements_id,
               COUNT(commandesues.id) AS ce_inscrits
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        WHERE commandesues.presouscrit = 0
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS cepresouscrits;
        `);
      tx.executeSql(`
        CREATE VIEW cepresouscrits AS
        SELECT commandesues.anneescolaires_id AS anneescolaires_id,
               ues.etablissements_id AS etablissements_id,
               COUNT(commandesues.id) AS souscrits
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        WHERE commandesues.presouscrit = 1
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS cesouscrits;
        `);
      tx.executeSql(`
        CREATE VIEW cesouscrits AS
        SELECT commandesues.anneescolaires_id AS anneescolaires_id,
               ues.etablissements_id AS etablissements_id,
               COUNT(commandesues.id) AS valides
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        WHERE commandesues.souscrit = 1
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS chiffresglobauxetab;
        `);
      tx.executeSql(`
        CREATE VIEW chiffresglobauxetab AS
        SELECT meselevesinscrits.anneescolaires_id AS anneescolaires_id,
               meselevesinscrits.anneescolaire AS anneescolaire,
               meselevesinscrits.DRENA AS DRENA,
               manuelsenstocks.drenas_id AS drenas_id,
               manuelsenstocks.etablissements_id AS etablissements_id,
               manuelsenstocks.nometablissement AS nometablissement,
               manuelsenstocks.Manuelsenstock AS Manuelsenstock,
               meselevesinscrits.eleves AS eleves,
               mesenseignantsinscrits.enseignants AS enseignants
        FROM manuelsenstocks
        JOIN meselevesinscrits ON meselevesinscrits.etablissements_id = manuelsenstocks.etablissements_id
        LEFT JOIN mesenseignantsinscrits ON mesenseignantsinscrits.etablissements_id = manuelsenstocks.etablissements_id
        AND mesenseignantsinscrits.anneescolaires_id = meselevesinscrits.anneescolaires_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsdistributioneleves;
        `);
      tx.executeSql(`
        CREATE VIEW detailsdistributioneleves AS
        SELECT listeeleve.drens_id AS iddrena,
               listeeleve.DRENA AS drena,
               listeeleve.etablissements_id AS idetablissement,
               listeeleve.etablissement AS nometablissement,
               listeeleve.niveau_id AS idniveau,
               listeeleve.niveau AS niveau,
               listeeleve.matriculeeleve AS matriculeeleve,
               listeeleve.nomeleve AS nomeleve,
               listeeleve.prenomseleve AS prenomseleve,
               listeeleve.montantpaye AS montantpaye,
               listeeleve.penalite AS penalite,
               detailsmanuelsremiseleves.manuelsremiseleves AS Manuelsrecus,
               manuelsremiseleves.idanneescolaire AS idanneescolaire,
               detailsmanuelsretoureleves.manuelsretoureleves AS manuelsretoureleves,
               detailsmanuelsremiseleves.manuelsremiseleves - detailsmanuelsretoureleves.manuelsretoureleves AS manuelsperduseleve
        FROM listeeleve
        LEFT JOIN manuelsremiseleves ON listeeleve.etablissements_id = manuelsremiseleves.idetablissement
        LEFT JOIN detailsmanuelsretoureleves ON listeeleve.idelevesinscrit = detailsmanuelsretoureleves.idelevesinscrit
        LEFT JOIN detailsmanuelsremiseleves ON detailsmanuelsremiseleves.idelevesinscrit = listeeleve.idelevesinscrit;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsdistributionenseignants;
        `);
      tx.executeSql(`
        CREATE VIEW detailsdistributionenseignants AS
        SELECT listeDesCe.drenas_id AS iddrena,
               listeDesCe.DRENA AS drena,
               listeDesCe.etablissements_id AS idetablissement,
               listeDesCe.etablissement AS nometablissement,
               listeDesCe.matieres_id AS idmatiere,
               listeDesCe.CE AS ue,
               listeDesCe.matriculeresponsablece AS matriculeresponsablece,
               listeDesCe.nomresponsablece AS nomresponsablece,
               detailsmanuelsRemisCE.manuelsremisues AS Manuelsrecus,
               manuelsRemisCe.idanneescolaire AS idanneescolaire,
               detalismanuelsRetourCE.manuelsretourues AS manuelsretourenseignants,
               detailsmanuelsRemisCE.manuelsremisues - detalismanuelsRetourCE.manuelsretourues AS manuelsperdusenseignant
        FROM listeDesCe
        JOIN manuelsRemisCe ON listeDesCe.etablissements_id = manuelsRemisCe.idetablissement
        LEFT JOIN detalismanuelsRetourCE ON listeDesCe.idcommandeue = detalismanuelsRetourCE.idcommandeue
        LEFT JOIN detailsmanuelsRemisCE ON detailsmanuelsRemisCE.idcommandeue = listeDesCe.idcommandeue;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsmanuelsRemisCE;
        `);
      tx.executeSql(`
        CREATE VIEW detailsmanuelsRemisCE AS
        SELECT commandesues.anneescolaires_id AS idanneescolaire,
               ues.etablissements_id AS idetablissement,
               commandesues.id AS idcommandeue,
               commandesues.ues_id AS idue,
               COUNT(manuelsues.id) AS manuelsremisues
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        JOIN manuelsues ON manuelsues.commandesues_id = commandesues.id
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id, commandesues.id, commandesues.ues_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsmanuelsremiseleves;
        `);
      tx.executeSql(`
        CREATE VIEW detailsmanuelsremiseleves AS
        SELECT elevesinscrits.anneescolaires_id AS idanneescolaire,
               elevesinscrits.etablissements_id AS idetablissement,
               elevesinscrits.eleves_id AS ideleve,
               elevesinscrits.id AS idelevesinscrit,
               COUNT(manuelseleves.id) AS manuelsremiseleves
        FROM elevesinscrits
        JOIN manuelseleves ON manuelseleves.elevesinscrits_id = elevesinscrits.id
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id, elevesinscrits.eleves_id, elevesinscrits.id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsmanuelsremisenseignants;
        `);
      tx.executeSql(`
        CREATE VIEW detailsmanuelsremisenseignants AS
        SELECT enseignantsinscrits.anneescolaires_id AS idanneescolaire,
               enseignantsinscrits.etablissements_id AS idetablissement,
               enseignantsinscrits.id AS idenseignantsinscrit,
               enseignantsinscrits.enseignants_id AS idenseignants,
               COUNT(manuelsenseignants.id) AS manuelsremisenseignants
        FROM enseignantsinscrits
        JOIN manuelsenseignants ON manuelsenseignants.enseignantsinscrits_id = enseignantsinscrits.id
        GROUP BY enseignantsinscrits.anneescolaires_id, enseignantsinscrits.etablissements_id, enseignantsinscrits.id, enseignantsinscrits.enseignants_id;
        `);
      tx.executeSql(`
        DROP TABLE IF EXISTS detailsmanuelsretoureleves;
        `);
      tx.executeSql(`
        CREATE VIEW detailsmanuelsretoureleves AS
        SELECT elevesinscrits.anneescolaires_id AS idanneescolaire,
               elevesinscrits.etablissements_id AS idetablissement,
               elevesinscrits.id AS idelevesinscrit,
               elevesinscrits.eleves_id AS ideleve,
               COUNT(manuelseleves.id) AS manuelsretoureleves
        FROM elevesinscrits
        JOIN manuelseleves ON manuelseleves.elevesinscrits_id = elevesinscrits.id
        WHERE manuelseleves.etatmanuelsretoureleve_id <> 6
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id, elevesinscrits.id, elevesinscrits.eleves_id;
        `);
      tx.executeSql(`
        CREATE VIEW detailsmanuelsretoureleves AS
        SELECT elevesinscrits.anneescolaires_id AS idanneescolaire,
               elevesinscrits.etablissements_id AS idetablissement,
               elevesinscrits.id AS idelevesinscrit,
               elevesinscrits.eleves_id AS ideleve,
               COUNT(manuelseleves.id) AS manuelsretoureleves
        FROM elevesinscrits
        JOIN manuelseleves ON manuelseleves.elevesinscrits_id = elevesinscrits.id
        WHERE manuelseleves.etatmanuelsretoureleve_id <> 6
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id, elevesinscrits.id, elevesinscrits.eleves_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS detalismanuelsRetourCE;
        `);
      tx.executeSql(`
        CREATE VIEW detalismanuelsRetourCE AS
        SELECT commandesues.anneescolaires_id AS idanneescolaire,
               ues.etablissements_id AS idetablissement,
               commandesues.id AS idcommandeue,
               commandesues.ues_id AS idue,
               COUNT(manuelsues.id) AS manuelsretourues
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        JOIN manuelsues ON manuelsues.commandesues_id = commandesues.id
        WHERE manuelsues.etatmanuelsauretour_id <> 6
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id, commandesues.id, commandesues.ues_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS detalismanuelsretourenseignants;
        `);
      tx.executeSql(`
        CREATE VIEW detalismanuelsretourenseignants AS
        SELECT enseignantsinscrits.anneescolaires_id AS idanneescolaire,
               enseignantsinscrits.etablissements_id AS idetablissement,
               enseignantsinscrits.id AS idenseignantsinscrit,
               enseignantsinscrits.enseignants_id AS idenseignant,
               COUNT(manuelsenseignants.id) AS manuelsretourenseignants
        FROM enseignantsinscrits
        JOIN manuelsenseignants ON manuelsenseignants.enseignantsinscrits_id = enseignantsinscrits.id
        WHERE manuelsenseignants.etatmanuelsauretour_id <> 6
        GROUP BY enseignantsinscrits.anneescolaires_id, enseignantsinscrits.etablissements_id, enseignantsinscrits.id, enseignantsinscrits.enseignants_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS distributionmanueldrena;
        `);
      tx.executeSql(`
        CREATE VIEW distributionmanueldrena AS
        SELECT etatdistributionmanuel.idanneescolaire AS idanneescolaire,
               etatdistributionmanuel.iddrena AS iddrena,
               etatdistributionmanuel.drena AS drena,
               SUM(etatdistributionmanuel.manuelsremiseleves) AS manuelsremiseleves,
               SUM(etatdistributionmanuel.manuelsretoureleves) AS manuelsretoureleves,
               SUM(etatdistributionmanuel.manuelsperduseleve) AS manuelsperduseleve,
               SUM(etatdistributionmanuel.manuelsremisenseignants) AS manuelsremisenseignants,
               SUM(etatdistributionmanuel.manuelsretourenseignants) AS manuelsretourenseignants,
               SUM(etatdistributionmanuel.manuelsperdusenseignants) AS manuelsperdusenseignants,
               SUM(etatdistributionmanuel.totalmanuelsperdus) AS totalmanuelsperdus
        FROM etatdistributionmanuel
        GROUP BY etatdistributionmanuel.idanneescolaire, etatdistributionmanuel.iddrena, etatdistributionmanuel.drena;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS elevesnonpresouscrits;
        `);
      tx.executeSql(`
        CREATE VIEW elevesnonpresouscrits AS
        SELECT elevesinscrits.anneescolaires_id AS anneescolaires_id,
               elevesinscrits.etablissements_id AS etablissements_id,
               COUNT(elevesinscrits.id) AS eleves_inscrits
        FROM elevesinscrits
        WHERE elevesinscrits.presouscrit = 0
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS elevespresouscrits;
        `);
      tx.executeSql(`
        CREATE VIEW elevespresouscrits AS
        SELECT elevesinscrits.anneescolaires_id AS anneescolaires_id,
               elevesinscrits.etablissements_id AS etablissements_id,
               COUNT(elevesinscrits.id) AS souscrits
        FROM elevesinscrits
        WHERE elevesinscrits.presouscrit = 1
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS elevessouscrits;
        
        CREATE VIEW elevessouscrits AS
        SELECT elevesinscrits.anneescolaires_id AS anneescolaires_id,
               elevesinscrits.etablissements_id AS etablissements_id,
               COUNT(elevesinscrits.id) AS valides
        FROM elevesinscrits
        WHERE elevesinscrits.souscrit = 1
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS ETABNONVALIDE;
        `);
      tx.executeSql(`
        CREATE VIEW ETABNONVALIDE AS
        SELECT drenas.designation AS designation,
               etablissements.codeetablissement AS codeetablissement,
               etablissements.nometablissement AS etablissements
        FROM etablissements
        JOIN drenas ON drenas.id = etablissements.drenas_id
        JOIN api ON api.code = etablissements.codeetablissement
        WHERE api.exception = 'SVC005' AND etablissements.validated = 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS Etabsanssouscriptionce;
        `);
      tx.executeSql(`
        CREATE VIEW Etabsanssouscriptionce AS
        SELECT drenas.codedrena AS codedrena,
               drenas.designation AS designation,
               etablissements.codeetablissement AS codeetablissement,
               etablissements.nometablissement AS nometablissement,
               commandesues.anneescolaires_id AS anneescolaires_id,
               ues.etablissements_id AS etablissements_id,
               SUM(commandesues.presouscrit) AS Nbrecesouscrits
        FROM commandesues
        JOIN ues ON ues.id = commandesues.ues_id
        LEFT JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        LEFT JOIN etablissements ON etablissements.id = ues.etablissements_id
        LEFT JOIN drenas ON drenas.id = etablissements.drenas_id
        GROUP BY drenas.codedrena, drenas.designation, etablissements.codeetablissement, etablissements.nometablissement, commandesues.anneescolaires_id, ues.etablissements_id
        HAVING Nbrecesouscrits = 0;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS etabsanssouscriptioneleves;
        `);
      tx.executeSql(`
        CREATE VIEW etabsanssouscriptioneleves AS
        SELECT drenas.codedrena AS codedrena,
               drenas.designation AS designation,
               etablissements.codeetablissement AS codeetablissement,
               etablissements.nometablissement AS nometablissement,
               elevesinscrits.anneescolaires_id AS anneescolaires_id,
               anneescolaires.libelleanneescolaire AS libelleanneescolaire,
               elevesinscrits.etablissements_id AS etablissements_id,
               SUM(elevesinscrits.presouscrit) AS nbresouscriptions
        FROM elevesinscrits
        LEFT JOIN anneescolaires ON anneescolaires.id = elevesinscrits.anneescolaires_id
        LEFT JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id
        LEFT JOIN drenas ON drenas.id = etablissements.drenas_id
        GROUP BY drenas.codedrena, drenas.designation, etablissements.codeetablissement, etablissements.nometablissement, elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id, anneescolaires.libelleanneescolaire
        HAVING nbresouscriptions = 0;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS etatdesstocksmanuels;
        `);
      tx.executeSql(`
        CREATE VIEW etatdesstocksmanuels AS
        SELECT mesetablissemesnts.iddrena AS iddrena,
               mesetablissemesnts.drena AS drena,
               mesetablissemesnts.idetablissement AS idetablissement,
               mesetablissemesnts.nometablissement AS nometablissement,
               manuelsrecus.Manuelsrecus AS Manuelsrecus,
               manuelsenstocks.Manuelsenstock AS Manuelsenstock,
               manuelsneufs.NEUF AS NEUF,
               manuelsbons.BON AS BON,
               manuelsmoyens.MOYEN AS MOYEN,
               manuelsmediocres.MEDIOCRE AS MEDIOCRE,
               manuelstresmauvais.TRESMAUVAIS AS TRESMAUVAIS,
               manuelsperdus.PERDU AS PERDU
        FROM mesetablissemesnts
        LEFT JOIN manuelsrecus ON manuelsrecus.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsenstocks ON manuelsenstocks.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsneufs ON manuelsneufs.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsbons ON manuelsbons.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmoyens ON manuelsmoyens.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmediocres ON manuelsmediocres.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelstresmauvais ON manuelstresmauvais.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsperdus ON manuelsperdus.etablissements_id = mesetablissemesnts.idetablissement
        WHERE manuelsrecus.Manuelsrecus >= 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS etatdistributionmanuel;
        `);
      tx.executeSql(`
        CREATE VIEW etatdistributionmanuel AS
        SELECT mesetablissemesnts.iddrena AS iddrena,
               mesetablissemesnts.drena AS drena,
               mesetablissemesnts.idetablissement AS idetablissement,
               mesetablissemesnts.nometablissement AS nometablissement,
               manuelsrecus.Manuelsrecus AS Manuelsrecus,
               manuelsremiseleves.idanneescolaire AS idanneescolaire,
               manuelsremiseleves.manuelsremiseleves AS manuelsremiseleves,
               manuelsretoureleves.manuelsretoureleves AS manuelsretoureleves,
               manuelsremiseleves.manuelsremiseleves - manuelsretoureleves.manuelsretoureleves AS manuelsperduseleve,
               manuelsRemisCe.manuelsremisCE AS manuelsremisenseignants,
               manuelsRetourCe.manuelsretourCE AS manuelsretourenseignants,
               manuelsRemisCe.manuelsremisCE - manuelsRetourCe.manuelsretourCE AS manuelsperdusenseignants,
               manuelsremiseleves.manuelsremiseleves - manuelsretoureleves.manuelsretoureleves + (manuelsRemisCe.manuelsremisCE - manuelsRetourCe.manuelsretourCE) AS totalmanuelsperdus
        FROM mesetablissemesnts
        LEFT JOIN manuelsremiseleves ON mesetablissemesnts.idetablissement = manuelsremiseleves.idetablissement
        LEFT JOIN manuelsretoureleves ON mesetablissemesnts.idetablissement = manuelsretoureleves.idetablissement AND manuelsretoureleves.idanneescolaire = manuelsremiseleves.idanneescolaire
        LEFT JOIN manuelsRemisCe ON mesetablissemesnts.idetablissement = manuelsRemisCe.idetablissement AND manuelsRemisCe.idanneescolaire = manuelsretoureleves.idanneescolaire
        LEFT JOIN manuelsRetourCe ON mesetablissemesnts.idetablissement = manuelsRetourCe.idetablissement AND manuelsRetourCe.idanneescolaire = manuelsRemisCe.idanneescolaire
        LEFT JOIN manuelsrecus ON manuelsrecus.etablissements_id = mesetablissemesnts.idetablissement
        WHERE manuelsrecus.Manuelsrecus >= 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS etatdistributionmanuelancien;
        `);
      tx.executeSql(`
        CREATE VIEW etatdistributionmanuelancien AS
        SELECT mesetablissemesnts.iddrena AS iddrena,
               mesetablissemesnts.drena AS drena,
               mesetablissemesnts.idetablissement AS idetablissement,
               mesetablissemesnts.nometablissement AS nometablissement,
               manuelsrecus.Manuelsrecus AS Manuelsrecus,
               manuelsremiseleves.idanneescolaire AS idanneescolaire,
               manuelsremiseleves.manuelsremiseleves AS manuelsremiseleves,
               manuelsretoureleves.manuelsretoureleves AS manuelsretoureleves,
               manuelsremiseleves.manuelsremiseleves - manuelsretoureleves.manuelsretoureleves AS manuelsperduseleve,
               manuelsremisenseignants.manuelsremisenseignants AS manuelsremisenseignants,
               manuelsretourenseignants.manuelsretourenseignants AS manuelsretourenseignants,
               manuelsremisenseignants.manuelsremisenseignants - manuelsretourenseignants.manuelsretourenseignants AS manuelsperdusenseignants,
               manuelsremiseleves.manuelsremiseleves - manuelsretoureleves.manuelsretoureleves + (manuelsremisenseignants.manuelsremisenseignants - manuelsretourenseignants.manuelsretourenseignants) AS totalmanuelsperdus
        FROM mesetablissemesnts
        LEFT JOIN manuelsremiseleves ON mesetablissemesnts.idetablissement = manuelsremiseleves.idetablissement
        LEFT JOIN manuelsretoureleves ON mesetablissemesnts.idetablissement = manuelsretoureleves.idetablissement
        LEFT JOIN manuelsremisenseignants ON mesetablissemesnts.idetablissement = manuelsremisenseignants.idetablissement
        LEFT JOIN manuelsretourenseignants ON mesetablissemesnts.idetablissement = manuelsretourenseignants.idetablissement
        LEFT JOIN manuelsrecus ON manuelsrecus.etablissements_id = mesetablissemesnts.idetablissement
        WHERE manuelsrecus.Manuelsrecus >= 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS etatglobaldesstocksmanuels;
        `);
      tx.executeSql(`
        CREATE VIEW etatglobaldesstocksmanuels AS
        SELECT etatdesstocksmanuels.iddrena AS iddrena,
               etatdesstocksmanuels.drena AS drena,
               SUM(etatdesstocksmanuels.Manuelsrecus) AS Manuelsrecus,
               SUM(etatdesstocksmanuels.Manuelsenstock) AS Manuelsenstock,
               SUM(etatdesstocksmanuels.NEUF) AS NEUF,
               SUM(etatdesstocksmanuels.BON) AS BON,
               SUM(etatdesstocksmanuels.MOYEN) AS MOYEN,
               SUM(etatdesstocksmanuels.MEDIOCRE) AS MEDIOCRE,
               SUM(etatdesstocksmanuels.TRESMAUVAIS) AS TRESMAUVAIS,
               SUM(etatdesstocksmanuels.PERDU) AS PERDU
        FROM etatdesstocksmanuels
        GROUP BY etatdesstocksmanuels.iddrena, etatdesstocksmanuels.drena;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS listeDesCe;
        `);
      tx.executeSql(`
        CREATE VIEW listeDesCe AS
        SELECT anneescolaires.id AS id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               etablissements.drenas_id AS drenas_id,
               drenas.designation AS DRENA,
               ues.etablissements_id AS etablissements_id,
               etablissements.nometablissement AS etablissement,
               ues.matieres_id AS matieres_id,
               ues.denominationue AS CE,
               uesannees.matriculeresponsablece AS matriculeresponsablece,
               uesannees.nomresponsablece AS nomresponsablece,
               matieres.libellematiere AS matiere,
               commandesues.id AS idcommandeue,
               commandesues.datesouscription AS datesouscription
        FROM commandesues
        JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        JOIN ues ON ues.id = commandesues.ues_id
        JOIN etablissements ON etablissements.id = ues.etablissements_id
        JOIN matieres ON matieres.id = ues.matieres_id
        JOIN uesannees ON uesannees.ues_id = ues.id AND uesannees.anneescolaires_id = anneescolaires.id
        JOIN drenas ON drenas.id = etablissements.drenas_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS listeeleve;
        `);
      tx.executeSql(`
        CREATE VIEW listeeleve AS
        SELECT anneescolaires.id AS anneescolaires_id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               drenas.designation AS DRENA,
               drenas.id AS drens_id,
               etablissements.id AS etablissements_id,
               etablissements.nometablissement AS etablissement,
               classes.id AS niveau_id,
               classes.libelleclasse AS niveau,
               eleves.matriculeeleve AS matriculeeleve,
               eleves.nomeleve AS nomeleve,
               eleves.prenomseleve AS prenomseleve,
               eleves.id AS ideleve,
               elevesinscrits.montantpaye AS montantpaye,
               elevesinscrits.penalite AS penalite,
               elevesinscrits.id AS idelevesinscrit
        FROM anneescolaires
        JOIN elevesinscrits ON elevesinscrits.anneescolaires_id = anneescolaires.id
        JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        JOIN classes ON classes.id = elevesinscrits.classes_id
        JOIN eleves ON eleves.id = elevesinscrits.eleves_id;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS listemanuelsetablissement;
        `);
      tx.executeSql(`
        CREATE VIEW listemanuelsetablissement AS
        SELECT etablissements.drenas_id AS iddrena,
               drenas.designation AS DRENA,
               drenas.codedrena AS codedrena,
               stockmanuels.etablissements_id AS etablissements_id,
               etablissements.codeetablissement AS Codeetablissement,
               etablissements.nometablissement AS Etablissement,
               classes.id AS classes_id,
               classes.libelleclasse AS libelleclasse,
               stockmanuels.ordre AS ordre,
               MAX(CASE WHEN manuels.matieres_id = 1 THEN stockmanuels.referenceexemplaire END) AS ANGLAIS,
               MAX(CASE WHEN manuels.matieres_id = 2 THEN stockmanuels.referenceexemplaire END) AS EDHC,
               MAX(CASE WHEN manuels.matieres_id = 3 THEN stockmanuels.referenceexemplaire END) AS FRANCAIS,
               MAX(CASE WHEN manuels.matieres_id = 4 THEN stockmanuels.referenceexemplaire END) AS HISTGEO,
               MAX(CASE WHEN manuels.matieres_id = 5 THEN stockmanuels.referenceexemplaire END) AS MATH,
               MAX(CASE WHEN manuels.matieres_id = 6 THEN stockmanuels.referenceexemplaire END) AS PC,
               MAX(CASE WHEN manuels.matieres_id = 7 THEN stockmanuels.referenceexemplaire END) AS SVT,
               MAX(CASE WHEN manuels.matieres_id = 8 THEN stockmanuels.referenceexemplaire END) AS TICE
        FROM manuels
        JOIN classes ON classes.id = manuels.classes_id
        JOIN matieres ON matieres.id = manuels.matieres_id
        JOIN typemanuels ON typemanuels.id = manuels.typemanuels_id
        JOIN stockmanuels ON manuels.id = stockmanuels.manuels_id
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE manuels.typemanuels_id = 1 AND classes.id = 1
        GROUP BY etablissements.drenas_id, drenas.designation, drenas.codedrena, stockmanuels.etablissements_id, etablissements.codeetablissement, etablissements.nometablissement, classes.id, classes.libelleclasse, stockmanuels.ordre
        ORDER BY stockmanuels.etablissements_id ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS liste_code_etablissement;
        `);
      tx.executeSql(`
        CREATE VIEW liste_code_etablissement AS
        SELECT etablissements.codeetablissement AS codeetablissement,
               etablissements.nometablissement AS nometablissement
        FROM etablissements
        WHERE 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsbons;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsbons AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS BON
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 2
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsbonsetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsbonsetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS BON
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 2
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstocks;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstocks AS
        SELECT etablissements.drenas_id AS drenas_id,
               stockmanuels.etablissements_id AS etablissements_id,
               etablissements.nometablissement AS nometablissement,
               COUNT(stockmanuels.id) AS Manuelsenstock
        FROM stockmanuels
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        WHERE stockmanuels.etatmanuels_id <> 2
        GROUP BY etablissements.drenas_id, stockmanuels.etablissements_id, etablissements.nometablissement;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstockscentrale;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstockscentrale AS
        SELECT COUNT(stockmanuels.id) AS Manuelsenstockdrena
        FROM stockmanuels
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        WHERE stockmanuels.etatmanuels_id <> 6;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstockscentraletitre;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstockscentraletitre AS
        SELECT stockmanuels.manuels_id AS manuels_id,
               manuels.titre AS titre,
               manuels.classes_id AS classes_id,
               COUNT(stockmanuels.id) AS Manuelsenstockcentrale
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id <> 2
        GROUP BY stockmanuels.manuels_id, manuels.classes_id, manuels.titre
        ORDER BY manuels.classes_id ASC, manuels.titre ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstocksdrena;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstocksdrena AS
        SELECT etablissements.drenas_id AS drenas_id,
               COUNT(stockmanuels.id) AS Manuelsenstockdrena
        FROM stockmanuels
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        WHERE stockmanuels.etatmanuels_id <> 2
        GROUP BY etablissements.drenas_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstocksdrenatitre;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstocksdrenatitre AS
        SELECT drenas.id AS id,
               drenas.designation AS designation,
               stockmanuels.manuels_id AS manuels_id,
               manuels.classes_id AS classes_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS Manuelsenstockdrena
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE stockmanuels.etatmanuels_id <> 2
        GROUP BY drenas.id, drenas.designation, stockmanuels.manuels_id, manuels.classes_id, manuels.titre
        ORDER BY manuels.classes_id ASC, manuels.titre ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsenstocksetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsenstocksetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               stockmanuels.manuels_id AS manuels_id,
               manuels.classes_id AS classes_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS Manuelsenstock
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id <> 2
        GROUP BY stockmanuels.etablissements_id, stockmanuels.manuels_id, manuels.classes_id, manuels.titre
        ORDER BY manuels.classes_id ASC, manuels.titre ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsmediocres;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsmediocres AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS MEDIOCRE
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 4
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsmediocresetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsmediocresetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS MEDIOCRE
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 4
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsmoyens;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsmoyens AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS MOYEN
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 3
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsmoyensetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsmoyensetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS MOYEN
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 3
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsneufs;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsneufs AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS NEUF
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 1
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsneufsetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsneufsetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS manuels_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS NEUF
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 1
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsparetablissement;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsparetablissement AS
        SELECT drenas.id AS drenas_id,
               drenas.designation AS drena,
               etablissements.nometablissement AS nometablissement,
               stockmanuels.etablissements_id AS etablissements_id,
               manuels.classes_id AS classes_id,
               classes.libelleclasse AS libelleclasse,
               manuels.matieres_id AS matieres_id,
               matieres.libellematiere AS libellematiere,
               stockmanuels.referenceexemplaire AS referenceexemplaire
        FROM stockmanuels
        JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        JOIN classes ON classes.id = manuels.classes_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        JOIN matieres ON matieres.id = manuels.matieres_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsperdus;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsperdus AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS PERDU
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 6
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsperdusetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsperdusetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS manuels_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS PERDU
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 6
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsrecus;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsrecus AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS Manuelsrecus
        FROM stockmanuels
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsrecusetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsrecusetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS manuels_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS Manuelsrecus
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsRemisCe;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsRemisCe AS
        SELECT commandesues.anneescolaires_id AS idanneescolaire,
               ues.etablissements_id AS idetablissement,
               COUNT(manuelsues.id) AS manuelsremisCE
        FROM manuelsues
        LEFT JOIN commandesues ON commandesues.id = manuelsues.commandesues_id
        LEFT JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        LEFT JOIN ues ON ues.id = commandesues.ues_id
        WHERE manuelsues.exemplairemanuels_id IS NOT NULL
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsremiseleves;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsremiseleves AS
        SELECT elevesinscrits.anneescolaires_id AS idanneescolaire,
               elevesinscrits.etablissements_id AS idetablissement,
               COUNT(manuelseleves.id) AS manuelsremiseleves
        FROM elevesinscrits
        JOIN manuelseleves ON manuelseleves.elevesinscrits_id = elevesinscrits.id
        WHERE manuelseleves.exemplairemanuelseleve_id IS NOT NULL
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsremisenseignants;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsremisenseignants AS
        SELECT enseignantsinscrits.anneescolaires_id AS idanneescolaire,
               enseignantsinscrits.etablissements_id AS idetablissement,
               COUNT(manuelsenseignants.id) AS manuelsremisenseignants
        FROM enseignantsinscrits
        JOIN manuelsenseignants ON manuelsenseignants.enseignantsinscrits_id = enseignantsinscrits.id
        GROUP BY enseignantsinscrits.anneescolaires_id, enseignantsinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsRetourCe;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsRetourCe AS
        SELECT commandesues.anneescolaires_id AS idanneescolaire,
               ues.etablissements_id AS idetablissement,
               COUNT(manuelsues.id) AS manuelsretourCE
        FROM manuelsues
        LEFT JOIN commandesues ON commandesues.id = manuelsues.commandesues_id
        LEFT JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        LEFT JOIN ues ON ues.id = commandesues.ues_id
        WHERE manuelsues.etatmanuelsauretour_id IN (1, 2, 3, 4, 5)
        GROUP BY commandesues.anneescolaires_id, ues.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsretoureleves;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsretoureleves AS
        SELECT elevesinscrits.anneescolaires_id AS idanneescolaire,
               elevesinscrits.etablissements_id AS idetablissement,
               COUNT(manuelseleves.id) AS manuelsretoureleves
        FROM elevesinscrits
        JOIN manuelseleves ON manuelseleves.elevesinscrits_id = elevesinscrits.id
        WHERE manuelseleves.etatmanuelsretoureleve_id <> 6
        GROUP BY elevesinscrits.anneescolaires_id, elevesinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelsretourenseignants;
        `);
      tx.executeSql(`
        CREATE VIEW manuelsretourenseignants AS
        SELECT enseignantsinscrits.anneescolaires_id AS idanneescolaire,
               enseignantsinscrits.etablissements_id AS idetablissement,
               COUNT(manuelsenseignants.id) AS manuelsretourenseignants
        FROM enseignantsinscrits
        JOIN manuelsenseignants ON manuelsenseignants.enseignantsinscrits_id = enseignantsinscrits.id
        WHERE manuelsenseignants.etatmanuelsauretour_id <> 6
        GROUP BY enseignantsinscrits.anneescolaires_id, enseignantsinscrits.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelstresmauvais;
        `);
      tx.executeSql(`
        CREATE VIEW manuelstresmauvais AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               COUNT(stockmanuels.id) AS TRESMAUVAIS
        FROM stockmanuels
        WHERE stockmanuels.etatmanuels_id = 5
        GROUP BY stockmanuels.etablissements_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS manuelstresmauvaisetab;
        `);
      tx.executeSql(`
        CREATE VIEW manuelstresmauvaisetab AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS manuels_id,
               manuels.titre AS titre,
               COUNT(stockmanuels.id) AS TRESMAUVAIS
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        WHERE stockmanuels.etatmanuels_id = 5
        GROUP BY stockmanuels.etablissements_id, manuels.id, manuels.titre;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS mesCe;
        `);
      tx.executeSql(`
        CREATE VIEW mesCe AS
        SELECT anneescolaires.id AS id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               etablissements.drenas_id AS drenas_id,
               drenas.designation AS DRENA,
               ues.etablissements_id AS etablissements_id,
               etablissements.nometablissement AS etablissement,
               COUNT(commandesues.id) AS CE
        FROM commandesues
        JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        JOIN ues ON ues.id = commandesues.ues_id
        JOIN etablissements ON etablissements.id = ues.etablissements_id
        JOIN matieres ON matieres.id = ues.matieres_id
        JOIN uesannees ON uesannees.ues_id = ues.id AND uesannees.anneescolaires_id = anneescolaires.id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE commandesues.presouscrit = 1
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire, etablissements.drenas_id, drenas.designation, ues.etablissements_id, etablissements.nometablissement;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS mesCeInscritsCentrale;
        `);
      tx.executeSql(`
        CREATE VIEW mesCeInscritsCentrale AS
        SELECT anneescolaires.id AS id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               COUNT(commandesues.id) AS CE
        FROM commandesues
        LEFT JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        LEFT JOIN ues ON ues.id = commandesues.ues_id
        LEFT JOIN etablissements ON etablissements.id = ues.etablissements_id
        LEFT JOIN matieres ON matieres.id = ues.matieres_id
        LEFT JOIN uesannees ON uesannees.ues_id = ues.id
        LEFT JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE commandesues.presouscrit = 1
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS mesCeInscritsDrena;
        `);
      tx.executeSql(`
        CREATE VIEW mesCeInscritsDrena AS
        SELECT anneescolaires.id AS id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               etablissements.drenas_id AS drenas_id,
               drenas.designation AS DRENA,
               COUNT(commandesues.id) AS CE
        FROM commandesues
        JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id
        JOIN ues ON ues.id = commandesues.ues_id
        JOIN etablissements ON etablissements.id = ues.etablissements_id
        JOIN matieres ON matieres.id = ues.matieres_id
        JOIN uesannees ON uesannees.ues_id = ues.id AND uesannees.anneescolaires_id = anneescolaires.id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire, etablissements.drenas_id, drenas.designation;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS meselevesinscrits;
        `);
      tx.executeSql(`
        CREATE VIEW meselevesinscrits AS
        SELECT anneescolaires.id AS anneescolaires_id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               drenas.designation AS DRENA,
               drenas.id AS drenas_id,
               etablissements.id AS etablissements_id,
               etablissements.nometablissement AS etablissement,
               COUNT(elevesinscrits.id) AS eleves
        FROM anneescolaires
        JOIN elevesinscrits ON elevesinscrits.anneescolaires_id = anneescolaires.id
        JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE elevesinscrits.presouscrit = 1
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire, drenas.designation, drenas.id, etablissements.id, etablissements.nometablissement;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS meselevesinscritscentrale;
        `);
      tx.executeSql(`
        CREATE VIEW meselevesinscritscentrale AS
        SELECT anneescolaires.id AS anneescolaires_id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               COUNT(elevesinscrits.id) AS eleves
        FROM anneescolaires
        JOIN elevesinscrits ON elevesinscrits.anneescolaires_id = anneescolaires.id
        JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id
        WHERE elevesinscrits.presouscrit = 1
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS meselevesinscritsdrena;
        `);
      tx.executeSql(`
        CREATE VIEW meselevesinscritsdrena AS
        SELECT anneescolaires.id AS anneescolaires_id,
               anneescolaires.libelleanneescolaire AS anneescolaire,
               drenas.designation AS DRENA,
               drenas.id AS drenas_id,
               COUNT(elevesinscrits.id) AS eleves
        FROM anneescolaires
        JOIN elevesinscrits ON elevesinscrits.anneescolaires_id = anneescolaires.id
        JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id
        JOIN drenas ON drenas.id = etablissements.drenas_id
        WHERE elevesinscrits.presouscrit = 1
        GROUP BY anneescolaires.id, anneescolaires.libelleanneescolaire, drenas.designation, drenas.id;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS mesetablissemesnts;
        `);
      tx.executeSql(`
        CREATE VIEW mesetablissemesnts AS
        SELECT drenas.id AS iddrena,
               drenas.designation AS drena,
               etablissements.id AS idetablissement,
               etablissements.codeetablissement AS codeetablissement,
               etablissements.nometablissement AS nometablissement
        FROM etablissements
        JOIN drenas ON drenas.id = etablissements.drenas_id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS mesetabs;
        `);
      tx.executeSql(`
        CREATE VIEW mesetabs AS
        SELECT etablissements.drenas_id AS drenas_id,
               etablissements.nometablissement AS nometablissement,
               etablissements.codeetablissement AS codeetablissement,
               etablissementannees.id AS id,
               etablissementannees.anneescolaires_id AS anneescolaires_id
        FROM etablissements
        JOIN etablissementannees ON etablissementannees.etablissements_id = etablissements.id
        ORDER BY etablissementannees.etablissements_id ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS Rattachementmanuel;
        `);
      tx.executeSql(`
        CREATE VIEW Rattachementmanuel AS
        SELECT anneescolaires.libelleanneescolaire AS libelleanneescolaire,
               drenas.id AS drenas_id,
               drenas.designation AS drena,
               etablissements.nometablissement AS nometablissement,
               elevespresouscrits.anneescolaires_id AS anneescolaires_id,
               elevespresouscrits.etablissements_id AS id,
               IFNULL(elevespresouscrits.souscrits, 0) AS souscrits,
               IFNULL(elevessouscrits.valides, 0) AS valides,
               IFNULL(elevespresouscrits.souscrits, 0) * 8 AS manuels,
               IFNULL(manuelsremiseleves.manuelsremiseleves, 0) AS rattaches,
               IFNULL(elevespresouscrits.souscrits, 0) * 8 - IFNULL(manuelsremiseleves.manuelsremiseleves, 0) AS nonrattaches
               `);

      tx.executeSql(`
        FROM elevespresouscrits
        LEFT JOIN elevessouscrits ON elevessouscrits.etablissements_id = elevespresouscrits.etablissements_id AND elevessouscrits.anneescolaires_id = elevespresouscrits.anneescolaires_id
        LEFT JOIN manuelsremiseleves ON manuelsremiseleves.idanneescolaire = elevessouscrits.anneescolaires_id AND manuelsremiseleves.idetablissement = elevessouscrits.etablissements_id
        LEFT JOIN anneescolaires ON elevespresouscrits.anneescolaires_id = anneescolaires.id
        LEFT JOIN etablissements ON elevespresouscrits.etablissements_id = etablissements.id
        LEFT JOIN drenas ON drenas.id = etablissements.drenas_id
        ORDER BY anneescolaires.libelleanneescolaire ASC, drenas.designation ASC, etablissements.nometablissement ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS Rattachementmanuelce;
        `);
      tx.executeSql(`
        CREATE VIEW Rattachementmanuelce AS
        SELECT anneescolaires.libelleanneescolaire AS libelleanneescolaire,
               drenas.id AS drenas_id,
               drenas.designation AS drena,
               etablissements.nometablissement AS nometablissement,
               cepresouscrits.anneescolaires_id AS anneescolaires_id,
               cepresouscrits.etablissements_id AS id,
               IFNULL(cepresouscrits.souscrits, 0) AS souscrits,
               IFNULL(cesouscrits.valides, 0) AS valides,
               IFNULL(cemanuels.manuels, 0) AS manuels,
               IFNULL(manuelsRemisCe.manuelsremisCE, 0) AS rattaches,
               IFNULL(cemanuels.manuels, 0) - IFNULL(manuelsRemisCe.manuelsremisCE, 0) AS nonrattaches
        FROM cepresouscrits
        LEFT JOIN cesouscrits ON cesouscrits.etablissements_id = cepresouscrits.etablissements_id AND cesouscrits.anneescolaires_id = cepresouscrits.anneescolaires_id
        LEFT JOIN cemanuels ON cemanuels.etablissements_id = cepresouscrits.etablissements_id AND cemanuels.anneescolaires_id = cepresouscrits.anneescolaires_id
        LEFT JOIN manuelsRemisCe ON manuelsRemisCe.idanneescolaire = cesouscrits.anneescolaires_id AND manuelsRemisCe.idetablissement = cesouscrits.etablissements_id
        LEFT JOIN anneescolaires ON cepresouscrits.anneescolaires_id = anneescolaires.id
        LEFT JOIN etablissements ON cepresouscrits.etablissements_id = etablissements.id
        LEFT JOIN drenas ON drenas.id = etablissements.drenas_id
        ORDER BY anneescolaires.libelleanneescolaire ASC, drenas.designation ASC, etablissements.nometablissement ASC;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS StockEtabAvecCode;
        `);
      tx.executeSql(`
        CREATE VIEW StockEtabAvecCode AS
        SELECT mesetablissemesnts.iddrena AS iddrena,
               mesetablissemesnts.drena AS drena,
               mesetablissemesnts.idetablissement AS idetablissement,
               mesetablissemesnts.nometablissement AS nometablissement,
               mesetablissemesnts.codeetablissement AS codeetablissement,
               FLOOR(manuelsenstocks.Manuelsenstock / 8) AS Manuelsenstock
        FROM mesetablissemesnts
        LEFT JOIN manuelsrecus ON manuelsrecus.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsenstocks ON manuelsenstocks.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsneufs ON manuelsneufs.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsbons ON manuelsbons.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmoyens ON manuelsmoyens.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmediocres ON manuelsmediocres.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelstresmauvais ON manuelstresmauvais.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsperdus ON manuelsperdus.etablissements_id = mesetablissemesnts.idetablissement
        WHERE manuelsrecus.Manuelsrecus >= 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS stockmanuels2;
        `);
      tx.executeSql(`
        CREATE VIEW stockmanuels2 AS
        SELECT stockmanuels.etablissements_id AS etablissements_id,
               manuels.id AS manuels_id,
               COUNT(stockmanuels.id) AS nbre
        FROM stockmanuels
        JOIN manuels ON manuels.id = stockmanuels.manuels_id
        GROUP BY stockmanuels.etablissements_id, manuels.id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS stocksmanuelsdrena;
        `);
      tx.executeSql(`
        CREATE VIEW stocksmanuelsdrena AS
        SELECT etatdesstocksmanuels.iddrena AS iddrena,
               etatdesstocksmanuels.drena AS drena,
               SUM(etatdesstocksmanuels.Manuelsrecus) AS Manuelsrecus,
               SUM(etatdesstocksmanuels.Manuelsenstock) AS Manuelsenstock,
               SUM(etatdesstocksmanuels.NEUF) AS NEUF,
               SUM(etatdesstocksmanuels.BON) AS BON,
               SUM(etatdesstocksmanuels.MOYEN) AS MOYEN,
               SUM(etatdesstocksmanuels.MEDIOCRE) AS MEDIOCRE,
               SUM(etatdesstocksmanuels.TRESMAUVAIS) AS TRESMAUVAIS,
               SUM(etatdesstocksmanuels.PERDU) AS PERDU
        FROM etatdesstocksmanuels
        GROUP BY etatdesstocksmanuels.iddrena, etatdesstocksmanuels.drena;
        `);

      tx.executeSql(`
        DROP VIEW IF EXISTS stocksmanuelsetab;
        `);
      tx.executeSql(`
        CREATE VIEW stocksmanuelsetab AS
        SELECT mesetablissemesnts.iddrena AS iddrena,
               mesetablissemesnts.drena AS drena,
               mesetablissemesnts.idetablissement AS idetablissement,
               mesetablissemesnts.nometablissement AS nometablissement,
               manuelsrecus.Manuelsrecus AS Manuelsrecus,
               manuelsenstocks.Manuelsenstock AS Manuelsenstock,
               manuelsneufs.NEUF AS NEUF,
               manuelsbons.BON AS BON,
               manuelsmoyens.MOYEN AS MOYEN,
               manuelsmediocres.MEDIOCRE AS MEDIOCRE,
               manuelstresmauvais.TRESMAUVAIS AS TRESMAUVAIS,
               manuelsperdus.PERDU AS PERDU
        FROM mesetablissemesnts
        LEFT JOIN manuelsrecus ON manuelsrecus.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsenstocks ON manuelsenstocks.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsneufs ON manuelsneufs.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsbons ON manuelsbons.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmoyens ON manuelsmoyens.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsmediocres ON manuelsmediocres.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelstresmauvais ON manuelstresmauvais.etablissements_id = mesetablissemesnts.idetablissement
        LEFT JOIN manuelsperdus ON manuelsperdus.etablissements_id = mesetablissemesnts.idetablissement
        WHERE manuelsrecus.Manuelsrecus >= 1;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS v_notifications;
        `);
      tx.executeSql(`
        CREATE VIEW v_notifications AS
        SELECT responses.id AS id,
               responses.sender AS sender,
               responses.reference AS payment_reference,
               responses.number AS number,
               responses.code AS code,
               responses.data AS data,
               responses.date AS date,
               responses.time AS time,
               responses.done AS done,
               responses.updated_at AS updated_at,
               eleves.nomeleve AS nomeleve,
               eleves.prenomseleve AS prenomseleve,
               eleves.matriculeeleve AS matriculeeleve,
               elevesinscrits.etablissements_id AS etablissements_id,
               elevesinscrits.presouscrit AS presouscrit,
               elevesinscrits.id AS inscription_id,
               elevesinscrits.reference AS reference
        FROM responses
        JOIN elevesinscrits ON responses.reference = elevesinscrits.reference
        JOIN eleves ON elevesinscrits.eleves_id = eleves.id;
        `);
      tx.executeSql(`
        DROP VIEW IF EXISTS v_stockparniveau;
        `);
      tx.executeSql(`
        CREATE VIEW v_stockparniveau AS
        SELECT etablissements.id AS id,
               etablissements.id AS etablissement_id,
               etablissements.nometablissement AS etablissement_libelle,
               classes.id AS classe_id,
               classes.libelleclasse AS classe_libelle,
               drenas.id AS drena_id,
               drenas.designation AS drena_libelle,
               FLOOR(COUNT(stockmanuels.id) / 8) AS stock
        FROM stockmanuels
        LEFT JOIN manuels ON manuels.id = stockmanuels.manuels_id
        LEFT JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id
        LEFT JOIN drenas ON etablissements.drenas_id = drenas.id
        LEFT JOIN classes ON manuels.classes_id = classes.id
        GROUP BY etablissements.id, etablissements.id, etablissements.nometablissement, classes.id, classes.libelleclasse, drenas.id, drenas.designation
        ORDER BY drenas.designation ASC, etablissements.nometablissement ASC, classes.libelleclasse ASC;
        `);

      tx.executeSql(`
        PRAGMA foreign_keys = ON;
        `);
      tx.executeSql(`
        ALTER TABLE auteurs
          ADD CONSTRAINT fk_auteurs_payss FOREIGN KEY (payss_id) REFERENCES payss (id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      tx.executeSql(`
        ALTER TABLE colis
          ADD CONSTRAINT fk_coliss_commandes1 FOREIGN KEY (lots_id) REFERENCES lots (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_coliss_etablissements1 FOREIGN KEY (etablissements_id) REFERENCES etablissements (id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      tx.executeSql(`
        ALTER TABLE commandesues
          ADD CONSTRAINT fk_commandesues_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_ueinscrits_ues1 FOREIGN KEY (ues_id) REFERENCES ues (id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      tx.executeSql(`
        ALTER TABLE detailscommandeues
          ADD CONSTRAINT fk_Detailscommandeues_commandesues1 FOREIGN KEY (commandesues_id) REFERENCES commandesues (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_Detailscommandeues_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      tx.executeSql(`
        ALTER TABLE detailsreceptioncentrale
          ADD CONSTRAINT fk_Detailsreceptioncentrale_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_Detailsreceptioncentrale_receptioncentrale1 FOREIGN KEY (receptioncentrale_id) REFERENCES receptioncentrale (id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      tx.executeSql(`
        ALTER TABLE detailsreceptions
          ADD CONSTRAINT fk_detailsreceptions_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_detailsreceptions_receptions1 FOREIGN KEY (receptions_id) REFERENCES receptions (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE eleves
          ADD CONSTRAINT fk_eleves_genre1 FOREIGN KEY (genre_id) REFERENCES genre (id),
          ADD CONSTRAINT fk_eleves_nationalite1 FOREIGN KEY (nationalite_id) REFERENCES nationalite (id);
          `);

      tx.executeSql(`
        ALTER TABLE elevesinscrits
          ADD CONSTRAINT fk_elevesinscrits_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_elevesinscrits_classes1 FOREIGN KEY (classes_id) REFERENCES classes (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_elevesinscrits_eleves1 FOREIGN KEY (eleves_id) REFERENCES eleves (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_elevesinscrits_etablissements1 FOREIGN KEY (etablissements_id) REFERENCES etablissements (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE etablissementannees
          ADD CONSTRAINT fk_etablissementannees_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_etablissementannees_etablissements1 FOREIGN KEY (etablissements_id) REFERENCES etablissements (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE etablissementmanuels
          ADD CONSTRAINT fk_etablissementmanuels_etablissementannees1 FOREIGN KEY (etablissementannees_id) REFERENCES etablissementannees (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
          ADD CONSTRAINT fk_etablissementmanuels_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE etablissements
          ADD CONSTRAINT fk_etablissements_drenas1 FOREIGN KEY (drenas_id) REFERENCES drenas (id);
          `);

      tx.executeSql(`
        ALTER TABLE lots
          ADD CONSTRAINT fk_commandes_drenas1 FOREIGN KEY (drenas_id) REFERENCES drenas (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_commandes_editeurs1 FOREIGN KEY (editeurs_id) REFERENCES editeurs (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_lots_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id);
          `);

      tx.executeSql(`
        ALTER TABLE manuels
          ADD CONSTRAINT fk_manuels_auteurs1 FOREIGN KEY (auteurs_id) REFERENCES auteurs (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuels_classes1 FOREIGN KEY (classes_id) REFERENCES classes (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuels_matieres1 FOREIGN KEY (matieres_id) REFERENCES matieres (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuels_typemanuels1 FOREIGN KEY (typemanuels_id) REFERENCES typemanuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE manuelsducoliss
          ADD CONSTRAINT fk_detailscoliss_coliss1 FOREIGN KEY (coliss_id) REFERENCES colis (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_detailscoliss_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE manuelseleves
          ADD CONSTRAINT fk_manuelseleves_elevesinscrits1 FOREIGN KEY (elevesinscrits_id) REFERENCES elevesinscrits (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelseleves_stockmanuels1 FOREIGN KEY (exemplairemanuelseleve_id) REFERENCES stockmanuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE manuelslots
          ADD CONSTRAINT fk_detailscommandes_commandes1 FOREIGN KEY (lots_id) REFERENCES lots (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_detailscommandes_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE manuelsparclasses
          ADD CONSTRAINT fk_manuelsparclasses_classes1 FOREIGN KEY (classes_id) REFERENCES classes (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsparclasses_matieres1 FOREIGN KEY (matieres_id) REFERENCES matieres (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsparclasses_typemanuels1 FOREIGN KEY (typemanuels_id) REFERENCES typemanuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE manuelsues
          ADD CONSTRAINT fk_manuelsues_commandesues1 FOREIGN KEY (commandesues_id) REFERENCES commandesues (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsues_etatmanuels1 FOREIGN KEY (etatmanuelsalaremise_id) REFERENCES etatmanuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsues_etatmanuels2 FOREIGN KEY (etatmanuelsauretour_id) REFERENCES etatmanuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsues_manuels1 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_manuelsues_stockmanuels1 FOREIGN KEY (exemplairemanuels_id) REFERENCES stockmanuels (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE matieresenseignes
          ADD CONSTRAINT fk_matieresenseignes_classes1 FOREIGN KEY (classes_id) REFERENCES classes (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_matieresenseignes_enseignantsinscrits1 FOREIGN KEY (enseignantsinscrits_id) REFERENCES enseignantsinscrits (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_matieresenseignes_matieres1 FOREIGN KEY (matieres_id) REFERENCES matieres (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE parametrages
          ADD CONSTRAINT fk_parametrages_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id),
          ADD CONSTRAINT fk_parametrages_genre1 FOREIGN KEY (genre_id) REFERENCES genre (id);
          `);

      tx.executeSql(`
        ALTER TABLE receptioncentrale
          ADD CONSTRAINT fk_receptioncentrale_anneescolaires1 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_receptioncentrale_editeurs1 FOREIGN KEY (editeurs_id) REFERENCES editeurs (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE stockmanuels
          ADD CONSTRAINT fk_exemplairemanuels_destinatairemanuels1 FOREIGN KEY (destinatairemanuels_id) REFERENCES destinatairemanuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_exemplairemanuels_etatmanuels1 FOREIGN KEY (etatmanuels_id) REFERENCES etatmanuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_exemplairemanuels_manuels2 FOREIGN KEY (manuels_id) REFERENCES manuels (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_exemplairemanuels_receptions1 FOREIGN KEY (receptions_id) REFERENCES receptions (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_exemplairemanuels_statutmanules1 FOREIGN KEY (statutmanules_id) REFERENCES statutmanules (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_stockmanuels_etablissements1 FOREIGN KEY (etablissements_id) REFERENCES etablissements (id) ON DELETE CASCADE ON UPDATE CASCADE; 
          `);

      tx.executeSql(`
        ALTER TABLE ues
          ADD CONSTRAINT fk_ue_etablissements1 FOREIGN KEY (etablissements_id) REFERENCES etablissements (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_ue_matieres1 FOREIGN KEY (matieres_id) REFERENCES matieres (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        ALTER TABLE uesannees
          ADD CONSTRAINT fk_enseignantsinscrits_anneescolaires100 FOREIGN KEY (anneescolaires_id) REFERENCES anneescolaires (id) ON DELETE CASCADE ON UPDATE CASCADE,
          ADD CONSTRAINT fk_uesannees_ues1 FOREIGN KEY (ues_id) REFERENCES ues (id) ON DELETE CASCADE ON UPDATE CASCADE;
          `);

      tx.executeSql(`
        COMMIT;
        `);

      // Table Sync Log pour la synchronisation
      tx.executeSql(`
            CREATE TABLE IF NOT EXISTS sync_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              uuid TEXT DEFAULT NULL,
              table_name TEXT,
              record_id INTEGER,
              action TEXT, -- "insert", "update" ou "delete"
              data TEXT,
              source TEXT DEFAULT NULL,
              last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
      
          `);
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(sync_log);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'uuid') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE sync_log ADD COLUMN uuid TEXT DEFAULT NULL;',
          );
        }
      });
      ////////////////////////////////
      // Vérifier si la colonne existe déjà
      tx.executeSql('PRAGMA table_info(sync_log);', [], (tx, result) => {
        let columnExists = false;
        for (let i = 0; i < result.rows.length; i++) {
          if (result.rows.item(i).name === 'source') {
            columnExists = true;
            break;
          }
        }

        // Ajouter la colonne si elle n'existe pas
        if (!columnExists) {
          tx.executeSql(
            'ALTER TABLE sync_log ADD COLUMN source TEXT DEFAULT NULL;',
          );
        }
      });
      // table transfert et detailstransfert
      tx.executeSql(`
CREATE TABLE IF NOT EXISTS transferts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drenas_id INTEGER NOT NULL,
    etablissements_id INTEGER NOT NULL,
    etablissements_id1 INTEGER NOT NULL,
    typemanuels_id INTEGER NOT NULL,
    classes_id INTEGER NOT NULL,
    quantite INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    deleted_by INTEGER,
    FOREIGN KEY (classes_id) REFERENCES classes(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (drenas_id) REFERENCES drenas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (etablissements_id) REFERENCES etablissements(id) ON UPDATE CASCADE,
    FOREIGN KEY (etablissements_id1) REFERENCES etablissements(id) ON UPDATE CASCADE,
    FOREIGN KEY (typemanuels_id) REFERENCES typemanuels(id) ON DELETE CASCADE ON UPDATE CASCADE);`);
      tx.executeSql(`              
        CREATE INDEX IF NOT EXISTS fk_transferts_etablissements1_idx ON transferts (etablissements_id);
         
                     `);
      tx.executeSql(`                              
    CREATE INDEX IF NOT EXISTS fk_transferts_etablissements2_idx ON transferts (etablissements_id1);
      
             `);
      tx.executeSql(`                   
      CREATE INDEX IF NOT EXISTS fk_transferts_typemanuels1_idx ON transferts (typemanuels_id);
                 
                           `);
      tx.executeSql(` 
                     
    CREATE INDEX IF NOT EXISTS fk_transferts_classes1_idx ON transferts (classes_id);
                            
     `);
      tx.executeSql(` 
                     
      CREATE INDEX idx_transferts_drenas1 ON transferts (drenas_id);
                              
       `);

      tx.executeSql(`
                
                CREATE TABLE IF NOT EXISTS detailstransferts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transferts_id INTEGER NOT NULL,
                stockmanuels_id INTEGER NOT NULL,
                UNIQUE (transferts_id, stockmanuels_id),
                FOREIGN KEY (stockmanuels_id) REFERENCES stockmanuels(id) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (transferts_id) REFERENCES transferts(id) ON DELETE CASCADE ON UPDATE CASCADE
                );      
                      `);
      tx.executeSql(`
                                
            CREATE INDEX IF NOT EXISTS fk_transferts_has_stockmanuels_stockmanuels1_idx ON detailstransferts (stockmanuels_id);
                        
       `);

      tx.executeSql(`                           
                 CREATE INDEX IF NOT EXISTS fk_transferts_has_stockmanuels_transferts1_idx ON detailstransferts (transferts_id);
            `);
    },
    error => {
      console.log('❌ Erreur transaction CREATE TABLE:', error);
    },
  );
};

// Initialisation des données pour un établissement
const initializeDataEtab = async (idetablissement, anneeScolaireId) => {
  const initialized = await AsyncStorage.getItem('etabDataInitialized');
  if (initialized === 'true') {
    console.log('ℹ️ Données établissement déjà initialisées.');
    return;
  }

  const tables = [
    {
      name: 'etablissements',
      url: monurl + `etablissements/etab/${idetablissement}`,
    },
    {
      name: 'etablissementannees',
      url: monurl + `etablissementannees/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'eleves',
      url:
        monurl + `eleves/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'elevesinscrits',
      url:
        monurl +
        `elevesinscrits/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {name: 'ues', url: monurl + `ues/etablissement/${idetablissement}`},
    {
      name: 'uesannees',
      url:
        monurl +
        `uesannees/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'commandesues',
      url:
        monurl +
        `commandesues/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'detailscommandeues',
      url:
        monurl +
        `detailscommandes/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'receptiondrena',
      url: monurl + `receptiondrenas/etablissement/${idetablissement}`,
    },
    {
      name: 'detailsreceptiondrena',
      url: monurl + `detailsreceptiondrenas/etablissement/${idetablissement}`,
    },
    {
      name: 'receptions',
      url: monurl + `receptions/etablissement/${idetablissement}`,
    },
    {
      name: 'detailsreceptions',
      url: monurl + `detailsreceptions/etablissement/${idetablissement}`,
    },
    {
      name: 'stockmanuels',
      url: monurl + `stockmanuels/etablissement/${idetablissement}`,
    },
    {
      name: 'manuelseleves',
      url:
        monurl +
        `manuelseleves/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
    {
      name: 'manuelsues',
      url:
        monurl +
        `manuelsues/etablissement/${idetablissement}/${anneeScolaireId}`,
    },
  ];

  await Promise.all(tables.map(t => initializeTable(t.name, t.url)));

  await AsyncStorage.setItem('etabDataInitialized', 'true');
  console.log('✅ Initialisation établissement terminée.');
};

// Initialisation des données pour une DRENA
// const initializeDataDrena = async (idDrena, anneeScolaireId) => {
//   console.log("🔄 Début de l'initialisation des données DRENA...");

//   const initialized = await AsyncStorage.getItem('drenaDataInitialized');
//   if (initialized === 'true') {
//     console.log('ℹ️ Données DRENA déjà initialisées.');
//     return;
//   }

//   // Tables critiques à charger en séquence
//   const criticalTables = [
//     {name: 'drenas', url: monurl + `drenas/${idDrena}`},
//     {name: 'etablissements', url: monurl + `etablissements/drena/${idDrena}`},
//     {
//       name: 'etablissementannees',
//       url: monurl + `etablissementannees/drena/${idDrena}/${anneeScolaireId}`,
//     },
//   ];

//   for (const table of criticalTables) {
//     console.log(`⬇️ Initialisation de la table critique "${table.name}"...`);
//     try {
//       await initializeTable(table.name, table.url);
//       console.log(`✅ Table critique "${table.name}" initialisée.`);
//     } catch (error) {
//       console.error(`❌ Erreur table critique "${table.name}":`, error);
//     }
//   }

//   // Tables restantes à charger en parallèle
//   const otherTables = [
//     {name: 'classes', url: monurl + `classes/drena/${idDrena}`},
//     {name: 'ues', url: monurl + `ues/drena/${idDrena}`},
//     {
//       name: 'uesannees',
//       url: monurl + `uesannees/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {
//       name: 'eleves',
//       url: monurl + `eleves/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {
//       name: 'elevesinscrits',
//       url: monurl + `elevesinscrits/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {name: 'manuels', url: monurl + `manuels/drena/${idDrena}`},
//     {name: 'stockmanuels', url: monurl + `stockmanuels/drena/${idDrena}`},
//     {
//       name: 'manuelseleves',
//       url: monurl + `manuelseleves/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {
//       name: 'manuelsues',
//       url: monurl + `manuelsues/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {
//       name: 'commandesues',
//       url: monurl + `commandesues/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {
//       name: 'detailscommandes',
//       url: monurl + `detailscommandes/drena/${idDrena}/${anneeScolaireId}`,
//     },
//     {name: 'colis', url: monurl + `colis/drena/${idDrena}`},
//     {name: 'transferts', url: monurl + `transferts/drena/${idDrena}`},
//     {
//       name: 'detailstransferts',
//       url: monurl + `detailstransferts/drena/${idDrena}`,
//     },
//     {
//       name: 'detailsreceptions',
//       url: monurl + `detailsreceptions/drena/${idDrena}`,
//     },
//     {
//       name: 'detailsreceptioncentrale',
//       url: monurl + `detailsreceptioncentrale/drena/${idDrena}`,
//     },
//     {name: 'receptiondrenas', url: monurl + `receptiondrenas/drena/${idDrena}`},
//     {
//       name: 'detailsreceptiondrenas',
//       url: monurl + `detailsreceptiondrenas/drena/${idDrena}`,
//     },
//     {name: 'receptions', url: monurl + `receptions/drena/${idDrena}`},
//   ];

//   await Promise.all(
//     otherTables.map(async table => {
//       console.log(`⬇️ Initialisation de la table "${table.name}"...`);
//       try {
//         await initializeTable(table.name, table.url);
//         console.log(`✅ Table "${table.name}" initialisée.`);
//       } catch (error) {
//         console.error(`❌ Erreur table "${table.name}":`, error);
//       }
//     }),
//   );

//   await AsyncStorage.setItem('drenaDataInitialized', 'true');
//   console.log('🎉 Initialisation DRENA terminée.');
// };

const initializeDataDrena = async (idDrena, anneeScolaireId, force = false) => {
  console.log("🔄 Début de l'initialisation complète des données DRENA...");

  const initialized = await AsyncStorage.getItem('drenaDataInitialized');
  if (initialized === 'true' && !force) {
    console.log('ℹ️ Données DRENA déjà initialisées.');
    return;
  }

  if (force) {
    console.log(
      '♻️ Forçage de l’initialisation : toutes les données seront rechargées.',
    );
    await AsyncStorage.removeItem('drenaDataInitialized');
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // 📦 Liste complète des tables (aucune dépendance)
  const tables = [
    {name: 'drenas', url: monurl + `drenas/${idDrena}`},
    {name: 'etablissements', url: monurl + `etablissements/drena/${idDrena}`},
    {
      name: 'etablissementannees',
      url: monurl + `etablissementannees/drena/${idDrena}/${anneeScolaireId}`,
    },
    {name: 'classes', url: monurl + `classes/drena/${idDrena}`},
    {name: 'ues', url: monurl + `ues/drena/${idDrena}`},
    {
      name: 'uesannees',
      url: monurl + `uesannees/drena/${idDrena}/${anneeScolaireId}`,
    },
    {
      name: 'eleves',
      url: monurl + `eleves/drena/${idDrena}/${anneeScolaireId}`,
    },
    {
      name: 'elevesinscrits',
      url: monurl + `elevesinscrits/drena/${idDrena}/${anneeScolaireId}`,
    },
    {name: 'manuels', url: monurl + `manuels/drena/${idDrena}`},
    {name: 'stockmanuels', url: monurl + `stockmanuels/drena/${idDrena}`},
    {
      name: 'manuelseleves',
      url: monurl + `manuelseleves/drena/${idDrena}/${anneeScolaireId}`,
    },
    {
      name: 'manuelsues',
      url: monurl + `manuelsues/drena/${idDrena}/${anneeScolaireId}`,
    },
    {
      name: 'commandesues',
      url: monurl + `commandesues/drena/${idDrena}/${anneeScolaireId}`,
    },
    {
      name: 'detailscommandesues',
      url: monurl + `detailscommandes/drena/${idDrena}/${anneeScolaireId}`,
    },
    {name: 'colis', url: monurl + `colis/drena/${idDrena}`},
    {name: 'transferts', url: monurl + `transferts/drena/${idDrena}`},
    {
      name: 'detailstransferts',
      url: monurl + `detailstransferts/drena/${idDrena}`,
    },
    {
      name: 'detailsreceptions',
      url: monurl + `detailsreceptions/drena/${idDrena}`,
    },
    {name: 'receptiondrena', url: monurl + `receptiondrenas/drena/${idDrena}`},
    {
      name: 'detailsreceptiondrena',
      url: monurl + `detailsreceptiondrenas/drena/${idDrena}`,
    },
    {name: 'receptions', url: monurl + `receptions/drena/${idDrena}`},
  ];

  // 🔁 Téléchargement avec retry automatique
  const initializeWithRetry = async table => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `⬇️ [${attempt}/${MAX_RETRIES}] Téléchargement ${table.name}...`,
        );
        const count = await initializeTable(table.name, table.url);
        console.log(`✅ ${table.name} OK (${count || 'N/A'} lignes)`);
        return {table: table.name, success: true};
      } catch (e) {
        console.warn(
          `❌ Erreur ${table.name} (tentative ${attempt}): ${e.message}`,
        );
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
      }
    }
    console.error(`⛔️ Échec définitif: ${table.name}`);
    return {table: table.name, success: false};
  };

  // ⚡ Lancer toutes les requêtes en même temps
  console.log(`🚀 Téléchargement simultané de ${tables.length} tables...`);
  const results = await Promise.all(tables.map(t => initializeWithRetry(t)));

  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).map(r => r.table);

  console.log(
    `🎉 Initialisation terminée : ${success}/${tables.length} tables réussies.`,
  );
  if (failed.length) console.warn('⚠️ Tables échouées :', failed.join(', '));

  await AsyncStorage.setItem('drenaDataInitialized', 'true');
};

const initializeData = async () => {
  try {
    const tables = [
      {name: 'auteurs', url: monurl + 'auteurs'},
      {name: 'admin_users', url: monurl + 'users'},
      {name: 'matieres', url: monurl + 'matieres'},
      {name: 'colis', url: monurl + 'colis'},
      {name: 'destinatairemanuels', url: monurl + 'destinatairemanuels'},
      {name: 'payss', url: monurl + 'pays'},
      {name: 'statutmanules', url: monurl + 'statutmanuels'},
      {name: 'typemanuels', url: monurl + 'typesmanuels'},
      {name: 'etatmanuels', url: monurl + 'etatmanuels'},
      {name: 'groupe', url: monurl + 'groupes'},
      {name: 'lots', url: monurl + 'lots'},
      {name: 'anneescolaires', url: monurl + 'anneescolaires'},
      {name: 'genre', url: monurl + 'genres'},
      {name: 'parametrages', url: monurl + 'parametrages'},
      {name: 'classes', url: monurl + 'classes'},
      {name: 'drenas', url: monurl + 'drenas'},
      {name: 'nationalite', url: monurl + 'nationalites'},
      {name: 'manuels', url: monurl + 'manuels'},
      // {name: 'api', url: monurl + 'apis'},
    ];

    await Promise.all(
      tables.map(table => initializeTable(table.name, table.url)),
    );
    console.log('Initialisation des données terminée.');
  } catch (error) {
    console.error("Erreur lors de l'initialisation des données:", error);
    throw error;
  }
};
/*
async function initializeDatabase() {
  //const [isLoading, setIsLoading] = useState(false);
  const initialized = await AsyncStorage.getItem('databaseInitialized');
  if (initialized === 'true') {
    return; // Déjà initialisé
  }

  //const db = SQLite.openDatabase({ name: 'mydatabase.db', location: 'default' });

  try {
    //await createTables();
    createTables();
    await initializeData();
    await AsyncStorage.setItem('databaseInitialized', 'true');
    console.log('Initialisation de la base de données terminée.');
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de la base de données:",
      error,
    );
  }
}
*/
/* ça fonctionne bien sauf drenas
async function initializeDatabase(userType, userId, anneeId) {
  console.log('🚀 Initialisation de la base locale...');

  try {
    // 1️⃣ Toujours créer les tables si elles n'existent pas
    createTables();

    // 2️⃣ Reset des données locales avant d'injecter de nouvelles données
    await resetDatabase();

    // 3️⃣ Charger les données globales
    await initializeData(); // anneescolaires, parametrages, etc.

    // 4️⃣ Charger les données spécifiques selon le type d'utilisateur
    if (userType === 'etab') {
      await initializeDataEtab(userId, anneeId);
    } else if (userType === 'drena') {
      await initializeDataDrena(userId, anneeId);
    }

    console.log('🎉 Initialisation terminée !');
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base:", error);
  }
}
*/

async function initializeDatabase(userType, userId, anneeId) {
  console.log('🚀 Initialisation de la base locale...');

  try {
    // 1️⃣ Toujours créer les tables si elles n'existent pas
    createTables();

    // 2️⃣ Reset des données locales uniquement pour les établissements
    if (userType === 'etab') {
      await resetDatabase();
    }
    if (userType === 'drena') {
      await resetDatabaseDrena();
    }

    // 3️⃣ Charger les données globales communes à tous
    await initializeData(); // anneescolaires, parametrages, etc.

    // 4️⃣ Charger les données spécifiques selon le type d'utilisateur
    if (userType === 'etab') {
      await initializeDataEtab(userId, anneeId);
    } else if (userType === 'drena') {
      await initializeDataDrena(userId, anneeId);
    }

    console.log('🎉 Initialisation terminée !');
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base:", error);
  }
}

const insertionDesUsers = async () => {
  try {
    console.log('--- Début extraction des données ---');
    const reponse = await axios.get(`${monurl}users`);
    console.log(
      'Structure de la réponse API:',
      JSON.stringify(reponse.data, null, 2),
    );

    const donneeexportee = reponse.data.data || reponse.data;

    if (Array.isArray(donneeexportee) && donneeexportee.length > 0) {
      console.log(`Nombre d'éléments récupérés: ${donneeexportee.length}`);

      // ✅ Attendre l'insertion pour capturer les erreurs et être sûr que ça s'exécute avant la suite
      await insertData(donneeexportee);

      console.log('✅ Insertion terminée avec succès !');
    } else {
      console.log('⚠️ Aucune donnée exploitable dans la réponse API');
    }
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'insertion des données issue de l'API:",
      error,
    );
    throw error;
  }
};

////////////////////////////
const fetchAndInsertData = async () => {
  try {
    // Récupérer les données depuis l'API
    // const response = await axios.get('https://bonamas.mena-ci.com/api/users');
    const response = await axios.get(`${monurl}users`);

    const data = response.data; // Supposons que les données se trouvent sous 'data'

    // Vérification si des données sont récupérées
    if (data && data.length > 0) {
      db.transaction(
        tx => {
          data.forEach(item => {
            const {
              id,
              group_id,
              username,
              password,
              drenas_id,
              etablissements_id,
              ues_id,
              name,
              avatar,
              api_code,
              api_pass,
              remember_token,
              created_at,
              updated_at,
            } = item;

            // Préparer l'insertion dans SQLite
            const insertQuery = `
              INSERT OR REPLACE INTO admin_users (
                id, group_id, username, password, drenas_id, etablissements_id, ues_id, name, avatar, api_code, api_pass, remember_token, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            tx.executeSql(
              insertQuery,
              [
                id,
                group_id,
                username,
                password,
                drenas_id,
                etablissements_id,
                ues_id,
                name,
                avatar,
                api_code,
                api_pass,
                remember_token,
                created_at,
                updated_at,
              ],
              err => {
                if (err) {
                  console.error("Erreur lors de l'insertion dans SQLite:", err);
                } else {
                  console.log(
                    `Données insérées pour l'utilisateur: ${username}`,
                  );
                }
              },
            );
          });
        },
        error => {
          console.error('Erreur lors de la transaction SQLite:', error);
        },
      );
    } else {
      console.log("Aucune donnée récupérée depuis l'API");
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des données depuis l'API:",
      error,
    );
  }
};

// Exécution de la fonction

////////////////////////
// Fonction pour insérer les données dans SQLite
const insertData = data => {
  db.transaction(tx => {
    data.forEach(user => {
      const insertQuery = `
        INSERT OR REPLACE INTO admin_users (
          id, group_id, username, password, drenas_id, etablissements_id, ues_id, name, avatar, api_code, api_pass, remember_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      tx.executeSql(
        insertQuery,
        [
          user.id,
          user.group_id,
          user.username,
          user.password,
          user.drenas_id,
          user.etablissements_id,
          user.ues_id,
          user.name,
          user.avatar,
          user.api_code,
          user.api_pass,
          user.remember_token,
          user.created_at,
          user.updated_at,
        ],
        (tx, results) => {
          console.log('Data inserted successfully for admin user');
        },
        error => {
          console.log('Error inserting data: ', error);
        },
      );
    });
  });
};

const insertionDesAnneescolaires = async () => {
  try {
    console.log('--- Début extraction des années scolaires ---');
    const reponse = await axios.get(`${monurl}anneescolaires`);

    const donneeexportee = reponse.data.data || reponse.data;

    if (Array.isArray(donneeexportee) && donneeexportee.length > 0) {
      console.log(
        `Nombre d'années scolaires récupérées: ${donneeexportee.length}`,
      );

      db.transaction(tx => {
        donneeexportee.forEach(item => {
          const insertQuery = `
            INSERT OR REPLACE INTO anneescolaires (
              id, libelleanneescolaire, libelleabrege, datedebut, datefin, 
              created_at, updated_at, deleted_at, created_by, updated_by, deleted_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          tx.executeSql(
            insertQuery,
            [
              item.id,
              item.libelleanneescolaire,
              item.libelleabrege,
              item.datedebut,
              item.datefin,
              item.created_at,
              item.updated_at,
              item.deleted_at,
              item.created_by,
              item.updated_by,
              item.deleted_by,
            ],
            () => {
              console.log(
                `✅ Année scolaire insérée: ${item.libelleanneescolaire}`,
              );
            },
            (_, error) => {
              console.error(
                `❌ Erreur insertion année scolaire ${item.id}`,
                error,
              );
              return false;
            },
          );
        });
      });
    } else {
      console.log('⚠️ Aucune année scolaire trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur API anneescolaires:', error);
  }
};

const insertionDesParametrages = async () => {
  try {
    console.log('--- Début extraction des parametrages ---');
    const reponse = await axios.get(`${monurl}parametrages`);

    const donneeexportee = reponse.data.data || reponse.data;

    if (Array.isArray(donneeexportee) && donneeexportee.length > 0) {
      console.log(`Nombre de parametrages récupérés: ${donneeexportee.length}`);

      db.transaction(tx => {
        donneeexportee.forEach(item => {
          const insertQuery = `
            INSERT OR REPLACE INTO parametrages (
              id, anneescolaires_id, denominationrepublique, denominationministere, logoministere, 
              devise, nomministre, civiliteministre, genre_id, dateretour, coutmanuel, 
              numremise, numretour, montantsouscription, indexDemarrageLot, indexDemarrageLotStock, 
              created_at, updated_at, deleted_at, created_by, updated_by, deleted_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          tx.executeSql(
            insertQuery,
            [
              item.id,
              item.anneescolaires_id,
              item.denominationrepublique,
              item.denominationministere,
              item.logoministere,
              item.devise,
              item.nomministre,
              item.civiliteministre,
              item.genre_id,
              item.dateretour,
              item.coutmanuel,
              item.numremise,
              item.numretour,
              item.montantsouscription,
              item.indexDemarrageLot,
              item.indexDemarrageLotStock,
              item.created_at,
              item.updated_at,
              item.deleted_at,
              item.created_by,
              item.updated_by,
              item.deleted_by,
            ],
            () => {
              console.log(
                `✅ Paramétrage inséré pour année ${item.anneescolaires_id}`,
              );
            },
            (_, error) => {
              console.error(
                `❌ Erreur insertion parametrage ${item.id}`,
                error,
              );
              return false;
            },
          );
        });
      });
    } else {
      console.log('⚠️ Aucun paramétrage trouvé');
    }
  } catch (error) {
    console.error('❌ Erreur API parametrages:', error);
  }
};

//////////////////////////

const getAdminUsers = () => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM manuelsues LIMIT 10',
      [],

      (_, results) => {
        const rows = results.rows;
        let users = [];
        for (let i = 0; i < rows.length; i++) {
          users.push(rows.item(i));
        }
        console.log('Admin Users:', users);
      },
      error => console.error('Error fetching admin_users:', error),
    );
  });
};
const getNationalites = () => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM nationalite',
      [],
      (_, results) => {
        const rows = results.rows;
        let nationalites = [];
        for (let i = 0; i < rows.length; i++) {
          nationalites.push(rows.item(i));
        }
        console.log('Nationalités:', nationalites);
      },
      error => console.error('Error fetching nationalites:', error),
    );
  });
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
/* Version simple
const initializeTable = async (tableName, apiUrl) => {
  try {
    let allData = [];
    let currentPage = 1;
    let totalPages = Infinity;

    while (currentPage <= totalPages) {
      const currentUrl = `${apiUrl}?page=${currentPage}`;
      console.log('url courant:', currentUrl);

      let response;
      try {
        response = await axios.get(currentUrl);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(
            `🚫 Ressource non trouvée pour ${tableName}. On ignore.`,
          );
          return Promise.resolve(); // Ne rien faire et passer à la table suivante
        } else {
          throw error;
        }
      }

      // ⚠️ Vérification spécifique si le backend retourne un message métier
      if (
        response.data?.message &&
        response.data.message.includes('Aucun Manuelsue trouvé')
      ) {
        console.warn(`📭 ${tableName} : ${response.data.message}`);
        return Promise.resolve(); // On arrête ici sans erreur
      }

      const data = response.data.data;
      if (!data || !Array.isArray(data) || data.length === 0) break;

      allData = allData.concat(data);

      if (response.data.meta?.last_page) {
        totalPages = response.data.meta.last_page;
      } else if (data.length < response.data.per_page) {
        break;
      }

      currentPage++;
      await sleep(1000);
    }

    console.log(`DONNÉES RÉCUPÉRÉES ${tableName} : `, allData);

    // if (allData.length === 0) return Promise.resolve();
    if (allData.length === 0) continue;
    
    // === Création de la table et insertion ===
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY,
          data TEXT
        );`,
        [],
        () => console.log(`✅ Table ${tableName} créée ou déjà existante.`),
        (_, error) => {
          console.error(`❌ Erreur CREATE TABLE ${tableName}:`, error);
          return true;
        },
      );

      allData.forEach(item => {
        tx.executeSql(
          `INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`,
          [item.id, JSON.stringify(item)],
          () => {},
          (_, error) => {
            console.error(`❌ Erreur INSERT dans ${tableName}:`, error);
            return true;
          },
        );
      });
    });
  } catch (error) {
    console.error(
      `❌ Erreur pendant l'initialisation de ${tableName} :`,
      error.message,
    );
  }
};
*/

// Version chatgpt
/*
const initializeTable = async (tableName, apiUrl) => {
  try {
    let allData = [];
    let currentPage = 1;
    let totalPages = Infinity;

    while (currentPage <= totalPages) {
      const currentUrl = `${apiUrl}?page=${currentPage}`;
      console.log('url courant:', currentUrl);

      let response;
      try {
        response = await axios.get(currentUrl);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(
            `🚫 Ressource non trouvée pour ${tableName}. On ignore.`,
          );
          continue; // On continue à la page suivante sans stopper l'exécution
        } else {
          throw error; // On relance l'erreur si ce n'est pas une erreur 404
        }
      }

      if (
        response.data?.message &&
        response.data.message.includes('Aucun Manuelsue trouvé')
      ) {
        console.warn(`📭 ${tableName} : ${response.data.message}`);
        continue; // On ignore cette table sans erreur
      }

      const data = response.data.data;
      if (!data || !Array.isArray(data) || data.length === 0) break;

      allData = allData.concat(data);

      if (response.data.meta?.last_page) {
        totalPages = response.data.meta.last_page;
      } else if (data.length < response.data.per_page) {
        break;
      }

      currentPage++;
      await sleep(1000);
    }

    console.log(`DONNÉES RÉCUPÉRÉES ${tableName} : `, allData);

    if (allData.length === 0) return;

    // === Création de la table ===
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY,  // Si tu utilises un autre identifiant, adapte cette ligne
          data TEXT
        );`,
        [],
        () => console.log(`✅ Table ${tableName} créée ou déjà existante.`),
        (_, error) => {
          console.error(`❌ Erreur CREATE TABLE ${tableName}:`, error);
          return true; // Renvoyer true pour ignorer l'erreur et continuer
        },
      );

      // === Insertion des données ===
      allData.forEach(item => {
        tx.executeSql(
          `INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`,
          [item.id, JSON.stringify(item)], // Assure-toi que l'objet item est bien structuré
          () => {}, // Tu peux ajouter un log ici si tu veux
          (_, error) => {
            console.error(`❌ Erreur INSERT dans ${tableName}:`, error);
            return true; // Renvoyer true pour ignorer l'erreur et continuer
          },
        );
      });
    });
  } catch (error) {
    console.error(
      `❌ Erreur pendant l'initialisation de ${tableName} :`,
      error.message,
    );
  }
};
*/

// Version chatgpt 2
/*
const initializeTable = async (tableName, apiUrl) => {
  try {
    let allData = [];
    let currentPage = 1;
    let totalPages = Infinity;

    while (currentPage <= totalPages) {
      const currentUrl = `${apiUrl}?page=${currentPage}`;
      console.log('📡 URL courante:', currentUrl);

      let response;
      try {
        response = await axios.get(currentUrl);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(`🚫 ${tableName}: Ressource non trouvée (404).`);
          return;
        } else {
          throw error;
        }
      }

      if (
        response.data?.message &&
        response.data.message.includes('Aucun Manuelsue trouvé')
      ) {
        console.warn(`📭 ${tableName} : ${response.data.message}`);
        return;
      }

      const data = response.data.data;
      if (!data || !Array.isArray(data) || data.length === 0) break;

      allData = allData.concat(data);

      if (response.data.meta?.last_page) {
        totalPages = response.data.meta.last_page;
      } else if (data.length < response.data.per_page) {
        break;
      }

      currentPage++;
      await sleep(1000);
    }

    console.log(
      `📦 Données récupérées pour ${tableName} : ${allData.length} éléments`,
    );
    console.log(`🔁 Initialisation de la table ${tableName}`);

    if (allData.length === 0) {
      console.warn(`⚠️ ${tableName} : aucune donnée à insérer.`);
      return;
    }

    const fetchTableData = tableName => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM ${tableName};`,
          [],
          (_, result) => {
            console.log(
              `📚 Données dans la table ${tableName}:`,
              result.rows._array,
            );
          },
          (_, error) => {
            console.error(
              `❌ Erreur lors de la récupération des données de ${tableName}:`,
              error,
            );
            return true;
          },
        );
      });
    };

    // === Création de la table et insertion ===
    db.transaction(
      tx => {
        // Création de la table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY,
          data TEXT
        );`,
          [],
          () => console.log(`✅ Table ${tableName} créée ou déjà existante.`),
          (_, error) => {
            console.error(`❌ Erreur CREATE TABLE ${tableName}:`, error);
            return true;
          },
        );

        // Insertion avec logs détaillés
        allData.forEach(item => {
          tx.executeSql(
            `INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`,
            [item.id, JSON.stringify(item)],
            (_, result) => {
              console.log(
                `✅ Insertion réussie dans ${tableName} pour l'ID ${item.id}`,
              );
              fetchTableData(tableName); // Vérifie les données après chaque insertion
            },
            (_, error) => {
              console.error(
                `❌ Erreur d'insertion dans ${tableName} pour l'ID ${item.id} :`,
                error,
              );
              return true;
            },
          );
        });
      },
      error => {
        console.error(`❌ Échec de la transaction pour ${tableName} :`, error);
      },
      () => {
        console.log(
          `🎉 Insertion terminée pour ${tableName} (${allData.length} lignes)`,
        );
      },
    );
  } catch (error) {
    console.error(
      `💥 Erreur dans initializeTable pour ${tableName} :`,
      error.message,
    );
  }
};
*/
/*
const initializeTable = async (tableName, apiUrl) => {
  try {
    let allData = [];
    let currentPage = 1;
    let totalPages = Infinity;

    while (currentPage <= totalPages) {
      const currentUrl = `${apiUrl}?page=${currentPage}`;
      console.log('📡 URL courante:', currentUrl);

      let response;
      try {
        response = await axios.get(currentUrl);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(`🚫 ${tableName}: Ressource non trouvée (404).`);
          return;
        } else {
          throw error;
        }
      }

      const data = response.data.data;
      if (!data || !Array.isArray(data) || data.length === 0) break;

      allData = allData.concat(data);

      if (response.data.meta?.last_page) {
        totalPages = response.data.meta.last_page;
      } else if (data.length < response.data.per_page) {
        break;
      }

      currentPage++;
      await sleep(1000);
    }

    console.log(`📦 ${tableName} → ${allData.length} lignes récupérées`);

    if (allData.length === 0) return;

    // === Insertion dans ta vraie table ===
    db.transaction(
      tx => {
        allData.forEach(item => {
          // 🔹 Construire dynamiquement l’insertion selon les clés
          const keys = Object.keys(item);
          const placeholders = keys.map(() => '?').join(',');
          const query = `INSERT OR REPLACE INTO ${tableName} (${keys.join(
            ',',
          )}) VALUES (${placeholders})`;

          tx.executeSql(
            query,
            keys.map(k => item[k]),
            () =>
              console.log(`✅ Insert ${tableName} OK (id=${item.id || 'N/A'})`),
            (_, error) => {
              console.error(
                `❌ Erreur d’insertion ${tableName} (id=${item.id || 'N/A'}):`,
                error,
              );
              return true;
            },
          );
        });
      },
      error => {
        console.error(`❌ Transaction échouée pour ${tableName}:`, error);
      },
      () => {
        console.log(`🎉 ${tableName} → ${allData.length} lignes insérées`);
      },
    );
  } catch (error) {
    console.error(`💥 initializeTable ${tableName}:`, error.message);
  }
};
*/

// Fonction générique pour initialiser une table avec données API
const initializeTable = async (tableName, url) => {
  try {
    const response = await axios.get(url);

    // Normaliser les données reçues
    let records = response?.data?.data ?? response?.data ?? [];
    if (!Array.isArray(records)) records = [records];
    if (!records.length) {
      console.warn(`⚠️ Aucune donnée trouvée pour la table "${tableName}".`);
      return;
    }

    // Récupérer les colonnes de la table SQLite
    const columnsRes = await executeSql(`PRAGMA table_info(${tableName})`);
    const tableColumns =
      columnsRes?.rows
        ?.raw()
        ?.map(col => col.name)
        .filter(Boolean) ?? [];
    if (!tableColumns.length) {
      console.error(
        `❌ Impossible de récupérer les colonnes pour ${tableName}.`,
      );
      return;
    }

    let insertedCount = 0;

    for (const record of records) {
      if (typeof record !== 'object' || record === null) continue;

      // Ne garder que les colonnes existantes
      const filteredKeys = Object.keys(record).filter(key =>
        tableColumns.includes(key),
      );
      if (!filteredKeys.length) continue;

      // Convertir les champs numériques connus en INTEGER
      const values = filteredKeys.map(key => {
        if (
          ['id', 'ues_id', 'etablissements_id', 'anneescolaires_id'].includes(
            key,
          )
        ) {
          return Number(record[key]);
        }
        return record[key];
      });

      const placeholders = filteredKeys.map(() => '?').join(',');

      // On utilise INSERT OR IGNORE pour éviter de remplacer des lignes existantes
      const sql = `
        INSERT OR IGNORE INTO ${tableName} (${filteredKeys.join(',')})
        VALUES (${placeholders})
      `;

      try {
        await executeSql(sql.trim(), values);
        insertedCount++;
      } catch (insertErr) {
        console.error(
          `⚠️ Erreur lors de l'insertion dans ${tableName}:`,
          insertErr.message,
        );
      }
    }

    console.log(
      `✅ Table "${tableName}" initialisée (${insertedCount} lignes insérées).`,
    );
  } catch (error) {
    console.error(
      `❌ Erreur lors de l'initialisation de ${tableName}:`,
      error.message,
    );
  }
};

export {
  db,
  createTables,
  initializeData,
  initializeDataEtab,
  initializeDataDrena,
  getAdminUsers,
  getNationalites,
  fetchAndInsertData,
  insertionDesUsers,
  initializeDatabase,
  insertionDesAnneescolaires,
  insertionDesParametrages,
};
