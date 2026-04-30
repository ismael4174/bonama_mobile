import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert} from 'react-native';
import {TextInput as PaperTextInput, Button as PaperButton} from 'react-native-paper';
import {db} from '../../db/database';
import uuid from 'react-native-uuid';
import CustomPicker from '../CustomPicker';

// Grille de pénalités : [état remise][état retour] → coefficient
// État 1 = Neuf, 2 = Bon état, 3 = Etat moyen, 4 = Mauvais état, 6 = Perdu
const GRILLE_PENALITES = {
  1: {1: 0, 2: 0, 3: 0.25},   // remise=Neuf: retour Neuf→0, Bon→0, Moyen→0.25, autre→1
  2: {1: 0, 2: 0, 3: 0},      // remise=Bon: retour Neuf→0, Bon→0, Moyen→0, autre→0.5
};
const PENALITE_DEFAULT = {1: 1, 2: 0.5};

const getPenaliteCoef = (etatRemise, etatRetour) => {
  const ligne = GRILLE_PENALITES[etatRemise];
  if (ligne && ligne[etatRetour] !== undefined) return ligne[etatRetour];
  return PENALITE_DEFAULT[etatRemise] ?? 0;
};

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

  useEffect(() => {
    fetchManuels(eleveInscritId);
    fetchData();
  }, [eleveInscritId]);

  const fetchData = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, referenceexemplaire FROM stockmanuels;',
        [],
        (_, results) => setStockmanuels(results.rows.raw()),
        error => console.log('Erreur chargement stockmanuels:', error),
      );
      tx.executeSql(
        'SELECT elevesinscrits.id, elevesinscrits.retourfinalise, eleves.matriculeeleve, eleves.nomeleve, eleves.prenomseleve FROM elevesinscrits JOIN eleves ON eleves.id = elevesinscrits.eleves_id;',
        [],
        (_, results) => {
          const rows = results.rows.raw();
          setEleves(rows);
          if (eleveInscritId) {
            const current = rows.find(e => e.id === eleveInscritId);
            if (current) {
              setIsLocked(current.retourfinalise === 1);
            }
          }
        },
        error => console.log('Erreur chargement eleves:', error),
      );
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => setMesManuels(results.rows.raw()),
        error => console.log('Erreur chargement manuels:', error),
      );
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels;',
        [],
        (_, results) => setEtatmanuels(results.rows.raw()),
        error => console.log('Erreur chargement etatmanuels:', error),
      );
    });
  };

  const fetchManuels = id => {
    if (!id) return;
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM manuelseleves WHERE elevesinscrits_id = ?',
        [id],
        (_, {rows}) => setManuels(rows.raw()),
        (_, error) => console.log('Erreur fetchManuels:', error),
      );
    });
  };

  // ======================================
  // FINALISER RETOUR
  // ======================================
  const handleFinaliserRetour = () => {
    if (isLocked) {
      Alert.alert('Info', 'Ce retour est déjà finalisé.');
      return;
    }
    db.transaction(tx => {
      // Compter les manuels effectivement remis (avec un exemplaire associé)
      tx.executeSql(
        'SELECT COUNT(*) as nbremanuelsremis FROM manuelseleves WHERE elevesinscrits_id = ? AND exemplairemanuelseleve_id IS NOT NULL',
        [eleveInscritId],
        (_, results) => {
          const nbremanuelsremis = results.rows.item(0).nbremanuelsremis;

          if (nbremanuelsremis === 0) {
            Alert.alert('Erreur', "Aucun manuel n'a été remis !");
            return;
          }

          // Compter les manuels remis sans état au retour renseigné
          tx.executeSql(
            'SELECT COUNT(*) as nbremanuelnonrenseigne FROM manuelseleves WHERE elevesinscrits_id = ? AND exemplairemanuelseleve_id IS NOT NULL AND etatmanuelsretoureleve_id IS NULL',
            [eleveInscritId],
            (_, results) => {
              const nbremanuelnonrenseigne =
                results.rows.item(0).nbremanuelnonrenseigne;

              if (nbremanuelnonrenseigne > 0) {
                Alert.alert(
                  'Avertissement',
                  `${nbremanuelnonrenseigne} manuel(s) n'ont pas été correctement renseigné(s). Veuillez vérifier les états au retour.`,
                );
                return;
              }

              // Tous les manuels remis ont un état au retour → calculer les pénalités
              tx.executeSql(
                'SELECT coutmanuel FROM parametrages WHERE id = 1',
                [],
                (_, resParam) => {
                  const coutmanuel = resParam.rows.item(0)?.coutmanuel || 0;

                  tx.executeSql(
                    `SELECT m.id, m.exemplairemanuelseleve_id,
                            m.etatmanuelsremiseeleve_id, m.etatmanuelsretoureleve_id
                     FROM manuelseleves m
                     WHERE m.elevesinscrits_id = ? AND m.exemplairemanuelseleve_id IS NOT NULL`,
                    [eleveInscritId],
                    (_, resManuels) => {
                      const rows = resManuels.rows.raw();
                      let totalPenalite = 0;

                      rows.forEach(m => {
                        const coef = getPenaliteCoef(
                          m.etatmanuelsremiseeleve_id,
                          m.etatmanuelsretoureleve_id,
                        );
                        const montant = coutmanuel * coef;
                        totalPenalite += montant;
                        const rendu = m.etatmanuelsretoureleve_id === 6 ? 0 : 1;

                        tx.executeSql(
                          'UPDATE manuelseleves SET montantpenalite = ?, rendu = ? WHERE id = ?',
                          [montant, rendu, m.id],
                        );

                        // Manuel perdu : ne pas remettre en stock disponible
                        if (m.etatmanuelsretoureleve_id === 6) {
                          tx.executeSql(
                            'UPDATE stockmanuels SET etatmanuels_id = ? WHERE id = ?',
                            [m.etatmanuelsretoureleve_id, m.exemplairemanuelseleve_id],
                          );
                        } else {
                          tx.executeSql(
                            'UPDATE stockmanuels SET statutmanules_id = 1, etatmanuels_id = ? WHERE id = ?',
                            [m.etatmanuelsretoureleve_id, m.exemplairemanuelseleve_id],
                          );
                        }
                      });

                      tx.executeSql(
                        'UPDATE elevesinscrits SET penalite = ? WHERE id = ?',
                        [totalPenalite, eleveInscritId],
                        () => {
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
                                    'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                                    [
                                      uuid1,
                                      'local',
                                      'elevesinscrits',
                                      eleveInscritId,
                                      'update',
                                      JSON.stringify({
                                        retourfinalise: 1,
                                        penalite: totalPenalite,
                                      }),
                                    ],
                                    () => {
                                      Alert.alert('Succès', 'Le retour a été finalisé.');
                                      navigation.goBack();
                                    },
                                  );
                                },
                              );
                            },
                          );
                        },
                      );
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  };

  // ======================================
  // SAVE / UPDATE MANUEL
  // ======================================
  const handleSave = () => {
    if (!formData.manuels_id || !formData.elevesinscrits_id) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    // Validation : l'état au retour ne peut pas être meilleur qu'à la remise
    if (formData.etatmanuelsretoureleve_id && formData.etatmanuelsremiseeleve_id) {
      if (
        Number(formData.etatmanuelsretoureleve_id) <
        Number(formData.etatmanuelsremiseeleve_id)
      ) {
        Alert.alert(
          'Erreur',
          "Le manuel ne saurait être retourné dans un état meilleur qu'à la remise !",
        );
        return;
      }
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
            [newUuid, 'local', 'manuelseleves', insertId, 'insert', JSON.stringify(data)],
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
                  [uuid3, 'local', 'manuelseleves', data.id, 'update', JSON.stringify(data)],
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

  // ======================================
  // RENDER
  // ======================================
  return (
    <View style={styles.container}>
      {/* Boutons */}
      <View style={styles.buttonGroup}>
        <View style={styles.buttonWrapper}>
          <PaperButton onPress={() => navigation.goBack()}>Précédent</PaperButton>
        </View>
        {!isLocked && (
          <View style={styles.buttonWrapper}>
            <PaperButton mode="contained" onPress={handleFinaliserRetour}>
              Finaliser ce retour de manuels
            </PaperButton>
          </View>
        )}
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

      {isLocked && (
        <Text style={styles.lockedBanner}>Retour déjà finalisé — consultation uniquement</Text>
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
          const monexemplaire = exemplaire?.referenceexemplaire || '—';

          const monetatremise =
            etatmanuels.find(s => s.id === item.etatmanuelsremiseeleve_id)
              ?.etatmanuel || 'Inconnu';
          const monetatretour =
            etatmanuels.find(s => s.id === item.etatmanuelsretoureleve_id)
              ?.etatmanuel || 'Non renseigné';

          return (
            <View style={styles.card}>
              <Text style={styles.title}>Manuel : {libelleManuel}</Text>
              <Text style={styles.subtitle}>Référence : {monexemplaire}</Text>
              <Text style={styles.subtitle}>État à la remise : {monetatremise}</Text>
              <Text
                style={[
                  styles.subtitle,
                  !item.etatmanuelsretoureleve_id && styles.nonRenseigne,
                ]}>
                État au retour : {monetatretour}
              </Text>

              <View style={styles.actions}>
                {!isLocked && item.exemplairemanuelseleve_id && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingManuel(item);
                      setFormData({
                        id: item.id,
                        manuels_id: item.manuels_id ?? '',
                        elevesinscrits_id: item.elevesinscrits_id ?? '',
                        exemplairemanuelseleve_id: item.exemplairemanuelseleve_id ?? '',
                        etatmanuelsremiseeleve_id: item.etatmanuelsremiseeleve_id ?? '',
                        etatmanuelsretoureleve_id: item.etatmanuelsretoureleve_id ?? '',
                        montantpenalite: item.montantpenalite ?? '',
                        rendu: item.rendu === 1,
                      });
                      setModalVisible(true);
                    }}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal saisie état au retour */}
      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Retour du manuel</Text>

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
              isDisabled={true}
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
              isDisabled={true}
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
              isDisabled={true}
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
              isDisabled={true}
            />

            {/* États au retour disponibles : 1-Neuf, 2-Bon, 3-Moyen, 4-Mauvais, 6-Perdu */}
            <Text>État au retour</Text>
            <CustomPicker
              label="État au Retour"
              items={etatmanuels
                .filter(etat => [1, 2, 3, 4, 6].includes(etat.id))
                .map(etat => ({label: etat.etatmanuel, value: etat.id}))}
              placeholder="Sélectionner un état"
              selectedId={formData.etatmanuelsretoureleve_id}
              onValueChange={value =>
                setFormData({...formData, etatmanuelsretoureleve_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />

            <PaperButton mode="contained" onPress={handleSave} style={{marginTop: 12}}>
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
    marginBottom: 6,
    textAlign: 'center',
  },
  lockedBanner: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 10,
    fontSize: 13,
  },
  card: {
    padding: 15,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  title: {fontSize: 16, fontWeight: 'bold', marginBottom: 4},
  subtitle: {fontSize: 14, marginBottom: 2},
  nonRenseigne: {color: 'orange', fontStyle: 'italic'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8},
  actionIcon: {fontSize: 20},
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {backgroundColor: 'white', padding: 20, borderRadius: 10, margin: 16},
  modalTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center'},
});

export default ManuelEleves;
