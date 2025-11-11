//import db from './database';
import {db} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../api/urldeconnexion.js';
import axios from 'axios';
import {useRefresh} from './refresh.js';
import uuid from 'react-native-uuid';
//const API_URL = 'http://localhost:5000/api';

// Fonction de synchronisation conditionnelle
export const checkAndSync = async isConnected => {
  if (isConnected) {
    console.log(
      'Connexion détectée, synchronisation en cours(je suis chackAndSync)...',
    );
    await syncLocalToServer();
    await syncServerToLocal();
  } else {
    console.log('Pas de connexion, en attente...');
  }
};

export const getInstallDate = async () => {
  let installDate = await AsyncStorage.getItem('installDate');
  if (!installDate) {
    installDate = new Date().toISOString(); // ex: "2025-09-22T14:05:06.789Z"
    await AsyncStorage.setItem('installDate', installDate);
  }
  return installDate;
};

// Synchroniser les données locales vers le serveur
export const syncLocalToServer = async () => {
  console.log('🚀 syncLocalToServer démarrage...');

  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          'SELECT id, uuid, source, action, record_id, table_name, data FROM sync_log',
          [],
          async (_, results) => {
            const logs = [];
            for (let i = 0; i < results.rows.length; i++) {
              logs.push(results.rows.item(i));
            }
            console.log('✅ voici les logs.', logs);
            if (logs.length === 0) {
              console.log('✅ Aucun log à synchroniser.');
              resolve(true);
              return;
            }

            console.log(`📤 Tentative de synchro de ${logs.length} logs...`);
            console.log(logs);

            // Préparer les logs avec UUID toujours présents
            const logsWithUUID = await Promise.all(
              logs.map(async log => {
                if (!log.uuid) {
                  const newUUID = uuid.v4();

                  // Mettre à jour dans SQLite
                  await new Promise((resolveUpdate, rejectUpdate) => {
                    db.transaction(txUpdate => {
                      txUpdate.executeSql(
                        'UPDATE sync_log SET uuid = ? WHERE id = ?',
                        [newUUID, log.id],
                        () => {
                          console.log(
                            `🆕 UUID généré pour log ${log.id}: ${newUUID}`,
                          );
                          resolveUpdate();
                        },
                        (_, err) => {
                          console.error(
                            `❌ Erreur mise à jour UUID log ${log.id}:`,
                            err,
                          );
                          rejectUpdate(err);
                          return true;
                        },
                      );
                    });
                  });

                  return {...log, uuid: newUUID};
                }

                return log;
              }),
            );

            // Envoi des logs au serveur
            const syncPromises = logsWithUUID.map(log =>
              axios
                .post(`${API_URL}syncslogs`, JSON.stringify([log]), {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .then(response => {
                  if (response.status >= 200 && response.status < 300) {
                    console.log(`✅ Log #${log.id} synchronisé.`);
                    return {status: 'fulfilled', id: log.id};
                  } else {
                    console.warn(
                      `⚠️ Log #${log.id} rejeté : HTTP ${response.status}`,
                    );
                    return {status: 'rejected', id: log.id};
                  }
                })
                .catch(err => {
                  console.error(`❌ Log #${log.id} échec : ${err.message}`);
                  return {status: 'rejected', id: log.id};
                }),
            );

            const resultsSettled = await Promise.allSettled(syncPromises);
            const idsToDelete = resultsSettled
              .filter(r => r.value && r.value.status === 'fulfilled')
              .map(r => r.value.id);

            if (idsToDelete.length === 0) {
              console.log('🟡 Aucun log supprimé.');
              resolve(true);
              return;
            }

            // Supprimer les logs synchronisés
            db.transaction(tx2 => {
              const placeholders = idsToDelete.map(() => '?').join(', ');
              tx2.executeSql(
                `DELETE FROM sync_log WHERE id IN (${placeholders})`,
                idsToDelete,
                () => {
                  console.log(
                    `🗑️ ${idsToDelete.length} logs supprimés après succès.`,
                  );
                  resolve(true);
                },
                (_, error) => {
                  console.error('❌ Erreur suppression logs :', error);
                  reject(error);
                  return true;
                },
              );
            });
          },
          (_, error) => {
            console.error('❌ Erreur SELECT sync_log :', error);
            reject(error);
            return true;
          },
        );
      },
      error => {
        console.error('❌ Erreur transaction principale :', error);
        reject(error);
      },
    );
  });
};

