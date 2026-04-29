import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert} from 'react-native';
import {TextInput as PaperTextInput, Button as PaperButton, List, Divider} from 'react-native-paper';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';
import useAnneescolairesID from '../../parametres/anneescolaire';
import useEtablissementId from '../../parametres/etablissement';

const CeInscritsvalidation = () => {
  const [commandes, setCommandes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ues, setUes] = useState([]);
  const [uesId, setUesId] = useState('');
  const [nombretotalmanuel, setNombreTotalManuel] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [editCommande, setEditCommande] = useState(null);
  const [editedDetails, setEditedDetails] = useState([]); // détails modifiables (quantités)

  const anneeScolaireId = useAnneescolairesID();
  const etablissementId = useEtablissementId();
  const [isProcessing, setIsProcessing] = useState(false);

  const [commandeTraitee, setCommandeTraitee] = useState(null); // Pour éviter les revalidations

  // Chargement des données seulement quand les deux IDs sont présents
  useEffect(() => {
    if (anneeScolaireId && etablissementId) {
      fetchCommandes();
      fetchUES();
    }
  }, [anneeScolaireId, etablissementId]);

  const fetchCommandes = useCallback(() => {
    db.transaction(tx => {
      tx.executeSql(
        `
        SELECT 
          c.id AS commande_id,
          c.nombretotalmanuel,
          c.ues_id,
          c.anneescolaires_id,
          c.souscrit,
          u.denominationue AS ues_nom,
          d.id AS detail_id,
          d.manuels_id,
          d.nombremanuel,
          m.titre AS manuel_nom
        FROM commandesues c
        JOIN ues u ON c.ues_id = u.id
        LEFT JOIN detailscommandeues d ON d.commandesues_id = c.id
        LEFT JOIN manuels m ON m.id = d.manuels_id
        WHERE c.anneescolaires_id = ? 
          AND u.etablissements_id = ?  
          AND c.presouscrit = 1         
          AND (c.souscrit IS NULL OR c.souscrit = 0)
        ORDER BY c.id;
        `,
        [anneeScolaireId, etablissementId],
        (_, {rows}) => {
          const raw = rows.raw();
          const grouped = {};
          raw.forEach(row => {
            if (!grouped[row.commande_id]) {
              grouped[row.commande_id] = {
                id: row.commande_id,
                ues_nom: row.ues_nom,
                nombretotalmanuel: row.nombretotalmanuel,
                ues_id: row.ues_id,
                souscrit: row.souscrit,
                anneescolaires_id: row.anneescolaires_id,
                details: [],
              };
            }
            if (row.detail_id) {
              grouped[row.commande_id].details.push({
                id: row.detail_id,
                manuels_id: row.manuels_id,
                nombremanuel: row.nombremanuel,
                manuel_nom: row.manuel_nom,
              });
            }
          });
          setCommandes(Object.values(grouped));
        },
      );
    });
  }, [anneeScolaireId, etablissementId]);
  const confirmValidation = commandeId => {
    if (isProcessing) {
      console.log('⛔ Déjà en cours, commande ignorée:', commandeId);
      return;
    }

    Alert.alert('Confirmation', 'Valider cette commande ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Valider',
        onPress: () => handleValidate(commandeId),
      },
    ]);
  };

  const handleValidate = commandeId => {
    setIsProcessing(true);
    setCommandeTraitee(commandeId);
    console.log('🔁 Début validation pour la commande:', commandeId);

    db.transaction(tx => {
      // Étape 0 : Vérifier la valeur de `souscrit`
      tx.executeSql(
        'SELECT souscrit FROM commandesues WHERE id = ?',
        [commandeId],
        (_, {rows}) => {
          const {souscrit} = rows.item(0);

          if (souscrit === 1) {
            console.warn('⚠️ Commande déjà souscrite, pas d’insertion.');
            Alert.alert('Attention', 'Cette commande a déjà été validée.');
            setIsProcessing(false);
            setCommandeTraitee(null);
            return; // ⛔ On arrête ici
          }

          // ✅ Si non souscrite, continuer
          tx.executeSql(
            'SELECT * FROM detailscommandeues WHERE commandesues_id = ?',
            [commandeId],
            (_, {rows}) => {
              const details = rows.raw();
              console.log('📦 Détails de la commande:', details);

              let pendingInsertions = 0;

              details.forEach(detail => {
                const {manuels_id, nombremanuel} = detail;

                tx.executeSql(
                  `SELECT COUNT(*) AS count FROM manuelsues WHERE commandesues_id = ? AND manuels_id = ?`,
                  [commandeId, manuels_id],
                  (_, {rows}) => {
                    const count = rows.item(0).count;
                    const manquants = nombremanuel - count;

                    console.log(
                      `🔍 ${count}/${nombremanuel} manuelsues déjà insérés pour manuels_id=${manuels_id}`,
                    );

                    if (manquants > 0) {
                      for (let i = 0; i < manquants; i++) {
                        const generatedUuid = uuid.v4(); // ✅ Générer un UUID
                        console.log('generateuuid =', generatedUuid);
                        pendingInsertions++;
                        tx.executeSql(
                          `INSERT INTO manuelsues (commandesues_id, manuels_id, rendu, uuid) VALUES (?, ?, ?, ?)`,
                          [commandeId, manuels_id, 0, generatedUuid],
                          (_, result) => {
                            console.log(
                              `✅ Insertion manuelues ID ${result.insertId}`,
                            );

                            tx.executeSql(
                              `INSERT INTO sync_log (table_name, record_id, action, data, uuid, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
                              [
                                'manuelsues',
                                result.insertId,
                                'insert',
                                JSON.stringify({
                                  commandesues_id: commandeId,
                                  manuels_id,
                                  rendu: 0,
                                  uuid: generatedUuid,
                                }),
                                generatedUuid,
                                'local',
                              ],
                              () => {
                                console.log(
                                  `📝 Sync log manuelues ID ${result.insertId}`,
                                );
                                pendingInsertions--;
                                if (pendingInsertions === 0) {
                                  finalizeValidation(commandeId);
                                }
                              },
                              (_, error) => {
                                console.error(
                                  '❌ Erreur sync_log manuelues:',
                                  error,
                                );
                                pendingInsertions--;
                              },
                            );
                          },
                          (_, error) => {
                            console.error(
                              '❌ Erreur insertion manuelues:',
                              error,
                            );
                            pendingInsertions--;
                          },
                        );
                      }
                    } else {
                      console.log(
                        `⚠️ Tous les manuels sont déjà insérés pour manuels_id=${manuels_id}`,
                      );
                    }

                    if (pendingInsertions === 0) {
                      finalizeValidation(commandeId);
                    }
                  },
                  (_, error) => {
                    console.error(
                      '❌ Erreur comptage manuelues existants:',
                      error,
                    );
                  },
                );
              });

              if (details.length === 0) {
                console.log('ℹ️ Aucun détail de commande trouvé.');
                finalizeValidation(commandeId);
              }
            },
            (_, error) => {
              console.error(
                '❌ Erreur récupération detailscommandeues:',
                error,
              );
              Alert.alert('Erreur', 'Impossible de récupérer les détails.');
              setIsProcessing(false);
            },
          );
        },
        (_, error) => {
          console.error('❌ Erreur vérification souscrit:', error);
          Alert.alert('Erreur', 'Impossible de vérifier la commande.');
          setIsProcessing(false);
        },
      );
    });
  };
  const finalizeValidation = commandeId => {
    db.transaction(tx => {
      // 🔍 Étape 1 : Récupérer le UUID de la commande
      tx.executeSql(
        'SELECT uuid FROM commandesues WHERE id = ?',
        [commandeId],
        (_, {rows}) => {
          const existingUuid = rows.item(0)?.uuid;
          const finalUuid = existingUuid || uuid.v4(); // ✅ Prendre l'existant ou générer
          console.log(`📝 uuid de la commande ${commandeId} est :`, finalUuid);
          // ✅ Étape 2 : Mettre à jour la commande
          tx.executeSql(
            'UPDATE commandesues SET souscrit = 1 WHERE id = ?',
            [commandeId],
            () => {
              // 📝 Étape 3 : Insérer le sync_log
              tx.executeSql(
                `INSERT INTO sync_log (table_name, record_id, action, data, uuid, source)
               VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  'commandesues',
                  commandeId,
                  'update',
                  JSON.stringify({souscrit: 1}),
                  finalUuid,
                  'local',
                ],
                () => {
                  console.log(`📝 Sync log pour commandesues ${commandeId}`);
                  Alert.alert('Succès', 'Commande validée et manuels générés.');
                  setIsProcessing(false);
                  setCommandeTraitee(null);
                  fetchCommandes();
                },
                (_, error) => {
                  console.error('❌ Erreur sync_log commandesues :', error);
                },
              );
            },
            (_, error) => {
              console.error('❌ Erreur mise à jour souscrit :', error);
              setIsProcessing(false);
              setCommandeTraitee(null);
              Alert.alert('Erreur', 'Impossible de finaliser la validation.');
            },
          );
        },
        (_, error) => {
          console.error('❌ Erreur récupération uuid commandesues :', error);
          setIsProcessing(false);
        },
      );
    });
  };

  /* const finalizeValidation = commandeId => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE commandesues SET souscrit = 1 WHERE id = ?',
        [commandeId],
        () => {
          tx.executeSql(
            `INSERT INTO sync_log (table_name, record_id, action, data)
           VALUES (?, ?, ?, ?)`,
            [
              'commandesues',
              commandeId,
              'update',
              JSON.stringify({souscrit: 1}),
            ],
            () => {
              console.log(`📝 Sync log pour commandesues ${commandeId}`);
              Alert.alert('Succès', 'Commande validée et manuels générés.');
              setIsProcessing(false);
              setCommandeTraitee(null);
              fetchCommandes();
            },
          );
        },
        (_, error) => {
          console.error('❌ Erreur mise à jour souscrit:', error);
          setIsProcessing(false);
          setCommandeTraitee(null);
          Alert.alert('Erreur', 'Impossible de finaliser la validation.');
        },
      );
    });
  };*/

  const fetchUES = useCallback(() => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM ues WHERE etablissement_id = ?;',
        [etablissementId],
        (_, {rows}) => {
          setUes(rows.raw());
        },
      );
    });
  }, [etablissementId]);

  const openEditModal = commande => {
    setEditCommande(commande);
    setEditedDetails(
      (commande.details || []).map(d => ({
        ...d,
        nombremanuelStr: d.nombremanuel != null ? String(d.nombremanuel) : '0',
      })),
    );
    setModalVisible(true);
  };

  const handleChangeDetailQuantity = (detailId, value) => {
    const numeric = value.replace(/[^0-9]/g, '');
    setEditedDetails(prev =>
      prev.map(d =>
        d.id === detailId ? {...d, nombremanuelStr: numeric} : d,
      ),
    );
  };

  const saveEditedCommande = () => {
    if (!editCommande) {
      setModalVisible(false);
      return;
    }

    db.transaction(tx => {
      let total = 0;

      editedDetails.forEach(d => {
        const qty = parseInt(d.nombremanuelStr || '0', 10) || 0;
        total += qty;
        tx.executeSql(
          'UPDATE detailscommandeues SET nombremanuel = ? WHERE id = ?;',
          [qty, d.id],
        );
      });

      // Mettre à jour le nombre total sur la commande
      tx.executeSql(
        'UPDATE commandesues SET nombretotalmanuel = ? WHERE id = ?;',
        [total, editCommande.id],
        () => {
          fetchCommandes();
          setModalVisible(false);
          setEditCommande(null);
          setEditedDetails([]);
        },
      );
    });
  };

  const renderItem = ({item}) => (
    <List.Item
      title={item.ues_nom}
      titleNumberOfLines={3}
      titleEllipsizeMode="tail"
      description={() => (
        <View>
          {item.details.length > 0 ? (
            <View>
              {item.details.map((d, i) => (
                <Text key={i}>📘 {d.manuel_nom} — {d.nombremanuel}</Text>
              ))}
            </View>
          ) : (
            <Text style={{color: '#888'}}>Aucun manuel ajouté.</Text>
          )}
        </View>
      )}
      left={props => <List.Icon {...props} icon="account-group" />}
      right={props => (
        <View style={{justifyContent: 'center'}}>
          <PaperButton
            mode="outlined"
            style={{marginBottom: 4}}
            onPress={() => openEditModal(item)}>
            Modifier
          </PaperButton>
          <PaperButton mode="contained" onPress={() => confirmValidation(item.id)}>
            Valider
          </PaperButton>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={commandes}
        keyExtractor={item => item.id.toString()}
        ItemSeparatorComponent={Divider}
        renderItem={renderItem}
      />
      <Modal visible={modalVisible} animationType="slide">
        <View style={{padding: 20, flex: 1}}>
          <Text style={{fontWeight: 'bold', marginBottom: 10}}>
            Modifier les quantités de la commande
          </Text>
          {editCommande && (
            <Text style={{marginBottom: 10}}>
              CE / UE : {editCommande.ues_nom}
            </Text>
          )}

          {editedDetails.length > 0 ? (
            <FlatList
              data={editedDetails}
              keyExtractor={d => d.id.toString()}
              renderItem={({item}) => (
                <View style={{marginBottom: 10}}>
                  <Text style={{marginBottom: 4}}>📘 {item.manuel_nom}</Text>
                  <PaperTextInput
                    mode="outlined"
                    style={styles.input}
                    keyboardType="numeric"
                    value={item.nombremanuelStr}
                    onChangeText={text =>
                      handleChangeDetailQuantity(item.id, text)
                    }
                  />
                </View>
              )}
            />
          ) : (
            <Text style={{color: '#888'}}>Aucun détail à modifier.</Text>
          )}

          <PaperButton
            mode="contained"
            onPress={saveEditedCommande}
            style={{marginTop: 10}}>
            Enregistrer
          </PaperButton>
          <PaperButton
            style={{marginTop: 10}}
            onPress={() => {
              setModalVisible(false);
              setEditCommande(null);
              setEditedDetails([]);
            }}>
            Annuler
          </PaperButton>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 10},
  card: {
    backgroundColor: '#eee',
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
  },
  title: {fontSize: 16, fontWeight: 'bold'},
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {backgroundColor: '#ddd', padding: 8, borderRadius: 5},
  input: {marginVertical: 10},
});

export default CeInscritsvalidation;
