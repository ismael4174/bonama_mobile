import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useDrenaId from '../../parametres/drena.js';

const CeInscrits1 = () => {
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
  const anneescolairesID = useAnneescolairesID();
  const drenasID = useDrenaId();

  // Chargement des manuels
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql('SELECT id, titre FROM manuels;', [], (_, results) =>
        setManuels(results.rows.raw()),
      );
    });
  }, []);

  // Chargement des commandes et références
  const fetchCommandes = useCallback(() => {
    if (!drenasID || !anneescolairesID) return;
    db.transaction(tx => {
      tx.executeSql(
        `SELECT commandesues.*, details.* 
         FROM commandesues 
         INNER JOIN detailscommandeues AS details ON commandesues.id = details.commandesues_id 
         INNER JOIN ues ON ues.id = commandesues.ues_id 
         INNER JOIN etablissements ON etablissements.id = ues.etablissements_id 
         WHERE etablissements.drenas_id=? AND commandesues.anneescolaires_id=?;`,
        [drenasID, anneescolairesID],
        (_, results) => {
          const rows = results.rows.raw();
          const commandesMap = {};
          const commandesList = [];
          rows.forEach(row => {
            if (!commandesMap[row.id]) {
              commandesMap[row.id] = {...row, details: []};
              commandesList.push(commandesMap[row.id]);
            }
            commandesMap[row.id].details.push(row);
          });
          setCommandes(commandesList);
        },
      );
    });
  }, [drenasID, anneescolairesID]);

  useEffect(() => {
    fetchCommandes();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, res) => setAnnees(res.rows.raw()),
      );
      tx.executeSql('SELECT id, denominationue FROM ues;', [], (_, res) =>
        setUes(res.rows.raw()),
      );
    });
  }, [fetchCommandes]);

  const handleSearch = useCallback(text => {
    // Ne pas requêter la DB: on filtre uniquement sur les CE déjà listés (portée utilisateur)
    setSearchText(text);
  }, []);

  const handleSave = useCallback(() => {
    if (!uesId || !anneeScolaireId || nombretotalmanuel === '') {
      alert('Veuillez remplir tous les champs');
      return;
    }
    db.transaction(tx => {
      if (selectedCommande) {
        tx.executeSql(
          'UPDATE commandesues SET ues_id=?, anneescolaires_id=?, nombretotalmanuel=? WHERE id=?;',
          [uesId, anneeScolaireId, nombretotalmanuel, selectedCommande.id],
          () => insertDetailsCommande(tx, selectedCommande.id),
        );
      } else {
        tx.executeSql(
          'INSERT INTO commandesues (ues_id, anneescolaires_id, nombretotalmanuel, datesouscription, presouscrit) VALUES (?, ?, ?, ?, ?);',
          [uesId, anneeScolaireId, nombretotalmanuel],
          (tx, result) => insertDetailsCommande(tx, result.insertId),
        );
      }
    });
    setModalVisible(false);
    resetForm();
  }, [uesId, anneeScolaireId, nombretotalmanuel, selectedCommande]);

  const insertDetailsCommande = useCallback(
    (tx, commandesuesId) => {
      details.forEach(detail => {
        tx.executeSql(
          'INSERT INTO detailscommandeues (commandesues_id, manuels_id, nombremanuel) VALUES (?, ?, ?);',
          [commandesuesId, detail.manuels_id, detail.nombremanuel],
        );
      });
    },
    [details],
  );

  const handleEdit = useCallback(item => {
    setSelectedCommande(item);
    setUesId(item.ues_id);
    setAnneeScolaireId(item.anneescolaires_id);
    setNombretotalmanuel(item.nombretotalmanuel?.toString() || '');
    setDetails(item.details);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    id => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM detailscommandeues WHERE commandesues_id=?;',
          [id],
        );
        tx.executeSql(
          'DELETE FROM commandesues WHERE id=?;',
          [id],
          fetchCommandes,
        );
      });
    },
    [fetchCommandes],
  );

  const handleAddDetail = useCallback(
    () => setDetails([...details, {manuels_id: '', nombremanuel: ''}]),
    [details],
  );
  const handleDetailChange = useCallback(
    (index, field, value) => {
      const updated = [...details];
      updated[index][field] = value;
      setDetails(updated);
    },
    [details],
  );
  const handleDeleteDetail = useCallback(
    index => setDetails(details.filter((_, i) => i !== index)),
    [details],
  );
  const resetForm = useCallback(() => {
    setSelectedCommande(null);
    setUesId(null);
    setAnneeScolaireId(null);
    setNombretotalmanuel('');
    setDetails([]);
  }, []);
  const closeModal = useCallback(() => {
    resetForm();
    setModalVisible(false);
  }, [resetForm]);

  const ueselect = useCallback(
    id => ues.find(e => e.id === id)?.denominationue || 'Inconnu',
    [ues],
  );
  const anneescolaire = useCallback(
    id => annees.find(e => e.id === id)?.libelleanneescolaire || 'Inconnu',
    [annees],
  );
  const manuel = useCallback(
    id => manuels.find(e => e.id === id)?.titre || 'Inconnu',
    [manuels],
  );

  const memoizedCommandes = useMemo(() => {
    return commandes.map(c => ({
      ...c,
      ues_name: ueselect(c.ues_id),
      anneescolaire_name: anneescolaire(c.anneescolaires_id),
    }));
  }, [commandes, ueselect, anneescolaire]);

  const filteredCommandes = useMemo(() => {
    const list = memoizedCommandes;
    const q = (searchText || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      c =>
        (c.ues_name || '').toLowerCase().includes(q) ||
        (c.anneescolaire_name || '').toLowerCase().includes(q),
    );
  }, [memoizedCommandes, searchText]);

  return (
    <View style={{flex: 1}}>
      {/* Nombre total CE */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          {memoizedCommandes.length} CE{memoizedCommandes.length > 1 ? 's' : ''}{' '}
          trouv{memoizedCommandes.length > 1 ? 'és' : 'é'}
        </Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Recherche rapide"
        value={searchText}
        onChangeText={handleSearch}
        placeholderTextColor="black"
      />
      <Button
        title="Ajouter une commande"
        onPress={() => setModalVisible(true)}
      />

      <FlatList
        style={{flex: 1}}
        data={filteredCommandes}
        keyExtractor={item => item.id.toString()}
        initialNumToRender={10}
        windowSize={21}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.title}>CE: {item.ues_name}</Text>
            <Text style={styles.title}>
              Année scolaire: {item.anneescolaire_name}
            </Text>
            <Text style={styles.title}>Détails des manuels:</Text>
            <FlatList
              data={item.details}
              keyExtractor={d => d.id.toString()}
              renderItem={({item: d}) => (
                <View>
                  <Text style={styles.title}>
                    Manuel: {manuel(d.manuels_id)}
                  </Text>
                  <Text style={styles.title}>Quantité: {d.nombremanuel}</Text>
                </View>
              )}
              initialNumToRender={5}
              windowSize={11}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <Text style={{fontSize: 20}}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={{fontSize: 20}}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onRequestClose={closeModal}
        transparent
        animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <FlatList
              data={details}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({item, index}) => (
                <View style={styles.detailContainer}>
                  <CustomPicker
                    items={manuels.map(manuel => ({
                      label: manuel.titre,
                      value: manuel.id,
                    }))}
                    selectedId={item.manuels_id}
                    onValueChange={v =>
                      handleDetailChange(index, 'manuels_id', v)
                    }
                    displayKey="label"
                    valueKey="value"
                  />
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder="Quantité"
                      value={item.nombremanuel.toString()}
                      onChangeText={t =>
                        handleDetailChange(index, 'nombremanuel', t)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteDetail(index)}>
                    <Text style={{fontSize: 18}}>❌</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListHeaderComponent={
                <Button title="Ajouter un détail" onPress={handleAddDetail} />
              }
              ListFooterComponent={
                <>
                  <Button title="Enregistrer" onPress={handleSave} />
                  <Button title="Annuler" onPress={closeModal} />
                </>
              }
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 10, flex: 1},
  inputContainer: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
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
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    maxHeight: '90%',
  },
  detailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  totalContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#dcdcdc',
    borderRadius: 5,
    alignItems: 'center',
  },
  totalText: {fontSize: 16, fontWeight: 'bold'},
});

export default CeInscrits1;
