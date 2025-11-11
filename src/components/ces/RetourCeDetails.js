import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
  Button,
  Alert,
} from 'react-native';
import uuid from 'react-native-uuid';

import SQLite from 'react-native-sqlite-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import API_URL from '../../api/urldeconnexion.js';
import CustomPicker from '../CustomPicker';
import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const ManuelsUES = ({navigation, route}) => {
  const [manuels, setManuels] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentManuel, setCurrentManuel] = useState(null);

  //////////////
  const [etatmanuels, setEtatmanuels] = useState([]);
  const [etatmanuel, setEtatmanuel] = useState([]);
  const [ues, setUes] = useState([]);
  const [ue, setUe] = useState([]);
  const [stockmanuels, setStockmanuels] = useState([]);
  const [stockmanuel, setStockmanuel] = useState([]);
  const [mesManuels, setMesManuels] = useState([]);
  const [monManuel, setMonManuel] = useState([]);
  const {commandeId} = route.params || {}; // Récupération de commandeId depuis les paramètres
  // Variable d'état pour contrôler si les champs sont verrouillés
  const [isLocked, setIsLocked] = useState(true); // Initialisez à 'true' pour qu'ils soient verrouillés par défaut
  const handleFinaliserRetour = () => {
    db.transaction(tx => {
      // Compter le nombre total de manuels pour cette commande
      tx.executeSql(
        'SELECT COUNT(*) as nbreManuel FROM manuelsues WHERE commandesues_id = ?',
        [commandeId],
        (_, results) => {
          const nbreManuel = results.rows.item(0).nbreManuel;

          // Compter le nombre de manuels renseignés (etatmanuelsauretour_id non null)
          tx.executeSql(
            'SELECT COUNT(*) as nbremanuelsrenseignes FROM manuelsues WHERE commandesues_id = ? AND etatmanuelsauretour_id IS NOT NULL',
            [commandeId],
            (_, results) => {
              const nbremanuelsrenseignes =
                results.rows.item(0).nbremanuelsrenseignes;

              if (nbreManuel === nbremanuelsrenseignes) {
                // Mettre à jour la table commandesues
                tx.executeSql(
                  'UPDATE commandesues SET retouruefinalise = 1 WHERE id = ?',
                  [commandeId],
                  () => {
                    // Insertion dans sync_log avec uuid et source
                    const syncData = {
                      retouruefinalise: 1,
                    };
                    tx.executeSql(
                      'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
                      [
                        uuid.v4(),
                        'commandesues',
                        commandeId,
                        'update',
                        JSON.stringify(syncData),
                        'local',
                      ],
                      () => {
                        Alert.alert('Succès', 'Le retour a été finalisé.');
                        navigation.goBack();
                      },
                      (_, error) => {
                        console.error(
                          "Erreur lors de l'insertion dans sync_log :",
                          error,
                        );
                        Alert.alert(
                          'Erreur',
                          'Une erreur est survenue lors de l’insertion dans les logs.',
                        );
                      },
                    );
                  },
                  (_, error) => {
                    console.error(
                      'Erreur lors de la mise à jour du retour :',
                      error,
                    );
                    Alert.alert(
                      'Erreur',
                      'Une erreur est survenue lors de la finalisation.',
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
            (_, error) => {
              console.error(
                'Erreur lors du comptage des manuels renseignés :',
                error,
              );
              Alert.alert('Erreur', 'Une erreur est survenue.');
            },
          );
        },
        (_, error) => {
          console.error('Erreur lors du comptage des manuels :', error);
          Alert.alert('Erreur', 'Une erreur est survenue.');
        },
      );
    });
  };

  /* const handleFinaliserRetour = () => {
    db.transaction(tx => {
      // Compter le nombre total de manuels pour cette commande
      tx.executeSql(
        'SELECT COUNT(*) as nbreManuel FROM manuelsues WHERE commandesues_id = ?',
        [commandeId],
        (_, results) => {
          const nbreManuel = results.rows.item(0).nbreManuel;

          // Compter le nombre de manuels renseignés (exemplairemanuels_id non null)
          tx.executeSql(
            'SELECT COUNT(*) as nbremanuelsrenseignes FROM manuelsues WHERE commandesues_id = ? AND etatmanuelsauretour_id IS NOT NULL',
            [commandeId],
            (_, results) => {
              const nbremanuelsrenseignes =
                results.rows.item(0).nbremanuelsrenseignes;

              // Vérifier si tous les manuels sont renseignés
              if (nbreManuel === nbremanuelsrenseignes) {
                // Mettre à jour commandesues.remisefinaliseue à 1
                tx.executeSql(
                  'UPDATE commandesues SET retouruefinalise = 1 WHERE id = ?',
                  [commandeId],
                  () => {
                    // Insertion dans sync_log après la mise à jour
                    tx.executeSql(
                      'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
                      [
                        'commandesues',
                        commandeId,
                        'update',
                        JSON.stringify({retouruefinalise: 1}),
                      ],
                      () => {
                        Alert.alert('Succès', 'Le retour a été finalisé.');
                        navigation.goBack(); // Retour à l'écran précédent
                      },
                      (_, error) => {
                        console.error(
                          "Erreur lors de l'insertion dans sync_log :",
                          error,
                        );
                        Alert.alert(
                          'Erreur',
                          "Une erreur est survenue lors de l'insertion dans les logs.",
                        );
                      },
                    );
                  },
                  (_, error) => {
                    console.error(
                      'Erreur lors de la mise à jour du retour :',
                      error,
                    );
                    Alert.alert(
                      'Erreur',
                      'Une erreur est survenue lors de la finalisation.',
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
            (_, error) => {
              console.error(
                'Erreur lors du comptage des manuels renseignés :',
                error,
              );
              Alert.alert('Erreur', 'Une erreur est survenue.');
            },
          );
        },
        (_, error) => {
          console.error('Erreur lors du comptage des manuels :', error);
          Alert.alert('Erreur', 'Une erreur est survenue.');
        },
      );
    });
  };*/
  useEffect(() => {
    fetchManuels(commandeId); // Passer commandeId à fetchManuels
    //fetchManuels();
    fetchData();
  }, [commandeId]);
  /* useEffect(() => {
    // createTable();
    fetchManuels();
    fetchData();
  }, []);*/
  const fetchData = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, referenceexemplaire FROM stockmanuels;',
        [],
        (_, results) => {
          setStockmanuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des stocks', error),
      );
      tx.executeSql(
        'SELECT commandesues.id,ues.denominationue FROM commandesues JOIN ues ON ues.id = commandesues.ues_id;',
        [],
        (_, results) => {
          setUes(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des CE', error),
      );
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => {
          setMesManuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
      tx.executeSql(
        'SELECT id, etatmanuel FROM etatmanuels;',
        [],
        (_, results) => {
          setEtatmanuels(results.rows.raw());
        },
        error =>
          console.log('Erreur lors du chargement des etats manuels', error),
      );
    });
  };

  const fetchManuels = commandeId => {
    db.transaction(tx => {
      let sql = 'SELECT * FROM manuelsues';
      let params = [];

      if (commandeId) {
        sql += ' WHERE commandesues_id = ?';
        params.push(commandeId);
      }

      tx.executeSql(sql, params, (_, {rows}) => {
        setManuels(rows.raw());
      });
    });
  };
  /*const fetchManuels = () => {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM manuelsues', [], (_, {rows}) => {
        // setManuels(rows._array);
        setManuels(rows.raw());
      });
    });
  };*/

  const handleSave = () => {
    db.transaction(tx => {
      if (currentManuel?.id) {
        // Cas de mise à jour
        tx.executeSql(
          'UPDATE manuelsues SET commandesues_id=?, manuels_id=?, exemplairemanuels_id=?, etatmanuelsalaremise_id=?, etatmanuelsauretour_id=?, rendu=? WHERE id=?',
          [
            currentManuel.commandesues_id,
            currentManuel.manuels_id,
            currentManuel.exemplairemanuels_id,
            currentManuel.etatmanuelsalaremise_id,
            currentManuel.etatmanuelsauretour_id,
            currentManuel.rendu,
            currentManuel.id,
          ],
          () => {
            fetchManuels();
            tx.executeSql(
              'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
              [
                uuid.v4(),
                'manuelsues',
                currentManuel.id,
                'update',
                JSON.stringify(currentManuel),
                'local',
              ],
            );
          },
        );
      } else {
        // Cas d'insertion
        tx.executeSql(
          'INSERT INTO manuelsues (commandesues_id, manuels_id, exemplairemanuels_id, etatmanuelsalaremise_id, etatmanuelsauretour_id, rendu) VALUES (?, ?, ?, ?, ?, ?)',
          [
            currentManuel.commandesues_id,
            currentManuel.manuels_id,
            currentManuel.exemplairemanuels_id,
            currentManuel.etatmanuelsalaremise_id,
            currentManuel.etatmanuelsauretour_id,
            currentManuel.rendu,
          ],
          (_, result) => {
            fetchManuels();
            tx.executeSql(
              'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
              [
                uuid.v4(),
                'manuelsues',
                result.insertId,
                'insert',
                JSON.stringify(currentManuel),
                'local',
              ],
            );
          },
        );
      }

      setModalVisible(false);
    });
  };

  /* const handleSave = () => {
    db.transaction(tx => {
      if (currentManuel?.id) {
        tx.executeSql(
          'UPDATE manuelsues SET commandesues_id=?, manuels_id=?, exemplairemanuels_id=?, etatmanuelsalaremise_id=?, etatmanuelsauretour_id=?, rendu=? WHERE id=?',
          [
            currentManuel.commandesues_id,
            currentManuel.manuels_id,
            currentManuel.exemplairemanuels_id,
            currentManuel.etatmanuelsalaremise_id,
            currentManuel.etatmanuelsauretour_id,
            currentManuel.rendu,
            currentManuel.id,
          ],
          fetchManuels,
        );
        tx.executeSql(
          'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
          [
            'manuelsues',
            currentManuel.id,
            'update',
            JSON.stringify(currentManuel),
          ],
        );
      } else {
        tx.executeSql(
          'INSERT INTO manuelsues (commandesues_id, manuels_id, exemplairemanuels_id, etatmanuelsalaremise_id, etatmanuelsauretour_id, rendu) VALUES (?, ?, ?, ?, ?, ?)',
          [
            currentManuel.commandesues_id,
            currentManuel.manuels_id,
            currentManuel.exemplairemanuels_id,
            currentManuel.etatmanuelsalaremise_id,
            currentManuel.etatmanuelsauretour_id,
            currentManuel.rendu,
          ],
          (_, result) => {
            fetchManuels();
            tx.executeSql(
              'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
              [
                'manuelsues',
                result.insertId,
                'insert',
                JSON.stringify(currentManuel),
              ],
            );
          },
        );
      }
      setModalVisible(false);
    });
  };*/

  const handleDelete = id => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM manuelsues WHERE id = ?', [id], fetchManuels);
      tx.executeSql(
        //'INSERT INTO sync_log (table_name, record_id, action) VALUES (?, ?, ?)',
        //['manuelsues', id, 'delete'],
        'INSERT INTO sync_log (uuid, table_name, record_id, action, data, source) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid.v4(), 'manuelsues', id, 'delete', null, 'local'],
      );
    });
  };

  return (
    <View style={styles.container}>
      <Button
        title="Retour"
        onPress={() => {
          navigation.goBack();
        }}
      />
      <Button title="Finaliser ce retour" onPress={handleFinaliserRetour} />

      <TextInput
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="black"
        style={styles.searchInput}
      />

      <FlatList
        data={manuels.filter(m =>
          Object.values(m).some(value => value?.toString().includes(search)),
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const monmanuel = mesManuels?.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel ? monmanuel.titre : 'Inconnu';

          const monue = ues?.find(m => m.id === item.commandesues_id);
          const denominationue = monue ? monue.denominationue : 'Inconnu';

          const exemplaire = stockmanuels?.find(
            s => s.id === item.exemplairemanuels_id,
          );
          const monexemplaire = exemplaire
            ? exemplaire.referenceexemplaire
            : 'Inconnu';

          const etatmanuelremise = etatmanuels?.find(
            s => s.id === item.etatmanuelsalaremise_id,
          );
          const monetatremise = etatmanuelremise
            ? etatmanuelremise.etatmanuel
            : 'Inconnu';

          const letatmanuelretour = etatmanuels?.find(
            s => s.id === item.etatmanuelsauretour_id,
          );
          const monetatretour = letatmanuelretour
            ? letatmanuelretour.etatmanuel
            : 'Inconnu';
          return (
            // Trouver le libellé de du manuel
            /* const monmanuel = manuels.find(m => m.id === item.manuels_id);
          const libelleManuel = monmanuel ? monmanuel.titre : 'Inconnu';

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
          
          // Trouver le libellé de l'état du manuel correspondant
          const monetatmanuel = etatmanuels.find(
            et => et.id === item.etatmanuels_id,
          );
          const libelleetatmanuel = monetatmanuel
            ? monetatmanuel.etatmanuel
            : 'Inconnu';
            //////////////////////////*/
            <View style={styles.card}>
              <Text style={styles.title}>Commande: {denominationue}</Text>
              <Text style={styles.title}>Manuel: {libelleManuel}</Text>
              <Text style={styles.title}>Référence: {monexemplaire}</Text>
              <Text style={styles.title}>
                État à la remise: {monetatremise}
              </Text>
              <Text style={styles.title}>État au retour: {monetatretour}</Text>
              <Text style={styles.title}>
                Rendu: {item.rendu ? 'Oui' : 'Non'}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentManuel(item);
                    setModalVisible(true);
                  }}>
                  <Text style={{fontSize: 20}}>✏️</Text>
                </TouchableOpacity>
                {/*<TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={{fontSize: 20}}>🗑️</Text>
                </TouchableOpacity>*/}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* <Text>Commande ID:</Text>
            <TextInput
              value={currentManuel?.commandesues_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({...currentManuel, commandesues_id: text})
              }
              style={styles.input}
            />*/}
            <Text>CE</Text>
            <CustomPicker
              label="Commande"
              items={ues?.map(us => ({
                label: us.denominationue,
                value: us.id,
              }))}
              selectedId={currentManuel?.commandesues_id}
              onValueChange={value =>
                setCurrentManuel({...currentManuel, commandesues_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />
            <Text>Manuel</Text>
            <CustomPicker
              label="Manuel"
              items={mesManuels?.map(mat => ({
                label: mat.titre,
                value: mat.id,
              }))}
              selectedId={currentManuel?.manuels_id}
              onValueChange={value =>
                setCurrentManuel({...currentManuel, manuels_id: value})
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />
            <Text>Exemplaire</Text>
            <CustomPicker
              label="Exemplaire"
              items={stockmanuels?.map(ex => ({
                label: ex.referenceexemplaire,
                value: ex.id,
              }))}
              selectedId={currentManuel?.exemplairemanuels_id}
              onValueChange={value =>
                setCurrentManuel({
                  ...currentManuel,
                  exemplairemanuels_id: value,
                })
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />
            <Text>Etat à la remise</Text>
            <CustomPicker
              label="État Remise"
              items={etatmanuels?.map(etat => ({
                label: etat.etatmanuel,
                value: etat.id,
              }))}
              selectedId={currentManuel?.etatmanuelsalaremise_id}
              onValueChange={value =>
                setCurrentManuel({
                  ...currentManuel,
                  etatmanuelsalaremise_id: value,
                })
              }
              displayKey="label"
              valueKey="value"
              isDisabled={isLocked}
            />
            <Text>Etat au retour</Text>
            <CustomPicker
              label="État Retour"
              items={etatmanuels
                .filter(etat => [1, 2, 6].includes(etat.id))
                .map(etat => ({
                  label: etat.etatmanuel,
                  value: etat.id,
                }))}
              selectedId={currentManuel?.etatmanuelsauretour_id}
              onValueChange={value =>
                setCurrentManuel({
                  ...currentManuel,
                  etatmanuelsauretour_id: value,
                })
              }
              displayKey="label"
              valueKey="value"
            />

            {/*
             <Text>Manuel ID:</Text>
            <TextInput
              value={currentManuel?.manuels_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({...currentManuel, manuels_id: text})
              }
              style={styles.input}
            />

            <Text>Exemplaire ID:</Text>
            <TextInput
              value={currentManuel?.exemplairemanuels_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({...currentManuel, exemplairemanuels_id: text})
              }
              style={styles.input}
            />

            <Text>État à la remise:</Text>
            <TextInput
              value={currentManuel?.etatmanuelsalaremise_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({
                  ...currentManuel,
                  etatmanuelsalaremise_id: text,
                })
              }
              style={styles.input}
            />

            <Text>État au retour:</Text>
            <TextInput
              value={currentManuel?.etatmanuelsauretour_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({
                  ...currentManuel,
                  etatmanuelsauretour_id: text,
                })
              }
              style={styles.input}
            />
            */}

            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text>Rendu :</Text>
              <Switch
                value={currentManuel?.rendu || false} // Vérifie si currentManuel est défini
                onValueChange={value =>
                  setCurrentManuel({...currentManuel, rendu: value})
                }
              />
            </View>

            <Button title="Enregistrer" onPress={handleSave} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>

    /*<View style={styles.card}>
      <TextInput
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      <Button
        title="Ajouter"
        onPress={() => {
          setCurrentManuel({});
          setModalVisible(true);
        }}
      />
      <FlatList
        data={manuels.filter(m =>
          Object.values(m).some(value => value?.toString().includes(search)),
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.container}>
            <Text style={styles.title}>Commande: {item.commandesues_id}</Text>
            <Text style={styles.title}>Manuel: {item.manuels_id}</Text>
            <Text style={styles.title}>
              Exemplaire: {item.exemplairemanuels_id}
            </Text>
            <Text style={styles.title}>
              Etat à la remise: {item.etatmanuelsalaremise_id}
            </Text>
            <Text style={styles.title}>
              Etat au retour: {item.etatmanuelsauretour_id}
            </Text>
            <Text style={styles.title}>
              Rendu: {item.rendu ? 'Oui' : 'Non'}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => {
                  setCurrentManuel(item);
                  setModalVisible(true);
                }}>
                <Text style={{fontSize: 20}}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={{fontSize: 20}}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text>Commande ID:</Text>
            <TextInput
              value={currentManuel?.commandesues_id?.toString() || ''}
              onChangeText={text =>
                setCurrentManuel({...currentManuel, commandesues_id: text})
              }
              style={styles.input}
            />
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text>Rendu :</Text>

              <Switch
                value={currentManuel.rendu}
                onChangeText={text =>
                  setCurrentManuel({...currentManuel, rendu: text})
                }
                //onValueChange={setRendu}
              />
            </View>
            <Button title="Enregistrer" onPress={handleSave} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>*/
  );
};

const styles = StyleSheet.create({
  container: {padding: 10},
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginTop: 10,
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
export default ManuelsUES;
