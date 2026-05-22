import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import {TextInput as PaperTextInput, List, Divider, Button as PaperButton} from 'react-native-paper';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import uuid from 'react-native-uuid';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useDrenaId from '../../parametres/drena.js';

const CeInscrits1 = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const [totalManuelsInscrits, setTotalManuelsInscrits] = useState(0);
  const [totalStockManuelsDrena, setTotalStockManuelsDrena] = useState(0);
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
    setError('');
    setLoading(true);
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
          setLoading(false);
        },
        (_, error) => {
          console.error(
            'Erreur lors de la récupération des commandes et détails :',
            error,
          );
          setError('Impossible de charger les souscriptions CE.');
          setLoading(false);
        },
      );

      // Total de manuels inscrits (somme des quantités des détails pour la DRENA + année)
      tx.executeSql(
        `SELECT SUM(details.nombremanuel) AS totalInscrits
         FROM commandesues 
         INNER JOIN detailscommandeues AS details ON commandesues.id = details.commandesues_id 
         INNER JOIN ues ON ues.id = commandesues.ues_id 
         INNER JOIN etablissements ON etablissements.id = ues.etablissements_id 
         WHERE etablissements.drenas_id=? AND commandesues.anneescolaires_id=?;`,
        [drenasID, anneescolairesID],
        (_, res) => {
          const total = res.rows.length > 0 && res.rows.item(0).totalInscrits
            ? res.rows.item(0).totalInscrits
            : 0;
          setTotalManuelsInscrits(total);
        },
      );

      // Total de manuels disponibles dans la DRENA (stockmanuels statut disponible)
      tx.executeSql(
        `SELECT COUNT(*) AS totalStock
         FROM stockmanuels sm
         JOIN etablissements et ON et.id = sm.etablissements_id
         WHERE et.drenas_id = ? AND sm.statutmanules_id = 1;`,
        [drenasID],
        (_, res) => {
          const total = res.rows.length > 0 && res.rows.item(0).totalStock
            ? res.rows.item(0).totalStock
            : 0;
          setTotalStockManuelsDrena(total);
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

  const tauxInscription = useMemo(() => {
    if (!totalStockManuelsDrena) return 0;
    return (totalManuelsInscrits / totalStockManuelsDrena) * 100;
  }, [totalManuelsInscrits, totalStockManuelsDrena]);

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
      {loading ? (
        <LoadingState label="Chargement des souscriptions CE..." />
      ) : error ? (
        <ErrorState
          subtitle={error}
          onAction={() => {
            setError('');
            fetchCommandes();
          }}
        />
      ) : (
        <>
          {/* Nombre total CE */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              {memoizedCommandes.length} CE{memoizedCommandes.length > 1 ? 's' : ''}{' '}
              trouv{memoizedCommandes.length > 1 ? 'és' : 'é'}
            </Text>
            <Text style={styles.totalText}>
              Taux de manuels distribués: {tauxInscription.toFixed(1)}%
            </Text>
          </View>

          <PaperTextInput
            mode="outlined"
            style={styles.searchInput}
            placeholder="Recherche rapide"
            value={searchText}
            onChangeText={handleSearch}
            left={<PaperTextInput.Icon icon="magnify" />}
          />
          <PaperButton mode="contained" onPress={() => setModalVisible(true)}>
            Ajouter une commande
          </PaperButton>

          <FlatList
            style={{flex: 1}}
            data={filteredCommandes}
            keyExtractor={item => item.id.toString()}
            initialNumToRender={10}
            windowSize={21}
            ItemSeparatorComponent={Divider}
            ListEmptyComponent={<EmptyState title="Aucune commande" subtitle="Aucune souscription CE trouvée" />}
            renderItem={({item}) => (
              <List.Item
                title={`  ${item.ues_name}`}
                titleNumberOfLines={3}
                titleEllipsizeMode="tail"
                description={() => (
                  <View>
                    {/* <Text style={styles.desc}>Année scolaire: {item.anneescolaire_name}</Text> */}
                    {/* <Text style={styles.desc}>Détails des manuels:</Text> */}
                    <FlatList
                      data={item.details}
                      keyExtractor={d => d.id.toString()}
                      renderItem={({item: d}) => (
                        <View>
                          <Text style={styles.desc}>Manuel: {manuel(d.manuels_id)}</Text>
                          <Text style={styles.desc}>Quantité: {d.nombremanuel}</Text>
                        </View>
                      )}
                      initialNumToRender={5}
                      windowSize={11}
                    />
                  </View>
                )}
                left={props => <List.Icon {...props} icon="account-group" />}
                right={props => (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={{paddingHorizontal: 8}}>
                      <Text style={{fontSize: 18}}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{paddingHorizontal: 8}}>
                      <Text style={{fontSize: 18}}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
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
                        <PaperTextInput
                          mode="outlined"
                          placeholder="Quantité"
                          value={item.nombremanuel.toString()}
                          onChangeText={t =>
                            handleDetailChange(index, 'nombremanuel', t)
                          }
                          keyboardType="numeric"
                          style={{marginBottom: 8}}
                        />
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteDetail(index)}>
                        <Text style={{fontSize: 18}}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListHeaderComponent={
                    <PaperButton mode="outlined" onPress={handleAddDetail}>
                      Ajouter un détail
                    </PaperButton>
                  }
                  ListFooterComponent={
                    <>
                      <PaperButton mode="contained" onPress={handleSave}>
                        Enregistrer
                      </PaperButton>
                      <PaperButton style={{marginTop: 8}} onPress={closeModal}>
                        Annuler
                      </PaperButton>
                    </>
                  }
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 10, flex: 1},
  
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
