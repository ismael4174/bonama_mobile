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
  TouchableOpacity, // Import TouchableOpacity
} from 'react-native';
import {db} from '../../db/database';
import CustomPicker from '../CustomPicker';

const Transferts = () => {
  /////////////////////////////
  const [lordre, setLordre] = useState('');
  const [lanneescolaire, setLanneescolaire] = useState('');
  const [lecodezone, setLecodezone] = useState('');
  const [codeetab, setCodeetab] = useState('');
  const [manuels, setManuels] = useState([]);
  const [manuelsAsup, setManuelsAsup] = useState([]);
  const [synclogs, setSynclogs] = useState([]);
  //////////////////////////
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
  const [newDetail, setNewDetail] = useState({stockmanuels_id: ''});

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
        (tx, results) => {
          const temp = [];
          for (let i = 0; i < results.rows.length; ++i) {
            temp.push(results.rows.item(i));
          }
          setTransferts(temp);
        },
      );
      /*tx.executeSql('SELECT * FROM sync_log', [], (tx, results) => {
        const temp = [];
        for (let i = 0; i < results.rows.length; ++i) {
          temp.push(results.rows.item(i));
        }
        setSynclogs(temp);
      });*/
      tx.executeSql(
        'SELECT id, nometablissement FROM etablissements;',
        [],
        (_, results) => {
          setEtablissements(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
      tx.executeSql(
        'SELECT anneescolaires.libelleabrege FROM parametrages join anneescolaires on anneescolaires.id = parametrages.anneescolaires_id where parametrages.id=1;',
        [],
        (_, results) => {
          if (results.rows.length > 0) {
            setLanneescolaire(results.rows.item(0).libelleabrege);
          }
        },
        error =>
          console.log(
            'Erreur lors de la recuperation de lannee scolaire',
            error,
          ),
      );
      tx.executeSql(
        'SELECT id, libelletypemanuel FROM typemanuels;',
        [],
        (_, results) => {
          setTypesManuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
      tx.executeSql(
        'SELECT id, libelleclasse FROM classes;',
        [],
        (_, results) => {
          setClasses(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
    });
  };
  const handleAjouterTransfert = () => {
    // Réinitialise formData à ses valeurs initiales
    setFormData({
      etablissements_id: '',
      etablissements_id1: '',
      typemanuels_id: '',
      classes_id: '',
      quantite: '',
    });
    // Réinitialise selectedTransfert à null
    setSelectedTransfert(null);

    // Affiche le modal
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
              tx.executeSql('DELETE FROM transferts WHERE id = ?', [id], () => {
                // Insertion dans sync_log pour transferts (delete)
                tx.executeSql(
                  'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
                  [
                    'transferts',
                    id,
                    'delete',
                    JSON.stringify({id}),
                    new Date().toISOString(),
                  ],
                );
                fetchTransferts();
              });
              tx.executeSql(
                'DELETE FROM detailstransferts WHERE transferts_id = ?',
                [id],
                () => {
                  // Insertion dans sync_log pour detailstransferts (delete)
                  tx.executeSql(
                    'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
                    [
                      'detailstransferts',
                      id,
                      'delete',
                      JSON.stringify({transferts_id: id}),
                      new Date().toISOString(),
                    ],
                  );
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
      quantite: transfert.quantite.toString(), // Assurez-vous que c'est une chaîne
    });
    setShowForm(true);
  };

  const handleDetails = transfert => {
    setSelectedTransfert(transfert);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM detailstransferts WHERE transferts_id = ?',
        [transfert.id],
        (tx, results) => {
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

  const handleDetailChange = (name, value) => {
    setNewDetail({...newDetail, [name]: value});
  };

  const handleSubmit = () => {
    //recuperation du num de etablissement de depart et calcul du nouveau num depart
    //recuperation du num de etablissement accueil et calcul du nouveau num accueil

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
            // Insertion dans sync_log pour transferts (update)
            tx.executeSql(
              'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
              [
                'transferts',
                selectedTransfert.id,
                'update',
                JSON.stringify(formData),
                new Date().toISOString(),
              ],
            );
            fetchTransferts();
            setShowForm(false);
            setSelectedTransfert(null);
          },
        );
      });
    } else {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO transferts (etablissements_id, etablissements_id1, typemanuels_id, classes_id, quantite) VALUES (?, ?, ?, ?, ?)',
          [
            formData.etablissements_id,
            formData.etablissements_id1,
            formData.typemanuels_id,
            formData.classes_id,
            formData.quantite,
          ],
          (tx, result) => {
            const transfertsId = result.insertId;
            // Insertion dans sync_log pour transferts (insert)
            tx.executeSql(
              'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
              [
                'transferts',
                transfertsId,
                'insert',
                JSON.stringify(formData),
                new Date().toISOString(),
              ],
            );
            //// recuperation des paramètres pour insertion dans details et modification de stocks////
            tx.executeSql(
              'SELECT codeetablissement FROM etablissements where etablissements.id=?',
              [formData.etablissements_id1],
              (_, results) => {
                if (results.rows.length > 0) {
                  setCodeetab(results.rows.item(0).codeetablissement);
                }
              },
              error =>
                console.log(
                  'Erreur lors de la recuperation du code etablissement',
                  error,
                ),
            );

            tx.executeSql(
              'SELECT nummanuel FROM etablissements where etablissements.id=?',
              [formData.etablissements_id1],
              (_, results) => {
                if (results.rows.length > 0) {
                  setCodeetab(results.rows.item(0).nummanuel);
                }
              },
              error =>
                console.log(
                  'Erreur lors de la recuperation du numero du manuel',
                  error,
                ),
            );

            tx.executeSql(
              'SELECT drenas.codedrenaabrege FROM drenas JOIN etablissements on etablissements.drenas_id = drenas.id  where etablissements.id=?',
              [formData.etablissements_id1],
              (_, results) => {
                if (results.rows.length > 0) {
                  setLecodezone(results.rows.item(0).codedrenaabrege);
                }
              },
              error =>
                console.log(
                  'Erreur lors de la recuperation du code de la drena',
                  error,
                ),
            );
            tx.executeSql(
              'SELECT manuels.id FROM manuels  WHERE manuels.typemanuels_id=? AND manuels.classes_id=?',
              [formData.typemanuels_id, formData.classes_id],
              (_, results) => {
                setManuels(results.rows.raw());
              },
              error =>
                console.log(
                  'Erreur lors de la recuperation du code de la drena',
                  error,
                ),
            );
            tx.executeSql(
              'SELECT etblissements.num FROM etablissements  WHERE etablissements.id=?',
              [formData.etablissements_id1],
              (_, results) => {
                //setLordre(results.rows.raw());
                if (results.rows.length > 0) {
                  setLordre(results.rows.item(0).num);
                }
              },
              error =>
                console.log(
                  'Erreur lors de la recuperation du code de la drena',
                  error,
                ),
            );
            /*
            /// fin recuperation des parametres pour insertion dans details et modification de stocks//////
            //boucle foreach sur manuels
            const manuelsData = manuels; // Récupérer les données de manuels une seule fois
            for (let i = 0; i < manuelsData.length; i++) {
              const manuel = manuelsData[i];
              //////////////////////////
              tx.executeSql(
                'SELECT stockmanuels.id FROM stockmanuels WHERE stockmanuels.manuels_id=? AND stockmanuels.etablissements_id=? AND stockmanuels.statutmanules_id=1 order by stockmanuels.i desc limit(?)',
                [manuel.id, formData.etablissements_id, formData.quantite],
                (_, results) => {
                  setManuelsAsup(results.rows.raw());
                },
                error =>
                  console.log(
                    'Erreur lors de la recuperation du code de la drena',
                    error,
                  ),
              );
              const manuelsAsupData = manuelsAsup;
              let monordre = lordre;
              for (let j = 0; j < manuelsAsupData.length; j++) {
                const manuelsup = manuelsAsupData[j];
                monordre = monordre + 1;
                //insertion dans detailstransferts
                tx.executeSql(
                  'INSERT INTO detailstransferts (transferts_id, stockmanuels_id) VALUES (?, ?)',
                  [transfertsId, manuelsup.id],
                  () => {
                    const nouvelleReference =
                      lanneescolaire + '_' + lecodezone + '_' + codeetab + '_';
                    manuelsup.id.referencemanuel + '_' + monordre;
                    tx.executeSql(
                      'UPDATE stockmanuels SET etablissements_id = ?,referenceexemplaire = ? WHERE id = ?',
                      [
                        formData.etablissements_id1,
                        nouvelleReference,
                        manuelsup.id,
                      ],
                    );
                  },
                  error =>
                    console.log(
                      'Erreur lors de la recuperation du code de la drena',
                      error,
                    ),
                );
              }
            }

            //modification du num de l'établissement de depart
            //modification du num de l'établissement d'accueil
            */
            fetchTransferts();
            setShowForm(false);
            setSelectedTransfert(null);
          },
        );
      });
    }
  };

  const handleAddDetail = () => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO detailstransferts (transferts_id, stockmanuels_id) VALUES (?, ?)',
        [selectedTransfert.id, newDetail.stockmanuels_id],
        () => {
          // Insertion dans sync_log pour detailstransferts (insert)
          tx.executeSql(
            'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
            [
              'detailstransferts',
              null,
              'insert',
              JSON.stringify({
                transferts_id: selectedTransfert.id,
                stockmanuels_id: newDetail.stockmanuels_id,
              }),
              new Date().toISOString(),
            ],
          );
          handleDetails(selectedTransfert);
          setNewDetail({stockmanuels_id: ''});
        },
      );
    });
  };

  const handleDeleteDetail = stockmanuelsId => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM detailstransferts WHERE transferts_id = ? AND stockmanuels_id = ?',
        [selectedTransfert.id, stockmanuelsId],
        () => {
          // Insertion dans sync_log pour detailstransferts (delete)
          tx.executeSql(
            'INSERT INTO sync_log (table_name, record_id, action, data, last_modified) VALUES (?, ?, ?, ?, ?)',
            [
              'detailstransferts',
              selectedTransfert.id,
              'delete',
              JSON.stringify({
                transferts_id: selectedTransfert.id,
                stockmanuels_id: stockmanuelsId,
              }),
              new Date().toISOString(),
            ],
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
      <Button
        title="Ajouter un Transfert"
        onPress={handleAjouterTransfert}
        /* onPress={() => {
          setShowForm(true);
        }}*/
      />
      <FlatList
        //data={transferts}
        data={transferts.filter(
          item =>
            item.etablissement1_nom
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            item.etablissement2_nom
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
            {/*<Text>Etablissement 1: {item.etablissements_id}</Text>
            <Text>Etablissement 2: {item.etablissements_id1}</Text>*/}
            <Text>Etablissement 1: {item.etablissement1_nom}</Text>
            <Text>Etablissement 2: {item.etablissement2_nom}</Text>
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
            <Text>Etablissement de départ</Text>
            <CustomPicker
              selectedId={formData.etablissements_id}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('etablissements_id', itemValue)
              }
              items={etablissements.map(etablissement => ({
                label: etablissement.nometablissement,
                value: etablissement.id,
              }))}
              placeholder="Sélectionner Etablissement 1"
            />
            <Text>Etablissement d'accueil</Text>
            <CustomPicker
              selectedId={formData.etablissements_id1}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('etablissements_id1', itemValue)
              }
              items={etablissements.map(etablissement => ({
                label: etablissement.nometablissement,
                value: etablissement.id,
              }))}
              placeholder="Sélectionner Etablissement 2"
            />
            <Text>Type de manuels</Text>
            <CustomPicker
              selectedId={formData.typemanuels_id}
              style={styles.picker}
              onValueChange={itemValue =>
                handleChange('typemanuels_id', itemValue)
              }
              items={typesManuels.map(typeManuel => ({
                label: typeManuel.libelletypemanuel,
                value: typeManuel.id,
              }))}
              placeholder="Sélectionner Type Manuel"
            />
            <Text>Niveau</Text>
            <CustomPicker
              selectedId={formData.classes_id}
              style={styles.picker}
              onValueChange={itemValue => handleChange('classes_id', itemValue)}
              items={classes.map(classe => ({
                label: classe.libelleclasse,
                value: classe.id,
              }))}
              placeholder="Sélectionner Classe"
            />

            <Text>Quantité</Text>
            <TextInput
              style={styles.input}
              placeholder="Quantité"
              value={formData.quantite.toString()}
              onChangeText={text =>
                handleChange('quantite', parseInt(text, 10))
              }
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
            {/* <View style={styles.addDetailContainer}>
              <TextInput
                style={styles.input}
                placeholder="Stock Manuel ID"
                value={newDetail.stockmanuels_id}
                onChangeText={text =>
                  handleDetailChange('stockmanuels_id', text)
                }
              />
              <Button title="Ajouter" onPress={handleAddDetail} />
            </View>*/}
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
    flexDirection: 'row', // ou 'column' pour une disposition verticale
    justifyContent: 'space-around',
    marginTop: 10,
  },

  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalContainer: {
    // Nouveau style pour le conteneur du modal
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fond semi-transparent
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '80%', // Ajustez la largeur selon vos besoins
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
  addDetailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
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
