import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Image,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import {db} from '../../db/database';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useEtablissementId from '../../parametres/etablissement.js';
import RemiseEleveDetails from './RemiseEleveDetails';

const ElevesInscrits = ({navigation}) => {
  const [eleves, setEleves] = useState([]);
  const [searchText, setSearchText] = useState('');
  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();
  const [retourEleveDetailsVisible, setRetourEleveDetailsVisible] =
    useState(false);
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [retourEleveDetailsEditable, setRetourEleveDetailsEditable] =
    useState(true);

  const generateReceiptPDF = useCallback(async eleve => {
    try {
      //console.log('mon eleve: ', eleve);
      const details = await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            //'SELECT m.titre AS manuel_name, me.nombremanuel FROM manuelseleves me JOIN manuels m ON me.manuels_id = m.id WHERE me.elevesinscrits_id = ?;',
            'SELECT m.titre AS manuel_name,etm.etatmanuel,sto.referenceexemplaire FROM manuelseleves me JOIN manuels m ON me.manuels_id = m.id JOIN  etatmanuels etm ON me.etatmanuelsremiseeleve_id = etm.id  JOIN stockmanuels sto on sto.id = me.exemplairemanuelseleve_id WHERE me.elevesinscrits_id = ?;',
            [eleve.id],
            (_, results) => resolve(results.rows.raw()),
            (_, error) => reject(error),
          );
        });
      });
      // console.log('moneleve: ', eleve);
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
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
                      <div class="heading-section">
        <table>


            <tr>
                <td>MINISTERE DE L'EDUCATION NATIONALE ET DE L'ALPHABETISATION</td>

                <td>REPUBLIQUE DE COTE D'IVOIRE</td>


            </tr>
            <tr>

                <td>--------------------------------------------------------------------------------------------------
                </td>
                <td>--------------------------------------------------------------</td>

            </tr>

            <tr>


                <td>BOURSE NATIONALE DU MANUEL SCOLAIRE </td>

                <td>Union - Discipline - Travail</td>

            </tr>


          <tr>
          
                <td><Image source={require('./logobonamas.png')} alt="" width="100"> </td>
                
               <!-- <td><img src="images/logomenet.png" alt="" width="150"> </td>

                <td> <Image source={require('images/armoirie.png')} alt="" width="50"> </td>-->



            </tr>


        </table>
    </div>


    <div class="title">
        <div style="border-top: 1px solid #000;"></div>
        <p style="font-weight: bold;">FICHE BONAMAS</p>
        <div style="border-bottom: 1px solid #000;"></div>
        <!--<p style="font-style: italic;">Source: Fichier National des Elèves du secondaire (FNE)</p>-->
        <p style="font-weight: bold;">Année scolaire :...</p>

    </div>
    <div class="title">

        <p style="font-weight: bold;">Remise numero:....</p>


    </div>
                          <h1>Reçu de Remise de Manuels</h1>
                          <h2>Élève: ${eleve.eleve}</h2>                        
                          <p>Année scolaire: ${eleve.annee_scolaire}</p>
                          <p>DRENA: ${eleve.drena}</p>
                          <p>Établissement: ${eleve.etablissement}</p>
                          <p>Classe: ${eleve.classe}</p>
                          <h3>Détails des Manuels</h3>
                          <table>
                              <thead>
                                  <tr>
                                      <th>Matiere</th>
                                      <th>Reference</th>
                                      <th>Etat livré</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${details
                                    .map(
                                      detail => `
                                      <tr>
                                          <td>${detail.manuel_name}</td>
                                          <td>${detail.referenceexemplaire}</td>
                                          <td>${detail.etatmanuel}</td>
                                      </tr>
                                  `,
                                    )
                                    .join('')}
                              </tbody>
                          </table >
                             <div class="nb" style="">
    <table style="border:none;">
        <tr>
            <td style="border:none;"> Nom,prénoms,contact et signature du tuteur légal     </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">  </td>
            <td style="border:none;">       </td>
            <td style="border:none;">       </td>
            <td style="border:none;">     </td>
            <td style="border:none;">    </td>
            <td style="border:none;">     </td>
            <td style="border:none;">      </td>
            <td style="border:none;">       </td>
            <td style="border:none;">        </td>
            <td style="border:none;">Cachet et Signature </td>
        </tr>
    </table>
        <!--<div class="nb" style="">
        <br>
        <br>
            <p style="font-weight: bold;">TUTEUR LEGAL</p>
            <p>(Nom; prénoms,contact et signature)</p><br><br><br>
        </div>
        <p style="font-weight: bold;">Note importante</p>-->
        
        <p style=" padding-left: 10px"><span style="font-weight: bold;">Note importante </span><br>Les manuels scolaires sont la propriété du Ministère de l'Education Nationale et
            de l'Alphabetisation.<br>
            La vente des manuels remis aux élèves est passible de poursuites judiciaires.<br>
	   Le tuteur/parent s'engage à régler les pénalités en cas de perte ou de dégradation des manuels.<br><span style="font-weight: bold;">Imprimé le ${formattedDate}</span></p>
  </div>
                      </body>
                  </html>
              `;

      let options = {
        html: htmlContent,
        fileName: `reçu_remise_eleve_${eleve.id}`,
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
  }, []);

  const fetchManuelEleves = useCallback((eleveId, callback) => {
    if (!eleveId) {
      console.error(
        'fetchManuelEleves: eleveId est invalide (undefined ou null)',
      );
      callback([]); // Retourner un tableau vide en cas d'erreur
      return;
    }

    db.transaction(tx => {
      //console.log('eleveID :', eleveId);
      tx.executeSql(
        // 'SELECT m.titre AS manuel_name, me.nombremanuel FROM manuelseleves me JOIN manuels m ON me.manuels_id = m.id WHERE me.elevesinscrits_id = ?;',
        'SELECT m.titre AS manuel_name,etm.etatmanuel,sto.referenceexemplaire FROM manuelseleves me JOIN manuels m ON me.manuels_id = m.id JOIN  etatmanuels etm ON me.etatmanuelsremiseeleve_id = etm.id  JOIN stockmanuels sto on sto.id = me.exemplairemanuelseleve_id WHERE me.elevesinscrits_id = ?;',
        [eleveId],
        (_, results) => {
          if (results.rows.length > 0) {
            callback(results.rows.raw());
          } else {
            callback([]); // Retourner un tableau vide si aucun résultat
          }
        },
        (_, error) => {
          console.error(
            "Erreur lors de la récupération des détails des manuels pour l'élève inscrit",
            error,
          );
          callback([]);
        },
      );
    });
  }, []);

  const fetchElevesInscrits = useCallback(() => {
    db.transaction(tx => {
      let query = `
            SELECT
                ei.id,
                ei.reference,
                a.libelleanneescolaire AS annee_scolaire,
                e.matriculeeleve || ' - ' || e.nomeleve || ' ' || e.prenomseleve AS eleve,
                e.datenaissanceeleve AS datedenaissance,
                e.lieunaissanceeleve AS lieudenaissance,
                et.nometablissement AS etablissement,
                c.libelleclasse AS classe,
                ei.penalite,
                ei.presouscrit,
                ei.souscrit,
                ei.nombremanuelsremiseleve,
                d.designation AS drena,
                ei.remisefinalise
            FROM elevesinscrits ei
            JOIN anneescolaires a ON ei.anneescolaires_id = a.id
            JOIN eleves e ON ei.eleves_id = e.id
            JOIN etablissements et ON ei.etablissements_id = et.id
            JOIN classes c ON ei.classes_id = c.id
            JOIN drenas d ON et.drenas_id = d.id
            WHERE ei.presouscrit = 1 AND ei.anneescolaires_id = ? AND ei.etablissements_id = ?
        `;

      let params = [anneescolairesID, etablissementsID];

      if (searchText) {
        query += ` AND (e.nomeleve LIKE ? OR e.matriculeeleve LIKE ? OR e.prenomseleve LIKE ?)`;
        params = [
          ...params,
          `%${searchText}%`,
          `%${searchText}%`,
          `%${searchText}%`,
        ];
      }

      tx.executeSql(
        query,
        params,
        (_, result) => {
          let rows = result.rows.raw();
          let elevesWithDetails = [];
          let completed = 0;

          if (rows.length === 0) {
            setEleves([]);
          } else {
            rows.forEach(eleve => {
              if (eleve && eleve.id) {
                fetchManuelEleves(eleve.id, details => {
                  elevesWithDetails.push({...eleve, details});
                  completed++;

                  if (completed === rows.length) {
                    setEleves(elevesWithDetails);
                    //console.log('eleves:', elevesWithDetails);
                  }
                });
              } else {
                console.error("Identifiant d'élève invalide:", eleve);
                completed++;

                if (completed === rows.length) {
                  setEleves(elevesWithDetails);
                  // console.log('eleves:', elevesWithDetails);
                }
              }
            });
          }
        },
        (_, error) => {
          console.error(
            'Erreur lors de la récupération des élèves inscrits :',
            error,
          );
        },
      );
    });
  }, [searchText, anneescolairesID, etablissementsID, fetchManuelEleves]);

  useEffect(() => {
    fetchElevesInscrits();
  }, [fetchElevesInscrits]);

  const handleFinaliserRetour = useCallback(item => {
    setSelectedEleve(item);
    setRetourEleveDetailsEditable(true);
    setRetourEleveDetailsVisible(true);
  }, []);

  const handleEditerRetour = useCallback(item => {
    setSelectedEleve(item);
    setRetourEleveDetailsEditable(item.remisefinalise === 0);
    setRetourEleveDetailsVisible(true);
  }, []);

  const handleTelechargerPDF = useCallback(
    item => {
      generateReceiptPDF(item);
    },
    [generateReceiptPDF],
  );

  const closeRetourEleveDetails = useCallback(() => {
    setRetourEleveDetailsVisible(false);
  }, []);
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher par nom, matricule ou prénom"
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="black"
      />
      <FlatList
        data={eleves}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.card}>
            {/*<Text style={styles.text}>
              <Text style={styles.bold}>ElevesInscritId :</Text> {item.id}
            </Text>*/}
            <Text style={styles.text}>
              <Text style={styles.bold}>Élève :</Text> {item.eleve}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Classe :</Text> {item.classe}
            </Text>
            {/*<Text style={styles.text}>
              <Text style={styles.bold}>Établissement :</Text>
              {item.etablissement}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Année :</Text> {item.annee_scolaire}
            </Text>*/}
            <Text style={styles.text}>
              <Text style={styles.bold}>Pénalité :</Text> {item.penalite} FCFA
            </Text>
            {/*<Text style={styles.text}>
              <Text style={styles.bold}>Souscrit :</Text>
              {item.souscrit ? 'Oui' : 'Non'}
            </Text>*/}
            <View style={styles.actions}>
              {item.retourfinalise === 1 ? (
                <>
                  <TouchableOpacity style={styles.redButton}>
                    <Text style={styles.whiteText}>Déjà finalisée</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleTelechargerPDF(item)}
                    style={styles.blueButton}>
                    <Text style={styles.whiteText}>Reçu</Text>
                  </TouchableOpacity>
                  {/*<TouchableOpacity
                    onPress={() => {
                      //handleEditerRemise(item);
                      navigation.navigate('RetourEleveDetails', {
                        eleveInscritId: item.id,
                      }); // 123 est l'ID de la commande
                    }}
                    // onPress={() => handleEditerRemise(item)}
                    style={styles.blueButton}>
                    <Text style={styles.whiteText}>Editer</Text>
                  </TouchableOpacity>*/}
                </>
              ) : (
                <>
                  {/* <TouchableOpacity
                    onPress={() => {
                      handleFinaliserRetour(item);
                      navigation.navigate('RetourEleveDetails', {
                        eleveInscritId: item.id,
                      }); // 123 est l'ID de la commande
                    }}
                    style={styles.blueButton}>
                    <Text style={styles.whiteText}>Finaliser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.blueButton}>
                    <Text style={styles.whiteText}>Non disponible</Text>
                  </TouchableOpacity>*/}
                  <TouchableOpacity
                    onPress={() => {
                      //  handleEditerRemise(item);
                      navigation.navigate('RetourEleveDetails', {
                        eleveInscritId: item.id,
                      }); // 123 est l'ID de la commande
                    }}
                    style={styles.blueButton}>
                    <Text style={styles.whiteText}>Editer</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      />
      <Modal
        visible={retourEleveDetailsVisible}
        onRequestClose={closeRetourEleveDetails}
        transparent={true}
        animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <RemiseEleveDetails
              eleve={selectedEleve}
              editable={retourEleveDetailsEditable}
              onClose={closeRetourEleveDetails}
              refreshEleves={fetchElevesInscrits}
            />
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
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 5,
    color: 'black',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    marginVertical: 2,
  },
  bold: {
    fontWeight: 'bold',
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
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
});

export default ElevesInscrits;