export const syncServerToLocal = async () => {
  console.log('🌀 Début de syncServerToLocal...');
  const installDate = await getInstallDate();
  const lastSync = (await AsyncStorage.getItem('lastSyncDate')) || installDate;

  const sanitizeParsedData = rawData => {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      return null;
    }
    const cleaned = {};
    for (let key in rawData) {
      cleaned[key] = rawData[key] === '' ? null : rawData[key];
    }
    return cleaned;
  };

  const getTableSchema = tableName => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `PRAGMA table_info(${tableName});`,
          [],
          (_, result) => {
            const schema = {};
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              schema[row.name] = row.type.toUpperCase();
            }
            resolve(schema);
          },
          (_, error) => {
            console.error(`Erreur PRAGMA pour ${tableName}:`, error);
            reject(error);
          },
        );
      });
    });
  };

  const convertValueByType = (value, type = 'TEXT') => {
    if (value === null || value === undefined) return null;
    switch (type) {
      case 'INTEGER':
        return parseInt(value, 10) || 0;
      case 'REAL':
        return parseFloat(value) || 0.0;
      case 'TEXT':
        return typeof value === 'string' ? value.trim() : String(value);
      default:
        return value;
    }
  };

  try {
    const response = await axios.get(`${API_URL}synclogs/${lastSync}`);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    // const changes = response.data;
    const changes = response.data.filter(c => c.source === 'server'); // 🟩 filtre ici
    const allSchemas = {};
    const uniqueTables = [...new Set(changes.map(c => c.table_name))];

    for (const tableName of uniqueTables) {
      allSchemas[tableName] = await getTableSchema(tableName);
    }

    await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          for (const change of changes) {
            const {
              table_name,
              data,
              action,
              uuid: remoteUuid,
              record_id,
            } = change;

            const schema = allSchemas[table_name];
            if (!schema) continue;

            const parsedData = sanitizeParsedData(
              typeof data === 'string' ? JSON.parse(data) : data,
            );
            if (!parsedData) continue;

            const finalUuid = remoteUuid || parsedData.uuid || uuid.v4();
            parsedData.uuid = finalUuid;

            // ❌ NE PAS AJOUTER "source" dans parsedData (il n'existe pas dans la table)
            const filteredEntries = Object.entries(parsedData).filter(
              ([key, val]) => val !== null && schema.hasOwnProperty(key),
            );

            const keys = filteredEntries.map(([key]) => key);
            const values = filteredEntries.map(([key, val]) =>
              convertValueByType(val, schema[key]),
            );

            let sql = '';
            let params = [];

            if (action === 'insert') {
              sql = `INSERT OR IGNORE INTO ${table_name} (${keys.join(
                ', ',
              )}) VALUES (${keys.map(() => '?').join(', ')})`;
              params = values;
            } else if (action === 'update') {
              const setClause = keys
                .filter(k => k !== 'id')
                .map(k => `${k} = ?`)
                .join(', ');
              const updateValues = keys
                .filter(k => k !== 'id')
                .map(k => convertValueByType(parsedData[k], schema[k]));

              const idValue = convertValueByType(
                parsedData.id || record_id,
                schema['id'],
              );

              sql = `UPDATE ${table_name} SET ${setClause} WHERE id = ?`;
              params = [...updateValues, idValue];
            } else if (action === 'delete') {
              sql = `DELETE FROM ${table_name} WHERE id = ?`;
              params = [convertValueByType(record_id, schema['id'])];
            }

            if (sql) {
              tx.executeSql(
                sql,
                params,
                () =>
                  console.log(
                    `✅ ${action.toUpperCase()} sur ${table_name} (UUID: ${finalUuid})`,
                  ),
                (_, err) => {
                  console.error(`❌ Erreur SQL ${action}:`, err);
                  return true;
                },
              );
            }
          }
        },
        err => {
          console.error('❌ Erreur transaction:', err);
          reject(err);
        },
        async () => {
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          await AsyncStorage.setItem('lastSyncDate', now);
          // 🔑 Notifier un refresh global
          if (typeof global.triggerRefresh === 'function') {
            global.triggerRefresh();
          }
          console.log('✅ Fin de synchronisation serveur → local');
          resolve(true);
        },
      );
    });
  } catch (error) {
    console.error('💥 Erreur syncServerToLocal:', error);
    throw error;
  }
};
