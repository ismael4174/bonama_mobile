import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Button,
  Modal,
  Alert,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
//import {db} from '../../db/database';
import {db} from '../../db/database.js';
import {addSyncLog} from '../../db/sync_log.js';
import {checkConnection} from '../../db/network.js';
import API_URL from '../../api/urldeconnexion.js';
import CustomPicker from '../CustomPicker';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const StockManuels = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [etablissement, setEtablissement] = useState('');
  const [manuel, setManuel] = useState('');
  const [etablissements, setEtablissements] = useState([]);
  const [manuels, setManuels] = useState([]);
  const [statut, setStatut] = useState('');
  const [etatmanuel, setEtatmanuel] = useState('');
  const [statuts, setStatuts] = useState([]);
  const [etatmanuels, setEtatmanuels] = useState([]);
  const etablissementsID = parseInt(useEtablissementId(), 10);

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
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM stockmanuels WHERE etablissements_id=?',
        [etablissementsID],
        (_, {rows}) => {
          setData(rows.raw());
        },
      );
    });
  };

  const addOrUpdateItem = () => {
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
  };

  const deleteItem = id => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM stockmanuels WHERE id=?', [id], () =>
        fetchData(),
      );
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="black"
        style={styles.searchInput}
      />
      {/*} <Button
        title="Ajouter"
        onPress={() => {
          setCurrentItem({});
          setModalVisible(true);
        }}
        color="#007bff"
      />*/}
      <FlatList
        data={data.filter(item => item.referenceexemplaire.includes(search))}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          // Trouver le libellé du manuel correspondant
          const monetablissement = etablissements.find(
            e => e.id === item.etablissements_id,
          );
          // console.log('etab:', monetablissement);
          const nometablissement = monetablissement
            ? monetablissement.nometablissement
            : 'Inconnu';

          // Trouver le libellé du statut correspondant
          const monstatut = statuts.find(s => s.id === item.statutmanules_id);
          const libellestatut = monstatut ? monstatut.statut : 'Inconnu';

          // Trouver le libellé de l'établissement correspondant
          const monmanuel = manuels.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel ? monmanuel.titre : 'Inconnu';

          // Trouver le libellé de l'état du manuel correspondant
          const monetatmanuel = etatmanuels.find(
            et => et.id === item.etatmanuels_id,
          );
          const libelleetatmanuel = monetatmanuel
            ? monetatmanuel.etatmanuel
            : 'Inconnu';

          return (
            <View style={styles.card}>
              {/*<Text style={styles.title}>Etablissement:{nometablissement}</Text>*/}
              <Text style={styles.title}>Manuel:{libelleManuel}</Text>
              <Text style={styles.title}>Ref:{item.referenceexemplaire}</Text>
              <Text style={styles.title}>Statut:{libellestatut}</Text>
              <Text style={styles.title}>Etat:{libelleetatmanuel}</Text>
              {/*<View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentItem(item);
                    setModalVisible(true);
                  }}>
                  <Text style={{fontSize: 20}}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id)}>
                  <Text style={{fontSize: 20}}>🗑️</Text>
                </TouchableOpacity>
              </View>*/}
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={{padding: 20}}>
          {/*<Text>Etablissement:</Text>
          <CustomPicker
            items={etablissements.map(etab => ({
              label: etab.nometablissement,
              value: etab.id,
            }))}
            selectedId={etablissement}
            // onValueChange={setEtablissement}
            onValueChange={value => {
              setEtablissement(value);
              setCurrentItem({...currentItem, etablissements_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />*/}

          {/* <TextInput
            placeholder="Etablissement ID"
            value={currentItem?.etablissements_id?.toString() || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, etablissements_id: text})
            }
            style={styles.input}
          />*/}
          <Text>Manuel:</Text>
          <CustomPicker
            items={manuels.map(man => ({
              label: man.titre,
              value: man.id,
            }))}
            selectedId={manuel}
            //onValueChange={setManuel}
            onValueChange={value => {
              setManuel(value);
              setCurrentItem({...currentItem, manuels_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />
          {/*<TextInput
            placeholder="Manuels ID"
            value={currentItem?.manuels_id?.toString() || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, manuels_id: text})
            }
            style={styles.input}
          />*/}
          <Text>Reference:</Text>
          <TextInput
            placeholder="Référence"
            value={currentItem?.referenceexemplaire || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, referenceexemplaire: text})
            }
            style={styles.input}
          />
          <Text>Statut:</Text>
          <CustomPicker
            items={statuts.map(sta => ({
              label: sta.statut,
              value: sta.id,
            }))}
            selectedId={statut}
            //onValueChange={setStatut}
            onValueChange={value => {
              setStatut(value);
              setCurrentItem({...currentItem, statutmanules_id: value});
            }}
            displayKey="label"
            valueKey="value"
          />
          {/* <TextInput
            placeholder="Statut"
            value={currentItem?.statutmanules_id?.toString() || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, statutmanules_id: text})
            }
            style={styles.input}
          />*/}
          <Text>Etat:</Text>
          <CustomPicker
            items={etatmanuels.map(eta => ({
              label: eta.etatmanuel,
              value: eta.id,
            }))}
            selectedId={etatmanuel}
            onValueChange={value => {
              setEtatmanuel(value);
              setCurrentItem({...currentItem, etatmanuels_id: value});
            }}
            //onValueChange={setEtatmanuel}

            displayKey="label"
            valueKey="value"
          />
          {/*<TextInput
            placeholder="Etat"
            value={currentItem?.etatmanuels_id?.toString() || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, etatmanuels_id: text})
            }
            style={styles.input}
          />*/}
          <View>
            <Button title="Enregistrer" onPress={addOrUpdateItem} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default StockManuels;
