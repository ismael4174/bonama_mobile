import {useEffect} from 'react';
import {openDatabase} from 'react-native-sqlite-storage';

const dbName = 'bd_bonamas_local.db';

const InspecteBaseLocale = () => {
  useEffect(() => {
    const db = openDatabase(
      {name: dbName, location: 'default'},
      () => console.log('✅ DB ouverte avec succès'),
      error => console.log('❌ Erreur ouverture DB:', error),
    );

    db.transaction(tx => {
      console.log('🔍 Récupération de la liste des tables...');
      tx.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        (tx, results) => {
          console.log(`📋 ${results.rows.length} tables trouvées :`);
          for (let i = 0; i < results.rows.length; i++) {
            const tableName = results.rows.item(i).name;
            console.log(`\n=== 🗂 Table : ${tableName} ===`);

            // Pour chaque table, on fait un SELECT * pour voir son contenu
            tx.executeSql(
              `SELECT * FROM ${tableName}`,
              [],
              (tx, tableResults) => {
                if (tableResults.rows.length === 0) {
                  console.log(`⚠️ Table ${tableName} est vide.`);
                } else {
                  console.log(`📦 ${tableResults.rows.length} lignes :`);
                  for (let j = 0; j < tableResults.rows.length; j++) {
                    console.log(tableResults.rows.item(j));
                  }
                }
              },
              error =>
                console.log(`❌ Erreur lecture table ${tableName} :`, error),
            );
          }
        },
        error => {
          console.log('❌ Erreur lors de la récupération des tables :', error);
        },
      );
    });
  }, []);

  return null; // Ne rend rien à l'écran, sert uniquement à logguer les données
};

export default InspecteBaseLocale;
