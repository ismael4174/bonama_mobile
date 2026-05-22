import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import {
  TextInput as PaperTextInput,
  Button as PaperButton,
} from 'react-native-paper';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';

const ManuelEleves = ({navigation, route}) => {
  const [manuels, setManuels] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingManuel, setEditingManuel] = useState(null);
  const [etatmanuels, setEtatmanuels] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [stockmanuels, setStockmanuels] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [mesManuels, setMesManuels] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [eleve, setEleve] = useState(null);

  const [formData, setFormData] = useState({
    manuels_id: '',
    elevesinscrits_id: '',
    exemplairemanuelseleve_id: '',
    etatmanuelsremiseeleve_id: '',
    etatmanuelsretoureleve_id: '',
    montantpenalite: '',
    rendu: 0,
  });

  const {eleveInscritId} = route.params || {};

  // 🔹 Charger les données de l’élève sélectionné
  useEffect(() => {
    if (eleveInscritId) {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT elevesinscrits.id, elevesinscrits.etablissements_id, elevesinscrits.remisefinalise, eleves.matriculeeleve, eleves.nomeleve, eleves.prenomseleve
           FROM elevesinscrits
           JOIN eleves ON eleves.id = elevesinscrits.eleves_id
           WHERE elevesinscrits.id = ?`,
          [eleveInscritId],
          (_, results) => {
            if (results.rows.length > 0) {
              const eleveData = results.rows.item(0);
              setEleve(eleveData);
              setIsLocked(eleveData.remisefinalise === 1);
            }
          },
          error => console.log('Erreur chargement élève', error),
        );
      });
    }
  }, [eleveInscritId]);

  // 🔹 Charger les manuels et autres données
  useEffect(() => {
    fetchManuels(eleveInscritId);
    fetchData();
  }, [eleveInscritId]);

  const fetchData = () => {
    db.transaction(tx => {
      // Charger tous les exemplaires pour pouvoir afficher la référence et l'état même si le statut n'est plus "disponible"
      tx.executeSql(
        'SELECT id, referenceexemplaire, manuels_id, etatmanuels_id FROM stockmanuels;',
        [],
        (_, results) => setStockmanuels(results.rows.raw()),
      );
      tx.executeSql(
        'SELECT elevesinscrits.id, eleves.matriculeeleve, eleves.nomeleve, eleves.prenomseleve FROM elevesinscrits JOIN eleves ON eleves.id = elevesinscrits.eleves_id;',
        [],
        (_, results) => setEleves(results.rows.raw()),
      );
      tx.executeSql('SELECT id, titre FROM manuels;', [], (_, results) =>
        setMesManuels(results.rows.raw()),
      );
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels WHERE id IN (1, 2, 3);',
        [],
        (_, results) => setEtatmanuels(results.rows.raw()),
      );
    });
  };

  const fetchManuels = eleveInscritId => {
    db.transaction(tx => {
      let sql = 'SELECT * FROM manuelseleves';
      let params = [];
      if (eleveInscritId) {
        sql += ' WHERE elevesinscrits_id = ?';
        params.push(eleveInscritId);
      }
      tx.executeSql(sql, params, (_, {rows}) => setManuels(rows.raw()));
    });
  };

  // 🔹 Filtrer les exemplaires disponibles pour un manuel
  const filterStockForManuel = manuelId => {
    if (!manuelId || !eleve?.etablissements_id) return setFilteredStock([]);
    db.transaction(tx => {
      tx.executeSql(
        `SELECT sm.id, sm.referenceexemplaire
         FROM stockmanuels sm
         JOIN etablissements et ON et.id = sm.etablissements_id
         LEFT JOIN manuelseleves me
           ON me.exemplairemanuelseleve_id = sm.id
          AND me.rendu = 0
         WHERE sm.statutmanules_id = 1
           AND sm.manuels_id = ?
           AND et.id = ?
           AND me.id IS NULL;`,
        [manuelId, eleve.etablissements_id],
        (_, results) => setFilteredStock(results.rows.raw()),
        (_, error) =>
          console.log('Erreur chargement exemplaires filtrés :', error),
      );
    });
  };

  // 🔹 Finaliser la remise
  const handleFinaliserRemise = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT uuid FROM elevesinscrits WHERE id = ?',
        [eleveInscritId],
        (_, result) => {
          let uuid1 = result.rows.item(0)?.uuid;
          const newUuid = uuid1 || uuid.v4();

          const updateEleveIfNeeded = next => {
            if (!uuid1) {
              tx.executeSql(
                'UPDATE elevesinscrits SET uuid = ? WHERE id = ?',
                [newUuid, eleveInscritId],
                next,
                (_, error) => {
                  console.error('Erreur mise à jour UUID :', error);
                  Alert.alert('Erreur', 'Erreur mise à jour UUID');
                  return false;
                },
              );
            } else {
              next();
            }
          };

          updateEleveIfNeeded(() => {
            tx.executeSql(
              'SELECT COUNT(*) as nbreManuel FROM manuelseleves WHERE elevesinscrits_id = ?',
              [eleveInscritId],
              (_, results) => {
                const nbreManuel = results.rows.item(0).nbreManuel;
                tx.executeSql(
                  'SELECT COUNT(*) as nbremanuelsrenseignes FROM manuelseleves WHERE elevesinscrits_id = ? AND exemplairemanuelseleve_id IS NOT NULL',
                  [eleveInscritId],
                  (_, results) => {
                    const nbremanuelsrenseignes =
                      results.rows.item(0).nbremanuelsrenseignes;
                    if (nbreManuel === nbremanuelsrenseignes) {
                      tx.executeSql(
                        `UPDATE manuelseleves
                         SET etatmanuelsremiseeleve_id = (
                           SELECT sm.etatmanuels_id
                           FROM stockmanuels sm
                           WHERE sm.id = manuelseleves.exemplairemanuelseleve_id
                         )
                         WHERE elevesinscrits_id = ?
                           AND exemplairemanuelseleve_id IS NOT NULL`,
                        [eleveInscritId],
                        () => {
                          tx.executeSql(
                            `UPDATE stockmanuels
                             SET statutmanules_id = 2
                             WHERE id IN (
                               SELECT DISTINCT exemplairemanuelseleve_id
                               FROM manuelseleves
                               WHERE elevesinscrits_id = ?
                                 AND exemplairemanuelseleve_id IS NOT NULL
                             )`,
                            [eleveInscritId],
                            () => {
                              tx.executeSql(
                                'UPDATE elevesinscrits SET remisefinalise = 1 WHERE id = ?',
                                [eleveInscritId],
                                () => {
                                  tx.executeSql(
                                    'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
                                    [
                                      newUuid,
                                      'elevesinscrits',
                                      eleveInscritId,
                                      'update',
                                      JSON.stringify({remisefinalise: 1}),
                                      'local',
                                    ],
                                    () => {
                                      Alert.alert('Succès', 'Remise finalisée !');
                                      navigation.goBack();
                                    },
                                  );
                                },
                              );
                            },
                          );
                        },
                      );
                    } else {
                      Alert.alert(
                        'Avertissement',
                        "Des manuels n'ont pas encore été renseignés.",
                      );
                    }
                  },
                );
              },
            );
          });
        },
      );
    });
  };

  const handleSave = () => {
    if (!formData.manuels_id || !formData.elevesinscrits_id) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    updateManuel(formData);
  };

  const updateManuel = data => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT uuid FROM elevesinscrits WHERE id = ?',
        [data.elevesinscrits_id],
        (_, result) => {
          let uuid3 = result.rows.item(0)?.uuid || uuid.v4();
          tx.executeSql(
            'UPDATE manuelseleves SET manuels_id = ?, elevesinscrits_id = ?, exemplairemanuelseleve_id = ?, etatmanuelsremiseeleve_id = ?, etatmanuelsretoureleve_id = ?, montantpenalite = ?, rendu = ? WHERE id = ?',
            [
              data.manuels_id,
              data.elevesinscrits_id,
              data.exemplairemanuelseleve_id,
              data.etatmanuelsremiseeleve_id,
              data.etatmanuelsretoureleve_id,
              data.montantpenalite,
              data.rendu ? 1 : 0,
              data.id,
            ],
            (_, resultUpdate) => {
              if (resultUpdate.rowsAffected > 0) {
                tx.executeSql(
                  'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
                  [
                    uuid3,
                    'manuelseleves',
                    data.id,
                    'update',
                    JSON.stringify(data),
                    'local',
                  ],
                );
                fetchManuels(eleveInscritId);
                setModalVisible(false);
                setEditingManuel(null);
                Alert.alert('Succès', 'Manuel mis à jour.');
              }
            },
          );
        },
      );
    });
  };

  const selectedExemplaire = stockmanuels.find(
    s => s.id === formData.exemplairemanuelseleve_id,
  );

  const availableReferenceOptions = filteredStock
    .filter(ex => {
      const usedIds = manuels
        .filter(
          m =>
            m.elevesinscrits_id === eleveInscritId &&
            m.manuels_id === (formData?.manuels_id ?? m.manuels_id) &&
            m.id !== formData?.id,
        )
        .map(m => m.exemplairemanuelseleve_id)
        .filter(Boolean);
      return !usedIds.includes(ex.id);
    })
    .map(ex => ({
      label: ex.referenceexemplaire,
      value: ex.id,
    }));

  let referenceOptions = availableReferenceOptions;

  if (selectedExemplaire && formData.exemplairemanuelseleve_id) {
    const exists = availableReferenceOptions.some(
      opt => opt.value === formData.exemplairemanuelseleve_id,
    );
    if (!exists) {
      referenceOptions = [
        {
          label: selectedExemplaire.referenceexemplaire,
          value: formData.exemplairemanuelseleve_id,
        },
        ...availableReferenceOptions,
      ];
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={{backgroundColor: '#fff'}}>
            {/* <PaperTextInput
              mode="outlined"
              placeholder="Rechercher..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              left={<PaperTextInput.Icon icon="magnify" />}
            /> */}

            <PaperButton
              style={{marginTop: 8}}
              onPress={() => navigation.goBack()}>
              Précédent
            </PaperButton>

            <PaperButton
              mode="contained"
              style={{marginTop: 8}}
              onPress={handleFinaliserRemise}>
              Finaliser cette remise
            </PaperButton>

            {eleve && (
              <View style={styles.eleveCard}>
                <Text style={styles.eleveTitle}>Élève :</Text>
                <Text style={styles.eleveInfo}>
                  {eleve.matriculeeleve} - {eleve.nomeleve} {eleve.prenomseleve}
                </Text>
              </View>
            )}
          </View>
        }
        stickyHeaderIndices={[0]}
        data={manuels.filter(m =>
          String(m.manuels_id).includes(search.toLowerCase()),
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const monmanuel = mesManuels.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel ? monmanuel.titre : 'Inconnu';
          const exemplaire = stockmanuels.find(
            s => s.id === item.exemplairemanuelseleve_id,
          );
          const monexemplaire = exemplaire
            ? exemplaire.referenceexemplaire
            : 'Inconnu';
          // L'état à la remise est désormais lu depuis l'exemplaire en stock
          const etatmanuelremise = exemplaire
            ? etatmanuels.find(e => e.id === exemplaire.etatmanuels_id)
            : null;
          const monetatremise = etatmanuelremise
            ? etatmanuelremise.etatmanuel
            : 'Inconnu';

          const remiseFinalisee = eleve?.remisefinalise === 1;

          return (
            <View style={styles.card}>
              <Text style={styles.title}>📘 {libelleManuel}</Text>
              <Text>Référence : {monexemplaire}</Text>
              <Text>État remise : {monetatremise}</Text>
              <View style={styles.actions}>
                {!remiseFinalisee && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingManuel(item);
                      filterStockForManuel(item.manuels_id);
                      setFormData({
                        id: item.id,
                        manuels_id: item.manuels_id ?? '',
                        elevesinscrits_id: item.elevesinscrits_id ?? '',
                        exemplairemanuelseleve_id:
                          item.exemplairemanuelseleve_id ?? '',
                        etatmanuelsremiseeleve_id:
                          item.etatmanuelsremiseeleve_id ?? '',
                        etatmanuelsretoureleve_id:
                          item.etatmanuelsretoureleve_id ?? '',
                        montantpenalite: item.montantpenalite ?? '',
                        rendu: item.rendu === 1,
                      });
                      setModalVisible(true);
                    }}>
                    <Text style={{fontSize: 22}}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{textAlign: 'center', marginTop: 20}}>
            Aucun manuel attribué à cet élève.
          </Text>
        }
      />

      {/* Modal d'édition */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text>Manuel</Text>
            <CustomPicker
              label="Manuel"
              items={mesManuels.map(mat => ({
                label: mat.titre,
                value: mat.id,
              }))}
              selectedId={formData.manuels_id}
              onValueChange={value => {
                setFormData({...formData, manuels_id: value});
                filterStockForManuel(value);
              }}
              isDisabled={true}
            />
            <Text>Référence</Text>
            {eleve?.remisefinalise === 1 ? (
              <PaperTextInput
                mode="outlined"
                value={selectedExemplaire?.referenceexemplaire || ''}
                editable={false}
                style={{marginBottom: 8}}
              />
            ) : (
              <CustomPicker
                label="Référence"
                items={[
                  {
                    label: 'Sélectionner une référence',
                    value: null,
                    isPlaceholder: true,
                  },
                  ...referenceOptions,
                ]}
                selectedId={formData.exemplairemanuelseleve_id}
                onValueChange={value => {
                  const selected = stockmanuels.find(s => s.id === value);
                  setFormData({
                    ...formData,
                    exemplairemanuelseleve_id: value,
                    etatmanuelsremiseeleve_id: selected
                      ? selected.etatmanuels_id
                      : '',
                  });
                }}
                placeholder="Sélectionner une référence"
              />
            )}
            {/* L'état à la remise provient désormais de stockmanuels et n'est plus modifiable ici */}
            <PaperButton mode="contained" onPress={handleSave}>
              Enregistrer
            </PaperButton>
            <PaperButton
              style={{marginTop: 8}}
              onPress={() => setModalVisible(false)}>
              Annuler
            </PaperButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 10},
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    color: 'black',
  },
  eleveCard: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  eleveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eleveInfo: {
    fontSize: 16,
  },
  card: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  title: {fontSize: 18, fontWeight: 'bold'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5},
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {backgroundColor: 'white', padding: 20, borderRadius: 10},
});

export default ManuelEleves;

