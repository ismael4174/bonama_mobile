import {db} from './database'; // Import de la connexion SQLite

//import SQLite from 'react-native-sqlite-storage'; // Import SQLite

// ... (Your other imports and database setup)

// Function to add a record to sync_log
export const addSyncLog = (tableName, recordId, action, data) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
        [tableName, recordId, action, data],
        (_, results) => resolve(results.insertId), // Resolve with the inserted ID
        (_, error) => reject(error),
      );
    });
  });
};
/*// ✅ Ajouter un log pour une insertion (INSERT)
export const logInsert = (tableName, recordId, data) => {
  db.transaction(tx => {
    tx.executeSql(
      'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
      [tableName, recordId, 'insert', JSON.stringify(data)],
      () => console.log(`INSERT log enregistré : ${tableName}, ID ${recordId}`),
      (_, error) =>
        console.error("Erreur lors de l'insertion dans sync_log :", error),
    );
  });
};

// ✅ Ajouter un log pour une mise à jour (UPDATE)
export const logUpdate = (tableName, recordId, data) => {
  db.transaction(tx => {
    tx.executeSql(
      'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
      [tableName, recordId, 'update', JSON.stringify(data)],
      () => console.log(`UPDATE log enregistré : ${tableName}, ID ${recordId}`),
      (_, error) =>
        console.error('Erreur lors de la mise à jour dans sync_log :', error),
    );
  });
};

// ✅ Ajouter un log pour une suppression (DELETE)
export const logDelete = (tableName, recordId) => {
  db.transaction(tx => {
    tx.executeSql(
      'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, NULL)',
      [tableName, recordId, 'delete'],
      () => console.log(`DELETE log enregistré : ${tableName}, ID ${recordId}`),
      (_, error) =>
        console.error('Erreur lors de la suppression dans sync_log :', error),
    );
  });
};
*/
