import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Modal, Alert} from 'react-native';
import {TextInput as PaperTextInput, List, Divider, Button as PaperButton} from 'react-native-paper';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import SQLite from 'react-native-sqlite-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import API_URL from '../../api/urldeconnexion.js';
import CustomPicker from '../CustomPicker';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const ManuelRetrouve = () => {
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

  //const anneescolairesID = parseInt(UseAnneescolairesID(), 10);
  const etablissementsID = parseInt(useEtablissementId(), 10);

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
  }, [etablissementsID]);
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
          'SELECT * FROM stockmanuels WHERE etablissements_id = ?',
          [etablissementsID],
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
      <PaperTextInput
        mode="outlined"
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        left={<PaperTextInput.Icon icon="magnify" />}
        style={styles.searchInput}
        accessibilityLabel="Recherche"
        accessibilityHint="Filtrer la liste des manuels"
      />

      <FlatList
        data={data.filter(item => item.referenceexemplaire.includes(search))}
        keyExtractor={item => `${item.id}-${item.referenceexemplaire}`}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<EmptyState title="Aucun manuel retrouvé" subtitle="Ajustez la recherche pour voir des résultats" />}
        renderItem={({item}) => {
          const {
            referenceexemplaire,
            etablissements_id,
            statutmanules_id,
            manuels_id,
            etatmanuels_id,
            manuelseleves = [],
            manuelsues = [],
          } = item;

          const nometablissement =
            etablissements.find(e => e.id === etablissements_id)
              ?.nometablissement || 'Inconnu';
          const libellestatut =
            statuts.find(s => s.id === statutmanules_id)?.statut || 'Inconnu';
          const libelleManuel =
            manuels.find(m => m.id === manuels_id)?.titre || 'Inconnu';
          const libelleetatmanuel =
            etatmanuels.find(e => e.id === etatmanuels_id)?.etatmanuel ||
            'Inconnu';

          return (
            <List.Item
              title={`Manuel: ${libelleManuel}`}
              titleNumberOfLines={3}
              titleEllipsizeMode="tail"
              description={() => (
                <View>
                  <Text style={styles.desc}>Ref: {referenceexemplaire}</Text>
                  <Text style={styles.desc}>Statut: {libellestatut}</Text>
                  <Text style={styles.desc}>État: {libelleetatmanuel}</Text>
                </View>
              )}
              left={props => <List.Icon {...props} icon="book" />}
              right={props => (
                <TouchableOpacity
                  onPress={() => {
                    setCurrentItem(item);
                    setModalVisible(true);
                  }}
                  style={{paddingHorizontal: 12, justifyContent: 'center'}}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier le manuel ${libelleManuel}, référence ${referenceexemplaire}`}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
              accessibilityLabel={`Manuel ${libelleManuel}, référence ${referenceexemplaire}, statut ${libellestatut}, état ${libelleetatmanuel}`}
            />
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text>Manuel :</Text>
          <CustomPicker
            items={manuels.map(m => ({label: m.titre, value: m.id}))}
            selectedId={manuel}
            onValueChange={value => {
              setManuel(value);
              setCurrentItem(prev => ({...prev, manuels_id: value}));
            }}
            displayKey="label"
            valueKey="value"
          />

          <Text>Référence :</Text>
          <PaperTextInput
            mode="outlined"
            placeholder="Référence"
            value={currentItem?.referenceexemplaire || ''}
            onChangeText={text =>
              setCurrentItem(prev => ({...prev, referenceexemplaire: text}))
            }
            style={{marginBottom: 8}}
          />

          <Text>Statut :</Text>
          <CustomPicker
            items={statuts.map(s => ({label: s.statut, value: s.id}))}
            selectedId={statut}
            onValueChange={value => {
              setStatut(value);
              setCurrentItem(prev => ({...prev, statutmanules_id: value}));
            }}
            displayKey="label"
            valueKey="value"
          />

          <Text>État :</Text>
          <CustomPicker
            items={etatmanuels.map(e => ({label: e.etatmanuel, value: e.id}))}
            selectedId={etatmanuel}
            onValueChange={value => {
              setEtatmanuel(value);
              setCurrentItem(prev => ({...prev, etatmanuels_id: value}));
            }}
            displayKey="label"
            valueKey="value"
          />

          <View style={styles.section}>
            <Text>Manuels Élèves :</Text>
            {currentItem?.manuelseleves?.map((eleve, i) => (
              <View key={i} style={styles.subCard}>
                <Text>Manuel ID :</Text>
                <PaperTextInput
                  mode="outlined"
                  value={eleve.manuels_id?.toString() || ''}
                  onChangeText={text =>
                    handleManuelEleveChange(i, 'manuels_id', text)
                  }
                  keyboardType="numeric"
                  style={{marginBottom: 8}}
                />
                <Text>Couverture :</Text>
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

          <View style={styles.section}>
            <Text>Manuels UES :</Text>
            {currentItem?.manuelsues?.map((ues, i) => (
              <View key={i} style={styles.subCard}>
                <Text>Commandes UES ID :</Text>
                <PaperTextInput
                  mode="outlined"
                  value={ues.commandesues_id?.toString() || ''}
                  onChangeText={text =>
                    handleManuelUesChange(i, 'commandesues_id', text)
                  }
                  keyboardType="numeric"
                  style={{marginBottom: 8}}
                />
                <Text>Manuel ID :</Text>
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

          <PaperButton onPress={() => setModalVisible(false)}>RETOUR</PaperButton>
        </View>
      </Modal>
      </>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  searchInput: {
    marginBottom: 10,
  },
  card: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  desc: {fontSize: 14, marginTop: 2},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editIcon: {
    fontSize: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    color: 'black',
  },
  modalContent: {
    padding: 20,
    backgroundColor: 'white',
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  subCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
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
});*/

export default ManuelRetrouve;
