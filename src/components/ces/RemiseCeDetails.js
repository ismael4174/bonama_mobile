import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Button,
  Alert,
} from 'react-native';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';

const ManuelElevesUES = ({navigation, route}) => {
  const [manuels, setManuels] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingManuel, setEditingManuel] = useState(null);
  const [etatmanuels, setEtatmanuels] = useState([]);
  const [stockmanuels, setStockmanuels] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [mesManuels, setMesManuels] = useState([]);
  const [ues, setUes] = useState([]);
  const [isLocked, setIsLocked] = useState(true);

  const {commandeId, eleveInscritId} = route.params || {};

  // 🔹 Chargement des manuels et des données
  useEffect(() => {
    fetchData();
    if (commandeId) fetchManuels(commandeId);
  }, [commandeId]);

  const fetchData = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, referenceexemplaire, manuels_id FROM stockmanuels WHERE statutmanules_id = 1;',
        [],
        (_, results) => setStockmanuels(results.rows.raw()),
      );
      tx.executeSql('SELECT id, titre FROM manuels;', [], (_, results) =>
        setMesManuels(results.rows.raw()),
      );
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels WHERE id IN (1, 2, 3);',
        [],
        (_, results) => setEtatmanuels(results.rows.raw()),
      );
      tx.executeSql(
        'SELECT commandesues.id, ues.denominationue FROM commandesues JOIN ues ON ues.id = commandesues.ues_id;',
        [],
        (_, results) => setUes(results.rows.raw()),
      );
    });
  };

  const fetchManuels = commandeId => {
    db.transaction(tx => {
      let sql = 'SELECT * FROM manuelsues';
      const params = [];
      if (commandeId) {
        sql += ' WHERE commandesues_id = ?';
        params.push(commandeId);
      }
      tx.executeSql(sql, params, (_, {rows}) => setManuels(rows.raw()));
    });
  };

  // 🔹 Filtrer les exemplaires disponibles pour un manuel
  const filterStockForManuel = manuelId => {
    if (!manuelId) return setFilteredStock([]);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, referenceexemplaire FROM stockmanuels WHERE statutmanules_id = 1 AND manuels_id = ?;',
        [manuelId],
        (_, results) => setFilteredStock(results.rows.raw()),
      );
    });
  };

  // 🔹 Finaliser la remise
  const handleFinaliserRemise = () => {
    if (!commandeId) return;

    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) as nbreManuel FROM manuelsues WHERE commandesues_id = ?',
        [commandeId],
        (_, results) => {
          const nbreManuel = results.rows.item(0).nbreManuel;

          tx.executeSql(
            'SELECT COUNT(*) as nbremanuelsrenseignes FROM manuelsues WHERE commandesues_id = ? AND exemplairemanuels_id IS NOT NULL AND etatmanuelsalaremise_id IS NOT NULL',
            [commandeId],
            (_, results) => {
              const nbremanuelsrenseignes =
                results.rows.item(0).nbremanuelsrenseignes;

              if (nbreManuel === nbremanuelsrenseignes) {
                tx.executeSql(
                  'UPDATE commandesues SET remiseuefinalise = 1 WHERE id = ?',
                  [commandeId],
                  () => {
                    tx.executeSql(
                      'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
                      [
                        uuid.v4(),
                        'commandesues',
                        commandeId,
                        'update',
                        JSON.stringify({remiseuefinalise: 1}),
                        'local',
                      ],
                      () => {
                        Alert.alert('Succès', 'Remise finalisée !');
                        navigation.goBack();
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

  const handleSave = () => {
    if (!editingManuel?.manuels_id) {
      Alert.alert('Erreur', 'Sélectionnez un manuel.');
      return;
    }
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE manuelsues SET commandesues_id=?, manuels_id=?, exemplairemanuels_id=?, etatmanuelsalaremise_id=?, etatmanuelsauretour_id=?, rendu=? WHERE id=?',
        [
          editingManuel.commandesues_id,
          editingManuel.manuels_id,
          editingManuel.exemplairemanuels_id,
          editingManuel.etatmanuelsalaremise_id,
          editingManuel.etatmanuelsauretour_id,
          editingManuel.rendu ? 1 : 0,
          editingManuel.id,
        ],
        () => {
          tx.executeSql(
            'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
            [
              uuid.v4(),
              'manuelsues',
              editingManuel.id,
              'update',
              JSON.stringify(editingManuel),
              'local',
            ],
          );
          fetchManuels(commandeId);
          setModalVisible(false);
          setEditingManuel(null);
        },
      );
    });
  };

  return (
    <View style={styles.container}>
      <Button title="Précédent" onPress={() => navigation.goBack()} />
      <Button title="Finaliser cette remise" onPress={handleFinaliserRemise} />
      <TextInput
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="black"
        style={styles.searchInput}
      />

      <FlatList
        data={manuels.filter(m =>
          Object.values(m).some(v => v?.toString().includes(search)),
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const monmanuel = mesManuels.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel ? monmanuel.titre : 'Inconnu';
          const monue = ues.find(u => u.id === item.commandesues_id);
          const denominationue = monue ? monue.denominationue : 'Inconnu';
          const exemplaire = stockmanuels.find(
            s => s.id === item.exemplairemanuels_id,
          );
          const monexemplaire = exemplaire
            ? exemplaire.referenceexemplaire
            : 'Inconnu';
          const etatremise = etatmanuels.find(
            s => s.id === item.etatmanuelsalaremise_id,
          );
          const monetatremise = etatremise ? etatremise.etatmanuel : 'Inconnu';

          return (
            <View style={styles.card}>
              <Text style={styles.title}>Commande: {denominationue}</Text>
              <Text style={styles.title}>Manuel: {libelleManuel}</Text>
              <Text>Référence: {monexemplaire}</Text>
              <Text>État à la remise: {monetatremise}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingManuel(item);
                    filterStockForManuel(item.manuels_id);
                    setModalVisible(true);
                  }}>
                  <Text style={{fontSize: 20}}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text>Commande</Text>
            <CustomPicker
              label="Commande"
              items={ues.map(u => ({label: u.denominationue, value: u.id}))}
              selectedId={editingManuel?.commandesues_id}
              onValueChange={v =>
                setEditingManuel({...editingManuel, commandesues_id: v})
              }
              isDisabled={isLocked}
            />
            <Text>Manuel</Text>
            <CustomPicker
              label="Manuel"
              items={mesManuels.map(m => ({label: m.titre, value: m.id}))}
              selectedId={editingManuel?.manuels_id}
              onValueChange={v => {
                setEditingManuel({...editingManuel, manuels_id: v});
                filterStockForManuel(v);
              }}
              isDisabled={isLocked}
            />
            <Text>Exemplaire</Text>
            <CustomPicker
              label="Exemplaire"
              items={filteredStock.map(f => ({
                label: f.referenceexemplaire,
                value: f.id,
              }))}
              selectedId={editingManuel?.exemplairemanuels_id}
              onValueChange={v =>
                setEditingManuel({...editingManuel, exemplairemanuels_id: v})
              }
            />
            <Text>État à la remise</Text>
            <CustomPicker
              label="État Remise"
              items={etatmanuels.map(e => ({label: e.etatmanuel, value: e.id}))}
              selectedId={editingManuel?.etatmanuelsalaremise_id}
              onValueChange={v =>
                setEditingManuel({...editingManuel, etatmanuelsalaremise_id: v})
              }
            />
            <Button title="Enregistrer" onPress={handleSave} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} />
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
    marginVertical: 10,
    paddingHorizontal: 8,
    color: 'black',
  },
  card: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  title: {fontSize: 16, fontWeight: 'bold', marginBottom: 4},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10},
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
  },
});

export default ManuelElevesUES;
