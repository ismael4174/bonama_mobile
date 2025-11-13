import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Modal, Alert} from 'react-native';
import {TextInput as PaperTextInput, List, Divider, Button as PaperButton} from 'react-native-paper';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    setLoading(true);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM stockmanuels WHERE etablissements_id=?',
        [etablissementsID],
        (_, {rows}) => {
          setData(rows.raw());
          setLoading(false);
        },
        (_, err) => {
          setError("Impossible de charger les manuels en stock.");
          setLoading(false);
          return false;
        },
      );
    }, err => {
      setError('Erreur de transaction lors du chargement.');
      setLoading(false);
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
      {loading ? (
        <LoadingState label="Chargement des manuels en stock..." />
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
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<EmptyState title="Aucun manuel en stock" subtitle="Essayez d’ajuster la recherche" />}
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
            <List.Item
              title={`Manuel: ${libelleManuel}`}
              titleNumberOfLines={3}
              titleEllipsizeMode="tail"
              description={() => (
                <View>
                  <Text style={styles.desc}>Ref: {item.referenceexemplaire}</Text>
                  <Text style={styles.desc}>Statut: {libellestatut}</Text>
                  <Text style={styles.desc}>État: {libelleetatmanuel}</Text>
                </View>
              )}
              left={props => <List.Icon {...props} icon="book" />}
              accessibilityLabel={`Manuel ${libelleManuel}, référence ${item.referenceexemplaire}, statut ${libellestatut}, état ${libelleetatmanuel}`}
            />
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
          <PaperTextInput
            mode="outlined"
            placeholder="Référence"
            value={currentItem?.referenceexemplaire || ''}
            onChangeText={text =>
              setCurrentItem({...currentItem, referenceexemplaire: text})
            }
            style={{marginBottom: 8}}
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
            <PaperButton mode="contained" onPress={addOrUpdateItem}>Enregistrer</PaperButton>
            <PaperButton style={{marginTop: 8}} onPress={() => setModalVisible(false)}>Annuler</PaperButton>
          </View>
        </View>
      </Modal>
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 10},
  searchInput: {
    marginBottom: 10,
  },
  card: {padding: 15, margin: 10, backgroundColor: '#eee', borderRadius: 10},
  title: {fontSize: 18, fontWeight: 'bold'},
  desc: {fontSize: 14, marginTop: 2},
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
