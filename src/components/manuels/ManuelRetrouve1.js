import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert} from 'react-native';
import {TextInput as PaperTextInput, Button as PaperButton} from 'react-native-paper';
import SQLite from 'react-native-sqlite-storage';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import API_URL from '../../api/urldeconnexion.js';
import CustomPicker from '../CustomPicker';
//import AsyncStorage from '@react-native-async-storage/async-storage';
//import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';

import UseDrenaId from '../../parametres/drena.js';

/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const ManuelRetrouve1 = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  //const [currentItem, setCurrentItem] = useState(null);
  const [etablissement, setEtablissement] = useState('');
  const [manuel, setManuel] = useState('');
  const [etablissements, setEtablissements] = useState([]);
  const [manuels, setManuels] = useState([]);
  const [statut, setStatut] = useState('');
  const [etatmanuel, setEtatmanuel] = useState('');
  const [statuts, setStatuts] = useState([]);
  const [etatmanuels, setEtatmanuels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedManuelId, setSelectedManuelId] = useState(null);
  const [assignationsEleves, setAssignationsEleves] = useState([]);
  const [assignationsUes, setAssignationsUes] = useState([]);
  //const anneescolairesID = parseInt(UseAnneescolairesID(), 10);
  const drenasID = parseInt(UseDrenaId(), 10);
  ///////////////////////////////////////////
  const [currentItem, setCurrentItem] = useState({
    manuelseleves: [],
    manuelsues: [],
  });

  // Fonctions pour gérer manuelseleves
  const addManuelEleve = () => {
    setCurrentItem({
      ...currentItem,
      manuelseleves: [...(currentItem.manuelseleves || []), {}],
    });
  };

  const removeManuelEleve = index => {
    setCurrentItem({
      ...currentItem,
      manuelseleves: currentItem.manuelseleves.filter((_, i) => i !== index),
    });
  };

  const handleManuelEleveChange = (index, field, value) => {
    const updatedManuelEleves = currentItem.manuelseleves.map((eleve, i) =>
      i === index ? {...eleve, [field]: value} : eleve,
    );
    setCurrentItem({...currentItem, manuelseleves: updatedManuelEleves});
  };

  // Fonctions pour gérer manuelsues
  const addManuelUes = () => {
    setCurrentItem({
      ...currentItem,
      manuelsues: [...(currentItem.manuelsues || []), {}],
    });
  };

  const removeManuelUes = index => {
    setCurrentItem({
      ...currentItem,
      manuelsues: currentItem.manuelsues.filter((_, i) => i !== index),
    });
  };

  const handleManuelUesChange = (index, field, value) => {
    const updatedManuelUes = currentItem.manuelsues.map((ues, i) =>
      i === index ? {...ues, [field]: value} : ues,
    );
    setCurrentItem({...currentItem, manuelsues: updatedManuelUes});
  };

  //////////////////////////////////////

  useEffect(() => {
    fetchData();
  }, [drenasID]);
  useEffect(() => {
    if (currentItem) {
      setEtablissement(currentItem.etablissements_id || '');
      setManuel(currentItem.manuels_id || '');
      setStatut(currentItem.statutmanules_id || '');
      setEtatmanuel(currentItem.etatmanuels_id || '');
    }
  }, [currentItem]);
  useEffect(() => {
    // Récupérer les établissements
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, nometablissement FROM etablissements;',
        [],
        (_, results) => {
          let rows = results.rows.raw(); // Convertit en tableau d'objets
          setEtablissements(rows);
        },
        error =>
          console.log('Erreur lors du chargement des établissements', error),
      );
    });
    // Récupérer les manuels
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => {
          let rows = results.rows.raw(); // Convertit en tableau d'objets
          setManuels(rows);
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
    });

    // Récupérer les statuts
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, statut FROM statutmanules;',
        [],
        (_, results) => {
          let rows = results.rows.raw();
          setStatuts(rows);
        },
        error => console.log('Erreur lors du chargement des statuts', error),
      );
    });
    // Récupérer les états des manuels
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels;',
        [],
        (_, results) => {
          let rows = results.rows.raw();
          setEtatmanuels(rows);
        },
        error =>
          console.log('Erreur lors du chargement des etats manuels', error),
      );
    });
  }, []);

  const fetchData = () => {
    setError('');
    setLoading(true);
    db.transaction(
      tx => {
        tx.executeSql(
          'SELECT stockmanuels.*, etablissements.nometablissement AS nometablissement FROM stockmanuels JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id WHERE etablissements.drenas_id = ?',
          [drenasID],
          (_, {rows}) => {
            setData(rows.raw());
            setLoading(false);
          },
          (_, err) => {
            setError('Impossible de charger les manuels retrouvés.');
            setLoading(false);
            return false;
          },
        );

        tx.executeSql(
          `SELECT
             sto.id AS stock_id,
             ei.id AS elevesinscrits_id,
             e.matriculeeleve,
             e.nomeleve,
             e.prenomseleve
           FROM manuelseleves me
           JOIN stockmanuels sto ON sto.id = me.exemplairemanuelseleve_id
           JOIN elevesinscrits ei ON ei.id = me.elevesinscrits_id
           JOIN eleves e ON e.id = ei.eleves_id;`,
          [],
          (_, {rows}) => setAssignationsEleves(rows.raw()),
        );

        tx.executeSql(
          `SELECT
             sto.id AS stock_id,
             c.id AS commandesues_id,
             u.denominationue
           FROM manuelsues mu
           JOIN stockmanuels sto ON sto.id = mu.exemplairemanuels_id
           JOIN commandesues c ON c.id = mu.commandesues_id
           JOIN ues u ON u.id = c.ues_id;`,
          [],
          (_, {rows}) => setAssignationsUes(rows.raw()),
        );
      },
      err => {
        setError('Erreur de transaction lors du chargement.');
        setLoading(false);
      },
    );
  };
  const addOrUpdateItem = () => {
    db.transaction(tx => {
      if (currentItem.id) {
        // Mise à jour de stockmanuels
        tx.executeSql(
          'UPDATE stockmanuels SET etablissements_id=?, manuels_id=?, destinatairemanuels_id=?, statutmanules_id=?, etatmanuels_id=?, referenceexemplaire=? WHERE id=?',
          [
            currentItem.etablissements_id,
            currentItem.manuels_id,
            currentItem.destinatairemanuels_id,
            currentItem.statutmanules_id,
            currentItem.etatmanuels_id,
            currentItem.referenceexemplaire,
            currentItem.id,
          ],
          () => {
            // Supprimer les enregistrements existants dans manuelseleves et manuelsues
            tx.executeSql(
              'DELETE FROM manuelseleves WHERE exemplairemanuelseleve_id=?',
              [currentItem.id],
            );
            tx.executeSql(
              'DELETE FROM manuelsues WHERE exemplairemanuels_id=?',
              [currentItem.id],
            );

            // Insertion de manuelseleves
            currentItem.manuelseleves.forEach(eleve => {
              tx.executeSql(
                'INSERT INTO manuelseleves (manuels_id, exemplairemanuelseleve_id, couverture, elevesinscrits_id, etatmanuelsremiseeleve_id, rendu, etatmanuelsretoureleve_id, montantpenalite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  eleve.manuels_id,
                  currentItem.id, // exemplairemanuelseleve_id = stockmanuels.id
                  eleve.couverture,
                  eleve.elevesinscrits_id,
                  eleve.etatmanuelsremiseeleve_id,
                  eleve.rendu,
                  eleve.etatmanuelsretoureleve_id,
                  eleve.montantpenalite,
                ],
              );
            });

            // Insertion de manuelsues
            currentItem.manuelsues.forEach(ues => {
              tx.executeSql(
                'INSERT INTO manuelsues (commandesues_id, manuels_id, exemplairemanuels_id, etatmanuelsalaremise_id, etatmanuelsauretour_id, rendu) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  ues.commandesues_id,
                  ues.manuels_id,
                  currentItem.id, // exemplairemanuels_id = stockmanuels.id
                  ues.etatmanuelsalaremise_id,
                  ues.etatmanuelsauretour_id,
                  ues.rendu,
                ],
              );
            });
            fetchData();
          },
        );
      } else {
        // Insertion de stockmanuels
        tx.executeSql(
          'INSERT INTO stockmanuels (etablissements_id, manuels_id, destinatairemanuels_id, statutmanules_id, etatmanuels_id, referenceexemplaire) VALUES (?, ?, ?, ?, ?, ?)',
          [
            currentItem.etablissements_id,
            currentItem.manuels_id,
            currentItem.destinatairemanuels_id,
            currentItem.statutmanules_id,
            currentItem.etatmanuels_id,
            currentItem.referenceexemplaire,
          ],
          (_, results) => {
            const newStockmanuelsId = results.insertId;

            // Insertion de manuelseleves
            currentItem.manuelseleves.forEach(eleve => {
              tx.executeSql(
                'INSERT INTO manuelseleves (manuels_id, exemplairemanuelseleve_id, couverture, elevesinscrits_id, etatmanuelsremiseeleve_id, rendu, etatmanuelsretoureleve_id, montantpenalite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  eleve.manuels_id,
                  newStockmanuelsId, // exemplairemanuelseleve_id = stockmanuels.id
                  eleve.couverture,
                  eleve.elevesinscrits_id,
                  eleve.etatmanuelsremiseeleve_id,
                  eleve.rendu,
                  eleve.etatmanuelsretoureleve_id,
                  eleve.montantpenalite,
                ],
              );
            });

            // Insertion de manuelsues
            currentItem.manuelsues.forEach(ues => {
              tx.executeSql(
                'INSERT INTO manuelsues (commandesues_id, manuels_id, exemplairemanuels_id, etatmanuelsalaremise_id, etatmanuelsauretour_id, rendu) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  ues.commandesues_id,
                  ues.manuels_id,
                  newStockmanuelsId, // exemplairemanuels_id = stockmanuels.id
                  ues.etatmanuelsalaremise_id,
                  ues.etatmanuelsauretour_id,
                  ues.rendu,
                ],
              );
            });
            fetchData();
          },
        );
      }
      setModalVisible(false);
      setCurrentItem({});
    });
  };
  /*const addOrUpdateItem = () => {
    if (currentItem.id) {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE stockmanuels SET etablissements_id=?, manuels_id=?, destinatairemanuels_id=?, statutmanules_id=?, etatmanuels_id=?, referenceexemplaire=? WHERE id=?',
          [
            currentItem.etablissements_id,
            currentItem.manuels_id,
            currentItem.destinatairemanuels_id,
            currentItem.statutmanules_id,
            currentItem.etatmanuels_id,
            currentItem.referenceexemplaire,
            currentItem.id,
          ],
          () => fetchData(),
        );
      });
    } else {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO stockmanuels (etablissements_id, manuels_id, destinatairemanuels_id, statutmanules_id, etatmanuels_id, referenceexemplaire) VALUES (?, ?, ?, ?, ?, ?)',
          [
            currentItem.etablissements_id,
            currentItem.manuels_id,
            currentItem.destinatairemanuels_id,
            currentItem.statutmanules_id,
            currentItem.etatmanuels_id,
            currentItem.referenceexemplaire,
          ],
          () => fetchData(),
        );
      });
    }
    setModalVisible(false);
    setCurrentItem(null);
  };*/

  const deleteItem = id => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM stockmanuels WHERE id=?', [id], () =>
        fetchData(),
      );
    });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingState label="Chargement des manuels retrouvés..." />
      ) : error ? (
        <ErrorState subtitle={error} onAction={fetchData} />
      ) : (
        <>
      <CustomPicker
        label="Matière"
        items={manuels.map(m => ({label: m.titre, value: m.id}))}
        selectedId={selectedManuelId}
        onValueChange={value => setSelectedManuelId(value)}
        displayKey="label"
        valueKey="value"
      />

      <PaperTextInput
        mode="outlined"
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        left={<PaperTextInput.Icon icon="magnify" />}
        accessibilityLabel="Recherche"
        accessibilityHint="Filtrer la liste des manuels"
      />

      <FlatList
        data={data.filter(item => {
          const manuelMatch = selectedManuelId
            ? Number(item.manuels_id) === Number(selectedManuelId)
            : true;

          const q = (search || '').toLowerCase();
          if (!q) {
            return manuelMatch;
          }

          const ref = (item.referenceexemplaire || '').toLowerCase();
          const statutLabel = (
            statuts.find(s => s.id === item.statutmanules_id)?.statut || ''
          ).toLowerCase();
          const manuelLabel = (
            manuels.find(m => m.id === item.manuels_id)?.titre || ''
          ).toLowerCase();
          const etatLabel = (
            etatmanuels.find(e => e.id === item.etatmanuels_id)?.etatmanuel || ''
          ).toLowerCase();

          const searchMatch =
            ref.includes(q) ||
            statutLabel.includes(q) ||
            manuelLabel.includes(q) ||
            etatLabel.includes(q);

          return manuelMatch && searchMatch;
        })}
        keyExtractor={item => `${item.id}-${item.referenceexemplaire}`}
        contentContainerStyle={{paddingBottom: 24}}
        ListEmptyComponent={<EmptyState title="Aucun manuel retrouvé" subtitle="Modifiez la recherche pour voir des résultats" />}
        renderItem={({item}) => {
          const findLabel = (list, id, key) =>
            list.find(el => el.id === id)?.[key] || 'Inconnu';

          const libelleManuel = findLabel(manuels, item.manuels_id, 'titre');
          const libelleStatut = findLabel(
            statuts,
            item.statutmanules_id,
            'statut',
          );
          const libelleEtat = findLabel(
            etatmanuels,
            item.etatmanuels_id,
            'etatmanuel',
          );

          const affectationsEleves = assignationsEleves.filter(
            a => a.stock_id === item.id,
          );
          const affectationsUes = assignationsUes.filter(
            a => a.stock_id === item.id,
          );

          let affectationLabel = '';
          if (affectationsEleves.length > 0) {
            const a = affectationsEleves[0];
            affectationLabel = `${a.matriculeeleve} - ${a.nomeleve} ${a.prenomseleve}`;
          } else if (affectationsUes.length > 0) {
            const u = affectationsUes[0];
            affectationLabel = u.denominationue;
          }

          return (
            <View
              style={styles.card}
              accessible
              accessibilityLabel={`Manuel ${libelleManuel}, référence ${item.referenceexemplaire}, statut ${libelleStatut}, état ${libelleEtat}`}
              >
              <Text style={styles.title}>Manuel: {libelleManuel}</Text>
              <Text style={styles.title}>Ref: {item.referenceexemplaire}</Text>
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      Number(item.statutmanules_id) === 1 ? '#2e7d32' : '#d32f2f',
                  },
                ]}
              >
                Statut: {libelleStatut}
              </Text>
              <Text style={styles.title}>État: {libelleEtat}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    // Charger l'élément courant et ses affectations détaillées
                    setCurrentItem({
                      ...item,
                      manuelseleves: [],
                      manuelsues: [],
                    });

                    db.transaction(tx => {
                      tx.executeSql(
                        'SELECT * FROM manuelseleves WHERE exemplairemanuelseleve_id = ?;',
                        [item.id],
                        (_, res1) => {
                          const elevesRows = res1.rows.raw();
                          setCurrentItem(prev => ({
                            ...prev,
                            manuelseleves: elevesRows,
                          }));
                        },
                      );

                      tx.executeSql(
                        'SELECT * FROM manuelsues WHERE exemplairemanuels_id = ?;',
                        [item.id],
                        (_, res2) => {
                          const uesRows = res2.rows.raw();
                          setCurrentItem(prev => ({
                            ...prev,
                            manuelsues: uesRows,
                          }));
                        },
                      );
                    });

                    setModalVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir les détails du manuel ${libelleManuel}, référence ${item.referenceexemplaire}`}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon name="visibility" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Text>Manuel:</Text>
          <CustomPicker
            items={manuels.map(m => ({label: m.titre, value: m.id}))}
            selectedId={manuel}
            onValueChange={value => {
              setManuel(value);
              setCurrentItem({...currentItem, manuels_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />

          <Text>Référence:</Text>
          <PaperTextInput
            mode="outlined"
            placeholder="Référence"
            value={currentItem?.referenceexemplaire || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, referenceexemplaire: text})
            }
            style={styles.input}
          />

          <Text>Statut:</Text>
          <CustomPicker
            items={statuts.map(s => ({label: s.statut, value: s.id}))}
            selectedId={statut}
            onValueChange={value => {
              setStatut(value);
              setCurrentItem({...currentItem, statutmanules_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />

          <Text>État:</Text>
          <CustomPicker
            items={etatmanuels.map(e => ({label: e.etatmanuel, value: e.id}))}
            selectedId={etatmanuel}
            onValueChange={value => {
              setEtatmanuel(value);
              setCurrentItem({...currentItem, etatmanuels_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />

          {/* Manuels Élèves */}
          {/* {currentItem?.manuelseleves?.length > 0 && (
            <View style={styles.section}>
              <Text>Manuels Élèves:</Text>
              {currentItem.manuelseleves.map((eleve, i) => (
                <View key={i} style={styles.subCard}>
                  <Text>Manuel ID:</Text>
                  <PaperTextInput
                    mode="outlined"
                    value={eleve.manuels_id?.toString() || ''}
                    onChangeText={text =>
                      handleManuelEleveChange(i, 'manuels_id', text)
                    }
                    keyboardType="numeric"
                    style={{marginBottom: 8}}
                  />
                  <Text>Couverture:</Text>
                  <PaperTextInput
                    mode="outlined"
                    value={eleve.couverture || ''}
                    onChangeText={text =>
                      handleManuelEleveChange(i, 'couverture', text)
                    }
                    style={{marginBottom: 8}}
                  />
                </View>
              ))}
            </View>
          )} */}

          {/* Manuels UES */}
          {/* {currentItem?.manuelsues?.length > 0 && (
            <View style={styles.section}>
              <Text>Manuels UES:</Text>
              {currentItem.manuelsues.map((ues, i) => (
                <View key={i} style={styles.subCard}>
                  <Text>Commandes UES ID:</Text>
                  <PaperTextInput
                    mode="outlined"
                    value={ues.commandesues_id?.toString() || ''}
                    onChangeText={text =>
                      handleManuelUesChange(i, 'commandesues_id', text)
                    }
                    keyboardType="numeric"
                    style={{marginBottom: 8}}
                  />
                  <Text>Manuels ID:</Text>
                  <PaperTextInput
                    mode="outlined"
                    value={ues.manuels_id?.toString() || ''}
                    onChangeText={text =>
                      handleManuelUesChange(i, 'manuels_id', text)
                    }
                    keyboardType="numeric"
                    style={{marginBottom: 8}}
                  />
                </View>
              ))}
            </View>
          )} */}

          {currentItem?.id && (
            <View style={styles.section}>
              <Text style={{fontWeight: 'bold', marginBottom: 4}}>
                Informations d'attribution
              </Text>
              {assignationsEleves
                .filter(a => a.stock_id === currentItem.id)
                .map((a, idx) => (
                  <Text key={`eleve-${idx}`} style={styles.input}>
                    Élève: {a.matriculeeleve} - {a.nomeleve} {a.prenomseleve}
                    {currentItem.nometablissement
                      ? ` - ${currentItem.nometablissement}`
                      : ''}
                  </Text>
                ))}
              {assignationsUes
                .filter(a => a.stock_id === currentItem.id)
                .map((u, idx) => (
                  <Text key={`ce-${idx}`} style={styles.input}>
                    {u.denominationue}
                    {currentItem.nometablissement
                      ? ` - ${currentItem.nometablissement}`
                      : ''}
                  </Text>
                ))}
              {assignationsEleves.filter(a => a.stock_id === currentItem.id)
                .length === 0 &&
              assignationsUes.filter(a => a.stock_id === currentItem.id).length ===
                0 ? (
                <Text style={styles.input}>Aucune attribution trouvée.</Text>
              ) : null}
            </View>
          )}

          <PaperButton onPress={() => setModalVisible(false)}>Retour</PaperButton>
        </View>
      </Modal>
      </>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    color: 'black',
    borderRadius: 5,
  },
  card: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modal: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  // input: {
  //   height: 40,
  //   borderColor: 'gray',
  //   borderWidth: 1,
  //   marginBottom: 10,
  //   paddingHorizontal: 8,
  //   borderRadius: 5,
  //   color: 'black',
  // },
  section: {
    marginTop: 20,
  },
  subCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
  },
});

/*const styles = StyleSheet.create({
  container: {padding: 10},
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    color: 'black',
  },
  card: {padding: 15, margin: 10, backgroundColor: '#eee', borderRadius: 10},
  title: {fontSize: 18, fontWeight: 'bold'},
  actions: {flexDirection: 'row', justifyContent: 'space-between'},
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
    color: 'black',
  },
});
*/
export default ManuelRetrouve1;
