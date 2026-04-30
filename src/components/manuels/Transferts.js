import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';
import uuid from 'react-native-uuid';

const Transferts = () => {
  const [lanneescolaire, setLanneescolaire] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [transferts, setTransferts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfert, setSelectedTransfert] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState([]);
  const [classes, setClasses] = useState([]);
  const [typesManuels, setTypesManuels] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [formData, setFormData] = useState({
    etablissements_id: '',
    etablissements_id1: '',
    typemanuels_id: '',
    classes_id: '',
    quantite: '',
  });

  useEffect(() => {
    fetchTransferts();
  }, []);

  const fetchTransferts = () => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT
          transferts.*,
          e1.nometablissement AS etablissement1_nom,
          e2.nometablissement AS etablissement2_nom
        FROM transferts
        LEFT JOIN etablissements e1 ON transferts.etablissements_id = e1.id
        LEFT JOIN etablissements e2 ON transferts.etablissements_id1 = e2.id`,
        [],
        (_, results) => {
          const temp = [];
          for (let i = 0; i < results.rows.length; ++i) {
            temp.push(results.rows.item(i));
          }
          setTransferts(temp);
        },
      );
      tx.executeSql(
        'SELECT id, nometablissement FROM etablissements;',
        [],
        (_, results) => {
          setEtablissements(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des établissements', error),
      );
      tx.executeSql(
        `SELECT anneescolaires.libelleabrege
         FROM parametrages
         JOIN anneescolaires ON anneescolaires.id = parametrages.anneescolaires_id
         WHERE parametrages.id = 1`,
        [],
        (_, results) => {
          if (results.rows.length > 0) {
            setLanneescolaire(results.rows.item(0).libelleabrege);
          }
        },
        error => console.log('Erreur lors de la récupération de l\'année scolaire', error),
      );
      tx.executeSql(
        'SELECT id, libelletypemanuel FROM typemanuels;',
        [],
        (_, results) => {
          setTypesManuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des types de manuels', error),
      );
      tx.executeSql(
        'SELECT id, libelleclasse FROM classes;',
        [],
        (_, results) => {
          setClasses(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des classes', error),
      );
    });
  };

  const handleAjouterTransfert = () => {
    setFormData({
      etablissements_id: '',
      etablissements_id1: '',
      typemanuels_id: '',
      classes_id: '',
      quantite: '',
    });
    setSelectedTransfert(null);
    setShowForm(true);
  };

  const handleDelete = id => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer ce transfert ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            db.transaction(tx => {
              tx.executeSql(
                'DELETE FROM detailstransferts WHERE transferts_id = ?',
                [id],
                () => {
                  tx.executeSql(
                    'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                    [uuid.v4(), 'local', 'detailstransferts', id, 'delete', JSON.stringify({transferts_id: id})],
                  );
                },
              );
              tx.executeSql(
                'DELETE FROM transferts WHERE id = ?',
                [id],
                () => {
                  tx.executeSql(
                    'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                    [uuid.v4(), 'local', 'transferts', id, 'delete', JSON.stringify({id})],
                  );
                  fetchTransferts();
                },
              );
            });
          },
        },
      ],
      {cancelable: false},
    );
  };

  const handleEdit = transfert => {
    setSelectedTransfert(transfert);
    setFormData({
      etablissements_id: transfert.etablissements_id,
      etablissements_id1: transfert.etablissements_id1,
      typemanuels_id: transfert.typemanuels_id,
      classes_id: transfert.classes_id,
      quantite: transfert.quantite.toString(),
    });
    setShowForm(true);
  };

  const handleDetails = transfert => {
    setSelectedTransfert(transfert);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM detailstransferts WHERE transferts_id = ?',
        [transfert.id],
        (_, results) => {
          const temp = [];
          for (let i = 0; i < results.rows.length; ++i) {
            temp.push(results.rows.item(i));
          }
          setDetails(temp);
          setShowDetails(true);
        },
      );
    });
  };

  const handleChange = (name, value) => {
    setFormData({...formData, [name]: value});
  };

  const handleSubmit = () => {
    if (formData.etablissements_id === formData.etablissements_id1) {
      Alert.alert(
        'Transfert de manuels',
        'Vous ne pouvez pas transférer des manuels dans le même établissement',
      );
      return;
    }

    if (selectedTransfert) {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE transferts SET etablissements_id = ?, etablissements_id1 = ?, typemanuels_id = ?, classes_id = ?, quantite = ? WHERE id = ?',
          [
            formData.etablissements_id,
            formData.etablissements_id1,
            formData.typemanuels_id,
            formData.classes_id,
            formData.quantite,
            selectedTransfert.id,
          ],
          () => {
            tx.executeSql(
              'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
              [uuid.v4(), 'local', 'transferts', selectedTransfert.id, 'update', JSON.stringify({
                id: selectedTransfert.id,
                drenas_id: selectedTransfert.drenas_id,
                etablissements_id: formData.etablissements_id,
                etablissements_id1: formData.etablissements_id1,
                typemanuels_id: formData.typemanuels_id,
                classes_id: formData.classes_id,
                quantite: parseInt(formData.quantite, 10),
              })],
            );
            fetchTransferts();
            setShowForm(false);
            setSelectedTransfert(null);
          },
        );
      });
      return;
    }

    const nbreManuels = parseInt(formData.quantite, 10);
    if (!nbreManuels || nbreManuels <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    db.transaction(tx => {
      // Récupérer les paramètres de l'établissement d'accueil en un seul JOIN
      tx.executeSql(
        `SELECT
           e1.codeetablissement, e1.nummanuel AS nummanuel_accueil, e1.drenas_id, d.codedrenaabrege,
           e2.nummanuel AS nummanuel_depart
         FROM etablissements e1
         JOIN drenas d ON d.id = e1.drenas_id
         JOIN etablissements e2 ON e2.id = ?
         WHERE e1.id = ?`,
        [formData.etablissements_id, formData.etablissements_id1],
        (_, resAccueil) => {
          if (resAccueil.rows.length === 0) {
            Alert.alert('Erreur', "Établissement d'accueil introuvable");
            return;
          }
          const codeetab = resAccueil.rows.item(0).codeetablissement;
          const anciennum = resAccueil.rows.item(0).nummanuel_accueil;
          const lecodezone = resAccueil.rows.item(0).codedrenaabrege;
          const drenas_id = resAccueil.rows.item(0).drenas_id;
          const nummanueldDepart = resAccueil.rows.item(0).nummanuel_depart;

          // Récupérer les manuels correspondant au type et à la classe
          tx.executeSql(
            'SELECT id, referencemanuel FROM manuels WHERE typemanuels_id = ? AND classes_id = ?',
            [formData.typemanuels_id, formData.classes_id],
            (_, resManuels) => {
              const manuels = [];
              for (let i = 0; i < resManuels.rows.length; i++) {
                manuels.push(resManuels.rows.item(i));
              }

              if (manuels.length === 0) {
                Alert.alert('Erreur', 'Aucun manuel trouvé pour ce type et ce niveau');
                return;
              }

              // Vérification récursive des stocks pour chaque manuel
              const verifierStocks = (index, onDone) => {
                if (index >= manuels.length) {
                  onDone(true);
                  return;
                }
                const manuel = manuels[index];
                tx.executeSql(
                  `SELECT id FROM stockmanuels
                   WHERE manuels_id = ? AND etablissements_id = ? AND statutmanules_id = 1
                   ORDER BY id DESC LIMIT ?`,
                  [manuel.id, formData.etablissements_id, nbreManuels],
                  (_, resStock) => {
                    if (resStock.rows.length < nbreManuels) {
                      Alert.alert(
                        'Transfert de manuels',
                        `Pas assez de manuels disponibles pour le manuel ID: ${manuel.id}`,
                      );
                      onDone(false);
                      return;
                    }
                    verifierStocks(index + 1, onDone);
                  },
                  error => {
                    console.log('Erreur vérification stock', error);
                    onDone(false);
                  },
                );
              };

              verifierStocks(0, ok => {
                if (!ok) return;

                // Insérer le transfert
                tx.executeSql(
                  'INSERT INTO transferts (drenas_id, etablissements_id, etablissements_id1, typemanuels_id, classes_id, quantite) VALUES (?, ?, ?, ?, ?, ?)',
                  [
                    drenas_id,
                    formData.etablissements_id,
                    formData.etablissements_id1,
                    formData.typemanuels_id,
                    formData.classes_id,
                    nbreManuels,
                  ],
                  (_, resInsert) => {
                    const transfertsId = resInsert.insertId;

                    tx.executeSql(
                      'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                      [uuid.v4(), 'local', 'transferts', transfertsId, 'insert', JSON.stringify({
                        drenas_id,
                        etablissements_id: formData.etablissements_id,
                        etablissements_id1: formData.etablissements_id1,
                        typemanuels_id: formData.typemanuels_id,
                        classes_id: formData.classes_id,
                        quantite: nbreManuels,
                      })],
                    );

                    // Traitement récursif de chaque type de manuel
                    const traiterManuel = manuelIndex => {
                      if (manuelIndex >= manuels.length) {
                        // Mise à jour du nummanuel des deux établissements
                        tx.executeSql(
                          'UPDATE etablissements SET nummanuel = nummanuel - ? WHERE id = ?',
                          [nbreManuels, formData.etablissements_id],
                          () => {
                            tx.executeSql(
                              'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                              [uuid.v4(), 'local', 'etablissements', formData.etablissements_id, 'update', JSON.stringify({
                                id: formData.etablissements_id,
                                nummanuel: nummanueldDepart - nbreManuels,
                              })],
                            );
                          },
                        );
                        tx.executeSql(
                          'UPDATE etablissements SET nummanuel = nummanuel + ? WHERE id = ?',
                          [nbreManuels, formData.etablissements_id1],
                          () => {
                            tx.executeSql(
                              'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                              [uuid.v4(), 'local', 'etablissements', formData.etablissements_id1, 'update', JSON.stringify({
                                id: formData.etablissements_id1,
                                nummanuel: anciennum + nbreManuels,
                              })],
                            );
                          },
                        );
                        fetchTransferts();
                        setShowForm(false);
                        setSelectedTransfert(null);
                        return;
                      }

                      const manuel = manuels[manuelIndex];
                      // lordre repart de anciennum pour chaque type de manuel (comme dans le PHP)
                      let lordre = anciennum;

                      tx.executeSql(
                        `SELECT s.id FROM stockmanuels s
                         WHERE s.manuels_id = ? AND s.etablissements_id = ? AND s.statutmanules_id = 1
                         ORDER BY s.id DESC LIMIT ?`,
                        [manuel.id, formData.etablissements_id, nbreManuels],
                        (_, resStocks) => {
                          const stocks = [];
                          for (let j = 0; j < resStocks.rows.length; j++) {
                            stocks.push(resStocks.rows.item(j));
                          }

                          // Traitement récursif de chaque exemplaire
                          const traiterStock = stockIndex => {
                            if (stockIndex >= stocks.length) {
                              traiterManuel(manuelIndex + 1);
                              return;
                            }

                            lordre = lordre + 1;
                            const stock = stocks[stockIndex];
                            const nouvelleReference = `${lanneescolaire}_${lecodezone}_${codeetab}_${manuel.referencemanuel}_${lordre}`;

                            tx.executeSql(
                              'INSERT INTO detailstransferts (transferts_id, stockmanuels_id) VALUES (?, ?)',
                              [transfertsId, stock.id],
                              (_, resDetail) => {
                                const detailId = resDetail.insertId;
                                tx.executeSql(
                                  'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                                  [uuid.v4(), 'local', 'detailstransferts', detailId, 'insert', JSON.stringify({
                                    transferts_id: transfertsId,
                                    stockmanuels_id: stock.id,
                                  })],
                                );
                                tx.executeSql(
                                  'UPDATE stockmanuels SET etablissements_id = ?, referenceexemplaire = ? WHERE id = ?',
                                  [formData.etablissements_id1, nouvelleReference, stock.id],
                                  () => {
                                    tx.executeSql(
                                      'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
                                      [uuid.v4(), 'local', 'stockmanuels', stock.id, 'update', JSON.stringify({
                                        id: stock.id,
                                        etablissements_id: formData.etablissements_id1,
                                        referenceexemplaire: nouvelleReference,
                                      })],
                                    );
                                    traiterStock(stockIndex + 1);
                                  },
                                  error => console.log('Erreur mise à jour stockmanuel', error),
                                );
                              },
                              error => console.log('Erreur insertion détail transfert', error),
                            );
                          };

                          traiterStock(0);
                        },
                        error => console.log('Erreur récupération stocks', error),
                      );
                    };

                    traiterManuel(0);
                  },
                  error => console.log('Erreur insertion transfert', error),
                );
              });
            },
            error => console.log('Erreur récupération manuels', error),
          );
        },
        error => console.log('Erreur récupération établissement accueil', error),
      );
    });
  };

  const handleDeleteDetail = stockmanuelsId => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM detailstransferts WHERE transferts_id = ? AND stockmanuels_id = ?',
        [selectedTransfert.id, stockmanuelsId],
        () => {
          tx.executeSql(
            'INSERT INTO sync_log (uuid, source, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?, ?)',
            [uuid.v4(), 'local', 'detailstransferts', selectedTransfert.id, 'delete', JSON.stringify({
              transferts_id: selectedTransfert.id,
              stockmanuels_id: stockmanuelsId,
            })],
          );
          handleDetails(selectedTransfert);
        },
      );
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher..."
        onChangeText={text => setSearchTerm(text)}
        placeholderTextColor="black"
      />
      <Button title="Ajouter un Transfert" onPress={handleAjouterTransfert} />
      <FlatList
        data={transferts.filter(
          item =>
            (item.etablissement1_nom ?? '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (item.etablissement2_nom ?? '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            item.quantite.toString().includes(searchTerm),
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleDetails(item)}>
            <Text>ID: {item.id}</Text>
            <Text>Établissement départ: {item.etablissement1_nom}</Text>
            <Text>Établissement accueil: {item.etablissement2_nom}</Text>
            <Text>Quantité: {item.quantite}</Text>
            <View style={styles.cardButtons}>
              <Button title="Modifier" onPress={() => handleEdit(item)} />
              <Button title="Supprimer" onPress={() => handleDelete(item.id)} />
              <Button title="Détails" onPress={() => handleDetails(item)} />
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={showForm}
        onRequestClose={() => setShowForm(false)}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>
              {selectedTransfert ? 'Modifier Transfert' : 'Ajouter Transfert'}
            </Text>
            <Text>Établissement de départ</Text>
            <CustomPicker
              selectedId={formData.etablissements_id}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('etablissements_id', itemValue)
              }
              items={etablissements.map(e => ({
                label: e.nometablissement,
                value: e.id,
              }))}
              placeholder="Sélectionner Établissement de départ"
            />
            <Text>Établissement d'accueil</Text>
            <CustomPicker
              selectedId={formData.etablissements_id1}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('etablissements_id1', itemValue)
              }
              items={etablissements.map(e => ({
                label: e.nometablissement,
                value: e.id,
              }))}
              placeholder="Sélectionner Établissement d'accueil"
            />
            <Text>Type de manuels</Text>
            <CustomPicker
              selectedId={formData.typemanuels_id}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('typemanuels_id', itemValue)
              }
              items={typesManuels.map(t => ({
                label: t.libelletypemanuel,
                value: t.id,
              }))}
              placeholder="Sélectionner Type Manuel"
            />
            <Text>Niveau</Text>
            <CustomPicker
              selectedId={formData.classes_id}
              style={styles.picker}
              onValueChange={itemValue => handleChange('classes_id', itemValue)}
              items={classes.map(c => ({
                label: c.libelleclasse,
                value: c.id,
              }))}
              placeholder="Sélectionner Classe"
            />
            <Text>Quantité</Text>
            <TextInput
              style={styles.input}
              placeholder="Quantité"
              keyboardType="numeric"
              value={formData.quantite.toString()}
              onChangeText={text => handleChange('quantite', text)}
            />
            <View style={styles.buttonContainer}>
              <Button title="Annuler" onPress={() => setShowForm(false)} />
              <Button title="Enregistrer" onPress={handleSubmit} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDetails}
        onRequestClose={() => setShowDetails(false)}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>
              Détails du Transfert {selectedTransfert?.id}
            </Text>
            <FlatList
              data={details}
              keyExtractor={item => item.stockmanuels_id.toString()}
              renderItem={({item}) => (
                <View style={styles.detailItem}>
                  <Text>Stock Manuel ID: {item.stockmanuels_id}</Text>
                  <Button
                    title="Supprimer"
                    onPress={() => handleDeleteDetail(item.stockmanuels_id)}
                  />
                </View>
              )}
            />
            <Button title="Fermer" onPress={() => setShowDetails(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '80%',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    color: 'black',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  picker: {
    width: '100%',
    height: 50,
    marginBottom: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    color: 'black',
  },
});

export default Transferts;
