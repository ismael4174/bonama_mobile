import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import {TextInput as PaperTextInput, List, Divider, Button as PaperButton} from 'react-native-paper';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {db} from '../../db/database';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomPicker from '../CustomPicker';
import RemiseCeDetails from './RemiseCeDetails'; // Importez le composant RemiseCeDetails
import useEtablissementId from '../../parametres/etablissement.js';
import {useFocusEffect} from '@react-navigation/native';

/*const dbName = 'bd_bonamas_local.db';
const db = SQLite.openDatabase({name: dbName, location: 'default'});
*/
const CeInscrits = ({navigation}) => {
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
  const [etablissementIdInteger, setEtablissementIdInteger] = useState(null);
  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, titre FROM manuels;',
        [],
        (_, results) => {
          setManuels(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des manuels', error),
      );
    });
  }, []);
  useEffect(() => {
    const fetchEtablissementId = async () => {
      try {
        const etablissementIdString = await AsyncStorage.getItem(
          'etablissements_id',
        );
        if (etablissementIdString) {
          const id = parseInt(etablissementIdString, 10);
          setEtablissementIdInteger(id);
          console.log("Identifiant de l'établissement (entier) :", id);
        } else {
          console.error(
            "Erreur : identifiant d'établissement non trouvé dans AsyncStorage.",
          );
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'identifiant d'établissement :",
          error,
        );
      }
    };
    fetchEtablissementId();
  }, []);

  const generateReceiptPDF = useCallback(
    async commande => {
      try {
        const entete = {
          id: commande.id,
          //ues_name: ueselect(commande.ues_id),
          ues_name: commande.ues_id,
          anneescolaire_name: anneescolaire(commande.anneescolaires_id),
          nombretotalmanuel: commande.nombretotalmanuel,
          datesouscription: commande.datesouscription,
        };

        const details = commande.details.map(detail => ({
          manuel_name: manuel(detail.manuels_id),
          nombremanuel: detail.nombremanuel,
        }));

        const htmlContent = `
            <html>
                <head>
                    <style>
                        body { font-family: sans-serif; }
                        h1, h2 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Reçu de Commande</h1>
                    <h2>Commande N° ${entete.id}</h2>
                    <p>CE: ${entete.ues_name}</p>
                    <p>Année scolaire: ${entete.anneescolaire_name}</p>
                    <p>Nombre total de manuels: ${entete.nombretotalmanuel}</p>
                    <p>Date de souscription: ${entete.datesouscription}</p>

                    <h3>Détails des Manuels</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Manuel</th>
                                <th>Quantité</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details
                              .map(
                                detail => `
                                <tr>
                                    <td>${detail.manuel_name}</td>
                                    <td>${detail.nombremanuel}</td>
                                </tr>
                            `,
                              )
                              .join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        let options = {
          html: htmlContent,
          fileName: `reçu_commande_${commande.id}`,
          directory: RNFS.DocumentDirectoryPath,
        };

        let file = await RNHTMLtoPDF.convert(options);

        Share.open({
          url: 'file://' + file.filePath,
          type: 'application/pdf',
        }).catch(err => {
          err && console.log(err);
        });
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
      }
    },
    [ueselect, anneescolaire, manuel],
  );

  const fetchCommandes = useCallback(() => {
    if (!etablissementIdInteger || !anneescolairesID) return; // Vérifier si les IDs sont disponibles

    db.transaction(
      tx => {
        tx.executeSql(
          `SELECT details.*, commandesues.*
         FROM commandesues
         INNER JOIN detailscommandeues AS details ON commandesues.id = details.commandesues_id
         INNER JOIN ues ON ues.id = commandesues.ues_id
         WHERE ues.etablissements_id = ?
           AND commandesues.anneescolaires_id = ?
           AND commandesues.souscrit = 1;`,
          [etablissementIdInteger, anneescolairesID],
          (_, results) => {
            const rows = results.rows.raw();
            const commandes = [];
            const commandesMap = {};

            rows.forEach(row => {
              const commandeId = row.id;
              if (!commandesMap[commandeId]) {
                commandesMap[commandeId] = {
                  ...row,
                  details: [],
                };
                commandes.push(commandesMap[commandeId]);
              }
              commandesMap[commandeId].details.push({
                ...row,
              });
            });
            setCommandes(commandes);
          },
          (_, error) => {
            console.error(
              'Erreur lors de la récupération des commandes et détails :',
              error,
            );
          },
        );
      },
      error => {
        console.error(
          'Erreur de transaction lors de la récupération des commandes et détails :',
          error,
        );
      },
    );
  }, [etablissementIdInteger, anneescolairesID]); // Ajouter anneescolairesID comme dépendance

  useEffect(() => {
    fetchCommandes();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, results) => {
          setAnnees(results.rows.raw());
        },
        error =>
          console.log('Erreur lors du chargement des années scolaires', error),
      );

      tx.executeSql(
        'SELECT id, denominationue FROM ues;',
        [],
        (_, results) => {
          setUes(results.rows.raw());
        },
        error => console.log('Erreur lors du chargement des CE', error),
      );
    });
  }, [fetchCommandes, generateReceiptPDF]);

  useFocusEffect(
    useCallback(() => {
      fetchCommandes();
    }, [fetchCommandes]),
  );

  const handleSearch = useCallback(text => {
    setSearchText(text);
  }, []);

  const anneescolaire = useCallback(
    id => {
      const monannee = annees.find(e => e.id === id);
      return monannee ? monannee.libelleanneescolaire : 'Inconnu';
    },
    [annees],
  );

  const ueselect = useCallback(
    id => {
      const monue = ues.find(e => e.id === id);
      return monue ? monue.denominationue : 'Inconnu';
    },
    [ues],
  );
  const manuel = useCallback(
    id => {
      const monmanuel = manuels.find(e => e.id === id);
      return monmanuel ? monmanuel.titre : 'Inconnu';
    },
    [manuels],
  );
  ////////// traitement de la remise//////////////////////////////////
  /* const [remiseCeDetailsVisible, setRemiseCeDetailsVisible] = useState(false);
  const [selectedCommandeForRemise, setSelectedCommandeForRemise] =
    useState(null);
  const [remiseCeDetailsEditable, setRemiseCeDetailsEditable] = useState(true);

  const handleFinaliserRemise = useCallback(item => {
    setSelectedCommandeForRemise(item);
    setRemiseCeDetailsEditable(true);
    setRemiseCeDetailsVisible(true);
  }, []);

   const handleEditerRemise = useCallback(item => {
    setSelectedCommandeForRemise(item);
    setRemiseCeDetailsEditable(item.remiseuefinalise === 0);
    setRemiseCeDetailsVisible(true);
  }, []);*/

  const handleTelechargerPDF = useCallback(
    item => {
      generateReceiptPDF(item);
    },
    [generateReceiptPDF],
  );

  /* const closeRemiseCeDetails = useCallback(() => {
    setRemiseCeDetailsVisible(false);
  }, []);*/

  //////////////////////////////////////////////////
  const memoizedCommandes = useMemo(() => {
    return commandes.map(commande => ({
      ...commande,
      ues_name: ueselect(commande.ues_id),
      anneescolaire_name: anneescolaire(commande.anneescolaires_id),
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
    <View style={styles.container}>
      <PaperTextInput
        mode="outlined"
        style={styles.searchInput}
        placeholder="Rechercher un CE ou une année scolaire"
        value={searchText}
        onChangeText={handleSearch}
        left={<PaperTextInput.Icon icon="magnify" />}
      />

      <FlatList
        data={filteredCommandes}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Divider}
        renderItem={({item}) => (
          <List.Item
            title={`  ${item.ues_name}`}
            titleNumberOfLines={3}
            titleEllipsizeMode="tail"
            description={() => (
              <View>
                {item.details.map((detail, idx) => (
                  <View key={`${item.id}-${idx}`} style={styles.detailBlock}>
                    <Text style={styles.detailText}>Manuel: {manuel(detail.manuels_id)}</Text>
                    <Text style={styles.detailText}>Quantité: {detail.nombremanuel}</Text>
                  </View>
                ))}
              </View>
            )}
            left={props => <List.Icon {...props} icon="account-group" />}
            right={props => (
              <View style={{justifyContent: 'center'}}>
                {item.remiseuefinalise === 0 ? (
                  <PaperButton
                    mode="contained"
                    onPress={() =>
                      navigation.navigate('RemiseCeDetails', {commandeId: item.id})
                    }>
                    Éditer
                  </PaperButton>
                ) : (
                  <PaperButton
                    mode="contained"
                    disabled
                    compact
                    style={{paddingHorizontal: 4, paddingVertical: 0, minWidth: 10}}
                    labelStyle={{fontSize: 10}}>
                    Déjà finalisée
                  </PaperButton>
                )}
              </View>
            )}
          />
        )}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 42,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    color: 'black',
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  detailBlock: {
    marginBottom: 6,
    marginLeft: 10,
  },
  detailText: {
    fontSize: 15,
    color: '#444',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  buttonBlue: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonRed: {
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

/*const styles = StyleSheet.create({
  container: {padding: 10},
  inputContainer: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
    //width: '40%', // Ajout d'une largeur pour contrôler la taille
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
  title: {fontSize: 15, fontWeight: 'bold'},
  //actions: {flexDirection: 'row', justifyContent: 'space-between'},
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {backgroundColor: 'white', padding: 20, borderRadius: 10},
  detailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  blueButton: {
    backgroundColor: 'blue',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  redButton: {
    backgroundColor: 'red',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  whiteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});*/

export default CeInscrits;
