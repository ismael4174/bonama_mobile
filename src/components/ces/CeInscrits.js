import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Button} from 'react-native';
import {TextInput as PaperTextInput, List, Divider} from 'react-native-paper';
import EmptyState from '../ui/EmptyState';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomPicker from '../CustomPicker';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useEtablissementId from '../../parametres/etablissement.js';

/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const CeInscrits = () => {
  const [commandes, setCommandes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [uesId, setUesId] = useState(null);
  const [anneeScolaireId, setAnneeScolaireId] = useState(null);
  const [nombretotalmanuel, setNombretotalmanuel] = useState('');
  const [annees, setAnnees] = useState([]);
  const [manuels, setManuels] = useState([]);
  const [ues, setUes] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [details, setDetails] = useState([]);
  const [etablissementIdInteger, setEtablissementIdInteger] = useState(null);
  const anneescolairesID = useAnneescolairesID();
  //const etablissementsID = useEtablissementId();
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => {
          setManuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
    });
  }, []);
  useEffect(() => {
    const fetchEtablissementId = async () => {
      try {
        const etablissementIdString = await AsyncStorage.getItem(
          'etablissements_id',
        );
        if (etablissementIdString) {
          const id = parseInt(etablissementIdString, 10);
          setEtablissementIdInteger(id);
          console.log("Identifiant de l'établissement (entier) :", id);
        } else {
          console.error(
            "Erreur : identifiant d'établissement non trouvé dans AsyncStorage.",
          );
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'identifiant d'établissement :",
          error,
        );
      }
    };
    fetchEtablissementId();
  }, []);

  const fetchCommandes = useCallback(() => {
    if (!etablissementIdInteger || !anneescolairesID) return; // Vérifier si les IDs sont disponibles

    db.transaction(
      tx => {
        tx.executeSql(
          'SELECT commandesues.*, details.* FROM commandesues INNER JOIN detailscommandeues AS details ON commandesues.id = details.commandesues_id INNER JOIN ues ON ues.id = commandesues.ues_id WHERE ues.etablissements_id = ? AND commandesues.anneescolaires_id = ?;',
          [etablissementIdInteger, anneescolairesID],
          (_, results) => {
            const rows = results.rows.raw();
            const commandes = [];
            const commandesMap = {};

            rows.forEach(row => {
              const commandeId = row.id;
              if (!commandesMap[commandeId]) {
                commandesMap[commandeId] = {
                  ...row,
                  details: [],
                };
                commandes.push(commandesMap[commandeId]);
              }
              commandesMap[commandeId].details.push({
                ...row,
              });
            });
            setCommandes(commandes);
          },
          (_, error) => {
            console.error(
              'Erreur lors de la récupération des commandes et détails :',
              error,
            );
          },
        );
      },
      error => {
        console.error(
          'Erreur de transaction lors de la récupération des commandes et détails :',
          error,
        );
      },
    );
  }, [etablissementIdInteger, anneescolairesID]); // Ajouter anneescolairesID comme dépendance

  useEffect(() => {
    fetchCommandes();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, results) => {
          setAnnees(results.rows.raw());
        },
        error =>
          console.log('Erreur lors du chargement des années scolaires', error),
      );
      tx.executeSql(
        'SELECT id, denominationue FROM ues WHERE etablissements_id=?;',
        [etablissementIdInteger],
        (_, results) => {
          setUes(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des CE', error),
      );
    });
  }, [fetchCommandes]);

  useEffect(() => {
    fetchCommandes();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, results) => {
          setAnnees(results.rows.raw());
        },
        error =>
          console.log('Erreur lors du chargement des années scolaires', error),
      );

      tx.executeSql(
        'SELECT id, denominationue FROM ues WHERE etablissements_id=?;',
        [etablissementIdInteger],
        (_, results) => {
          setUes(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des CE', error),
      );
    });
  }, [fetchCommandes]);

  const handleSearch = useCallback(text => {
    setSearchText(text);
    const query =
      text.trim() !== ''
        ? `SELECT commandesues.* FROM commandesues JOIN ues ON ues.id = commandesues.ues_id JOIN anneescolaires ON anneescolaires.id = commandesues.anneescolaires_id WHERE LOWER(ues.denominationue) LIKE LOWER(?) OR LOWER(anneescolaires.libelleanneescolaire) LIKE LOWER(?)`
        : `SELECT * FROM commandesues`;
    const params = text.trim() !== '' ? [`%${text}%`, `%${text}%`] : [];

    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
        (_, {rows}) => {
          setCommandes(rows.raw());
        },
        (_, error) => {
          console.error('Erreur SQL : ', error);
          return false;
        },
      );
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!uesId || details.length === 0) {
      alert('Veuillez sélectionner un CE et ajouter au moins un manuel.');
      return;
    }

    db.transaction(
      tx => {
        if (selectedCommande) {
          // Mise à jour de la commande existante
          tx.executeSql(
            'UPDATE commandesues SET ues_id = ?, anneescolaires_id = ? WHERE id = ?;',
            [uesId, anneescolairesID, selectedCommande.id],
            () => {
              console.log('✅ Commande mise à jour avec succès');
              updateDetailsCommande(tx, selectedCommande.id);
              addSyncLog(tx, 'commandesues', selectedCommande.id, 'update', {
                ues_id: uesId,
                anneescolaires_id: anneescolairesID,
              });
            },
            (_, error) => {
              console.log('❌ Erreur mise à jour commande :', error);
              return true;
            },
          );
        } else {
          // Insertion d'une nouvelle commande
          tx.executeSql(
            'INSERT INTO commandesues (ues_id, anneescolaires_id) VALUES (?, ?);',
            [uesId, anneescolairesID],
            (tx, result) => {
              const commandesuesId = result.insertId;
              console.log('✅ Commande insérée, ID :', commandesuesId);
              insertDetailsCommande(tx, commandesuesId);
              addSyncLog(tx, 'commandesues', commandesuesId, 'insert', {
                ues_id: uesId,
                anneescolaires_id: anneescolairesID,
              });
            },
            (_, error) => {
              console.log('❌ Erreur insertion commande :', error);
              return true;
            },
          );
        }
      },
      error => {
        console.log('❌ Erreur dans la transaction handleSave :', error);
      },
    );

    setModalVisible(false);
    resetForm();
  }, [uesId, anneescolairesID, selectedCommande, details]);

  const updateDetailsCommande = useCallback(
    (tx, commandesuesId) => {
      // Supprimer d'abord les anciens détails
      tx.executeSql(
        'DELETE FROM detailscommandeues WHERE commandesues_id = ?;',
        [commandesuesId],
        () => {
          console.log('🔄 Détails précédents supprimés pour mise à jour');
          // Réinsertion des nouveaux détails
          insertDetailsCommande(tx, commandesuesId);
        },
        (_, error) => {
          console.log('❌ Erreur suppression anciens détails :', error);
          return true;
        },
      );
    },
    [insertDetailsCommande],
  );

  const insertDetailsCommande = useCallback(
    (tx, commandesuesId) => {
      details.forEach(detail => {
        const {manuels_id, nombremanuel} = detail;

        if (manuels_id && nombremanuel) {
          console.log(
            '➡️ Insertion du détail :',
            commandesuesId,
            manuels_id,
            nombremanuel,
          );

          tx.executeSql(
            'INSERT INTO detailscommandeues (commandesues_id, manuels_id, nombremanuel) VALUES (?, ?, ?);',
            [commandesuesId, manuels_id, nombremanuel],
            () => {
              console.log('✅ Détail inséré');
            },
            (_, error) => {
              console.log('❌ Erreur insertion détail :', error);
              return true;
            },
          );

          addSyncLog(tx, 'detailscommandeues', null, 'insert', {
            commandesues_id: commandesuesId,
            manuels_id,
            nombremanuel,
          });
        }
      });
    },
    [details],
  );

  const addSyncLog = useCallback((tx, table, recordId, action, data) => {
    const syncData = JSON.stringify(data);
    const timestamp = new Date().toISOString();
    const logUuid = uuid.v4(); // Génère un UUID unique
    const source = 'local'; // Peut être changé si besoin

    tx.executeSql(
      'INSERT INTO sync_log (uuid, table_name, record_id, action, data, last_modified, source) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [logUuid, table, recordId, action, syncData, timestamp, source],
      () => {
        console.log(`📝 Log de synchronisation ajouté pour ${table}`);
      },
      (_, error) => {
        console.log(`❌ Erreur insertion log pour ${table} :`, error);
        return true;
      },
    );
  }, []);

  const handleEdit = useCallback(item => {
    setSelectedCommande(item);
    setUesId(item.ues_id);
    setAnneeScolaireId(item.anneescolaires_id);
    setNombretotalmanuel(
      item.nombretotalmanuel ? item.nombretotalmanuel.toString() : '',
    );
    setDetails(item.details);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    id => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM detailscommandeues WHERE commandesues_id =?;',
          [id],
          () => {
            addSyncLog(tx, 'detailscommandeues', id, 'delete', {
              commandesues_id: id,
            });
            tx.executeSql(
              'DELETE FROM commandesues WHERE id = ?;',
              [id],
              () => {
                addSyncLog(tx, 'commandesues', id, 'delete', {id});
                fetchCommandes();
              },
              error =>
                console.log(
                  'Erreur lors de la suppression de la commande:',
                  error,
                ),
            );
          },
          error =>
            console.log(
              'Erreur lors de la suppression des détails de la commande:',
              error,
            ),
        );
      });
    },
    [fetchCommandes],
  );

  const handleAddDetail = useCallback(() => {
    setDetails([...details, {manuels_id: '', nombremanuel: ''}]);
  }, [details]);

  const handleDetailChange = useCallback(
    (index, field, value) => {
      const updatedDetails = [...details];
      updatedDetails[index][field] = value;
      setDetails(updatedDetails);
    },
    [details],
  );

  const handleDeleteDetail = useCallback(
    index => {
      const updatedDetails = details.filter((_, i) => i !== index);
      setDetails(updatedDetails);
    },
    [details],
  );

  const resetForm = useCallback(() => {
    setSelectedCommande(null);
    setUesId(null);
    setAnneeScolaireId(null);
    setNombretotalmanuel('');
    setDetails([]); // Réinitialiser les détails
  }, []);

  const closeModal = useCallback(() => {
    resetForm();
    setModalVisible(false);
  }, [resetForm]);

  const anneescolaire = useCallback(
    id => {
      const monannee = annees.find(e => e.id === id);
      return monannee ? monannee.libelleanneescolaire : 'Inconnu';
    },
    [annees],
  );

  const ueselect = useCallback(
    id => {
      const monue = ues.find(e => e.id === id);
      return monue ? monue.denominationue : 'Inconnu';
    },
    [ues],
  );
  const manuel = useCallback(
    id => {
      const monmanuel = manuels.find(e => e.id === id);
      return monmanuel ? monmanuel.titre : 'Inconnu';
    },
    [manuels],
  );

  const memoizedCommandes = useMemo(() => {
    return commandes.map(commande => ({
      ...commande,
      ues_name: ueselect(commande.ues_id),
      anneescolaire_name: anneescolaire(commande.anneescolaires_id),
    }));
  }, [commandes, ueselect, anneescolaire]);

  return (
    <View style={styles.container}>
      {/* 🟢 Bande de notification du total des commandes */}
      <View style={styles.notification}>
        <Text style={styles.notificationText}>
          Total des commandes :{' '}
          <Text style={styles.count}>{commandes.length}</Text>
        </Text>
      </View>

      <PaperTextInput
        mode="outlined"
        style={styles.searchInput}
        placeholder="Recherche rapide"
        value={searchText}
        onChangeText={text => {
          setSearchText(text);
        }}
        left={<PaperTextInput.Icon icon="magnify" />}
      />

      <FlatList
        data={memoizedCommandes}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<EmptyState title="Aucune commande" subtitle="Aucune souscription CE trouvée" />}
        renderItem={({item}) => (
          <List.Item
            title={`CE: ${item.ues_name}`}
            titleNumberOfLines={3}
            titleEllipsizeMode="tail"
            description={() => (
              <View>
                {item.details.map(detail => (
                  <View key={detail.id} style={styles.detailItem}>
                    <Text style={styles.detailText}>
                      Manuel: {manuels.find(m => m.id === detail.manuels_id)?.titre || 'Inconnu'}
                    </Text>
                    <Text style={styles.detailText}>Quantité: {detail.nombremanuel}</Text>
                  </View>
                ))}
              </View>
            )}
            left={props => <List.Icon {...props} icon="account-group" />}
          />
        )}
      />

      {/* Modal pour édition / ajout reste identique */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  notification: {
    backgroundColor: '#2196f3', // bleu pour mettre en valeur le total
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  count: {
    color: '#ffd700', // jaune pour le chiffre
  },
  searchInput: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailItem: {
    marginLeft: 10,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
  },
});

export default CeInscrits;
