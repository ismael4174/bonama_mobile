import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Switch, Alert} from 'react-native';
import {TextInput as PaperTextInput, Button as PaperButton} from 'react-native-paper';
import {db} from '../../db/database';
import uuid from 'react-native-uuid';
import CustomPicker from '../CustomPicker';

const ManuelEleves = ({navigation, route}) => {
  const [manuels, setManuels] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingManuel, setEditingManuel] = useState(null);
  const [etatmanuels, setEtatmanuels] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [stockmanuels, setStockmanuels] = useState([]);
  const [mesManuels, setMesManuels] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
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

  // ======================================
  // FETCH DATA
  // ======================================
  useEffect(() => {
    fetchManuels(eleveInscritId);
    fetchData();
  }, [eleveInscritId]);

  const fetchData = () => {
    db.transaction(tx => {
      // Stock manuels
      tx.executeSql(
        'SELECT id, referenceexemplaire FROM stockmanuels;',
        [],
        (_, results) => setStockmanuels(results.rows.raw()),
        error => console.log('Erreur chargement stockmanuels:', error),
      );
      // Eleves
      tx.executeSql(
        'SELECT elevesinscrits.id, eleves.matriculeeleve, eleves.nomeleve, eleves.prenomseleve FROM elevesinscrits JOIN eleves ON eleves.id = elevesinscrits.eleves_id;',
        [],
        (_, results) => setEleves(results.rows.raw()),
        error => console.log('Erreur chargement eleves:', error),
      );
      // Manuels
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => setMesManuels(results.rows.raw()),
        error => console.log('Erreur chargement manuels:', error),
      );
      // Etats manuels
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels;',
        [],
        (_, results) => setEtatmanuels(results.rows.raw()),
        error => console.log('Erreur chargement etatmanuels:', error),
      );
    });
  };

  const fetchManuels = eleveInscritId => {
    if (!eleveInscritId) return;
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM manuelseleves WHERE elevesinscrits_id = ?',
        [eleveInscritId],
        (_, {rows}) => setManuels(rows.raw()),
        (_, error) => console.log('Erreur fetchManuels:', error),
      );
    });
  };

  // ======================================
  // FINALISER RETOUR
  // ======================================
  const handleFinaliserRetour = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) as nbreManuel FROM manuelseleves WHERE elevesinscrits_id = ?',
        [eleveInscritId],
        (_, results) => {
          const nbreManuel = results.rows.item(0).nbreManuel;

          tx.executeSql(
            'SELECT COUNT(*) as nbremanuelsrenseignes FROM manuelseleves WHERE elevesinscrits_id = ? AND etatmanuelsretoureleve_id IS NOT NULL',
            [eleveInscritId],
            (_, results) => {
              const nbremanuelsrenseignes =
                results.rows.item(0).nbremanuelsrenseignes;

              if (nbreManuel === nbremanuelsrenseignes) {
                tx.executeSql(
                  'SELECT uuid FROM elevesinscrits WHERE id = ?',
                  [eleveInscritId],
                  (_, results) => {
                    let uuid1 = results.rows.item(0)?.uuid;
                    if (!uuid1) {
                      uuid1 = uuid.v4();
                      tx.executeSql(
                        'UPDATE elevesinscrits SET uuid = ? WHERE id = ?',
                        [uuid1, eleveInscritId],
                      );
                    }
                    tx.executeSql(
                      'UPDATE elevesinscrits SET retourfinalise = 1 WHERE id = ?',
                      [eleveInscritId],
                      () => {
                        tx.executeSql(
                          'INSERT INTO sync_log (uuid,source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                          [
                            uuid1,
                            'local',
                            'elevesinscrits',
                            eleveInscritId,
                            'update',
                            JSON.stringify({retourfinalise: 1}),
                          ],
                          () => {
                            Alert.alert('Succès', 'La remise a été finalisée.');
                            navigation.goBack();
                          },
                        );
                      },
                    );
                  },
                );
              } else {
                Alert.alert(
                  'Avertissement',
                  "Des manuels n'ont pas été renseignés.",
                );
              }
            },
          );
        },
      );
    });
  };

  // ======================================
  // SAVE / UPDATE / DELETE MANUEL
  // ======================================
  const handleSave = () => {
    if (!formData.manuels_id || !formData.elevesinscrits_id) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    if (editingManuel) {
      updateManuel(formData);
    } else {
      saveToSQLite(formData);
    }
  };

  const saveToSQLite = data => {
    const newUuid = uuid.v4();
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO manuelseleves (manuels_id, elevesinscrits_id, rendu, uuid) VALUES (?, ?, ?, ?)',
        [data.manuels_id, data.elevesinscrits_id, data.rendu ? 1 : 0, newUuid],
        (_, result) => {
          const insertId = result.insertId;
          tx.executeSql(
            'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
            [
              newUuid,
              'local',
              'manuelseleves',
              insertId,
              'insert',
              JSON.stringify(data),
            ],
          );
          fetchManuels(data.elevesinscrits_id);
          setModalVisible(false);
        },
      );
    });
  };

  const updateManuel = data => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT uuid FROM manuelseleves WHERE id = ?',
        [data.id],
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
            (_, result) => {
              if (result.rowsAffected > 0) {
                tx.executeSql(
                  'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                  [
                    uuid3,
                    'local',
                    'manuelseleves',
                    data.id,
                    'update',
                    JSON.stringify(data),
                  ],
                );
                fetchManuels(data.elevesinscrits_id);
                setModalVisible(false);
                setEditingManuel(null);
                Alert.alert('Succès', 'Manuel mis à jour avec succès.');
              } else {
                Alert.alert('Erreur', 'Impossible de mettre à jour le manuel.');
              }
            },
          );
        },
      );
    });
  };

  const handleDelete = id => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT uuid FROM manuelseleves WHERE id = ?',
        [id],
        (_, result) => {
          let uuid4 = result.rows.item(0)?.uuid || uuid.v4();
          tx.executeSql('DELETE FROM manuelseleves WHERE id = ?', [id], () => {
            tx.executeSql(
              'INSERT INTO sync_log (uuid, source, table_name, record_id, action) VALUES (?, ?, ?, ?, ?)',
              [uuid4, 'local', 'manuelseleves', id, 'delete'],
              () => fetchManuels(eleveInscritId),
            );
          });
        },
      );
    });
  };

  // ======================================
  // RENDER
  // ======================================
  return (
    <View style={styles.container}>
      {/* Boutons */}
      <View style={styles.buttonGroup}>
        <View style={styles.buttonWrapper}>
          <PaperButton onPress={() => navigation.goBack()}>Retour</PaperButton>
        </View>
        <View style={styles.buttonWrapper}>
          <PaperButton mode="contained" onPress={handleFinaliserRetour}>
            Finaliser ce retour de manuels
          </PaperButton>
        </View>
      </View>

      {/* Recherche */}
      <PaperTextInput
        mode="outlined"
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        left={<PaperTextInput.Icon icon="magnify" />}
      />

      {/* Nom élève */}
      {eleves.length > 0 && eleveInscritId && (
        <Text style={styles.eleveName}>
          {(() => {
            const e = eleves.find(el => el.id === eleveInscritId);
            return e ? `Élève : ${e.nomeleve} ${e.prenomseleve}` : '';
          })()}
        </Text>
      )}

      {/* Liste manuels */}
      <FlatList
        data={manuels
          .filter(m => m.elevesinscrits_id === eleveInscritId)
          .filter(
            m =>
              String(m.manuels_id).includes(search) ||
              String(m.exemplairemanuelseleve_id).includes(search),
          )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const monmanuel = mesManuels.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel?.titre || 'Inconnu';

          const exemplaire = stockmanuels.find(
            s => s.id === item.exemplairemanuelseleve_id,
          );
          const monexemplaire = exemplaire?.referenceexemplaire || 'Inconnu';

          const monetatremise =
            etatmanuels.find(s => s.id === item.etatmanuelsremiseeleve_id)
              ?.etatmanuel || 'Inconnu';
          const monetatretour =
            etatmanuels.find(s => s.id === item.etatmanuelsretoureleve_id)
              ?.etatmanuel || 'Inconnu';

          return (
            <View style={styles.card}>
              <Text style={styles.title}>Manuel: {libelleManuel}</Text>
              <Text style={styles.title}>Référence: {monexemplaire}</Text>
              <Text style={styles.title}>État Remise: {monetatremise}</Text>
              <Text style={styles.title}>État Retour: {monetatretour}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingManuel(item);
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
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text>Élève</Text>
            <CustomPicker
              label="Élève"
              items={eleves.map(eleve => ({
                label: `${eleve.matriculeeleve} - ${eleve.nomeleve} ${eleve.prenomseleve}`,
                value: eleve.id,
              }))}
              selectedId={formData.elevesinscrits_id}
              onValueChange={value =>
                setFormData({...formData, elevesinscrits_id: value})
              }
              isDisabled={isLocked}
            />

            <Text>Manuel</Text>
            <CustomPicker
              label="Manuel"
              items={mesManuels.map(mat => ({label: mat.titre, value: mat.id}))}
              selectedId={formData.manuels_id}
              onValueChange={value =>
                setFormData({...formData, manuels_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />

            <Text>Référence</Text>
            <CustomPicker
              label="Référence"
              items={stockmanuels.map(ex => ({
                label: ex.referenceexemplaire,
                value: ex.id,
              }))}
              selectedId={formData.exemplairemanuelseleve_id}
              onValueChange={value =>
                setFormData({...formData, exemplairemanuelseleve_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />

            <Text>État à la remise</Text>
            <CustomPicker
              label="État Remise"
              items={etatmanuels.map(etat => ({
                label: etat.etatmanuel,
                value: etat.id,
              }))}
              selectedId={formData.etatmanuelsremiseeleve_id}
              onValueChange={value =>
                setFormData({...formData, etatmanuelsremiseeleve_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />

            <Text>État au retour</Text>
            <CustomPicker
              label="État Retour"
              items={etatmanuels
                .filter(etat => [1, 2, 6].includes(etat.id))
                .map(etat => ({label: etat.etatmanuel, value: etat.id}))}
              selectedId={formData.etatmanuelsretoureleve_id}
              onValueChange={value =>
                setFormData({...formData, etatmanuelsretoureleve_id: value})
              }
              displayKey="label"
              valueKey="value"
            />

            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text>Rendu :</Text>
              <Switch
                value={formData?.rendu || false}
                onValueChange={value =>
                  setFormData({...formData, rendu: value})
                }
              />
            </View>

            <PaperButton mode="contained" onPress={handleSave}>
              Enregistrer
            </PaperButton>
            <PaperButton style={{marginTop: 8}} onPress={() => setModalVisible(false)}>
              Annuler
            </PaperButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#fff'},
  buttonGroup: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  buttonWrapper: {marginHorizontal: 5},
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    color: 'black',
  },
  eleveName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    padding: 15,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  title: {fontSize: 16, fontWeight: 'bold', marginBottom: 4},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8},
  actionIcon: {fontSize: 20},
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {backgroundColor: 'white', padding: 20, borderRadius: 10},
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    color: 'black',
  },
});

export default ManuelEleves;
