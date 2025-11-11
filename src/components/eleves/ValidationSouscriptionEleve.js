import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import uuid from 'react-native-uuid';

import {db} from '../../db/database';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useEtablissementId from '../../parametres/etablissement.js';

const ElevesInscritsvalidation = () => {
  const [eleves, setEleves] = useState([]);
  const [searchText, setSearchText] = useState('');
  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();

  useEffect(() => {
    fetchElevesInscrits();
  }, [searchText, anneescolairesID, etablissementsID]);

  const fetchElevesInscrits = () => {
    db.transaction(tx => {
      let query = `
        SELECT
          ei.id,
          ei.reference,
          a.libelleanneescolaire AS annee_scolaire,
          e.matriculeeleve || ' - ' || e.nomeleve || ' ' || e.prenomseleve AS eleve,
          et.nometablissement AS etablissement,
          c.libelleclasse AS classe,
          ei.penalite,
          ei.presouscrit,
          ei.souscrit,
          ei.classes_id  -- Ajout de classes_id ici pour la récupération
        FROM elevesinscrits ei
        JOIN anneescolaires a ON ei.anneescolaires_id = a.id
        JOIN eleves e ON ei.eleves_id = e.id
        JOIN etablissements et ON ei.etablissements_id = et.id
        JOIN classes c ON ei.classes_id = c.id
        WHERE ei.presouscrit = 1 AND ei.souscrit = 0 AND ei.anneescolaires_id = ? AND ei.etablissements_id = ?
      `;

      let params = [anneescolairesID, etablissementsID]; // Paramètres pour les filtres

      if (searchText) {
        query += ` AND (e.nomeleve LIKE ? OR e.matriculeeleve LIKE ? OR e.prenomseleve LIKE ?)`;
        params = [
          ...params,
          `%${searchText}%`,
          `%${searchText}%`,
          `%${searchText}%`,
        ]; // Paramètres pour la recherche
      }

      tx.executeSql(
        query,
        params,
        (_, result) => {
          let rows = result.rows.raw();
          setEleves(rows);
          console.log('--- Élèves fetchées (fetchElevesInscrits) ---');
          console.log(rows);
          console.log('-------------------------------------------');
        },
        (_, error) => {
          console.error(
            'Erreur lors de la récupération des élèves inscrits (fetchElevesInscrits) :',
            error,
          );
        },
      );
    });
  };

  const confirmValidation = eleveId => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment valider cet élève ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Oui',
          onPress: () => handleValidation(eleveId), // exécute la validation si confirmé
        },
      ],
      {cancelable: true},
    );
  };

  const handleValidation = eleveId => {
    db.transaction(
      tx => {
        console.log(
          `--- Début de la validation pour l'élève ID: ${eleveId} ---`,
        );

        tx.executeSql(
          `SELECT classes_id, uuid FROM elevesinscrits WHERE id = ?`,
          [eleveId],
          (tx, result) => {
            if (result.rows.length === 0) {
              Alert.alert('Erreur', 'Élève introuvable.');
              return;
            }

            const {classes_id: classeId, uuid: eleveUuid} = result.rows.item(0);
            let finalEleveUuid = eleveUuid;

            // ➕ Si l'élève n'a pas d'UUID, on en génère un et on le met à jour en base
            if (!finalEleveUuid) {
              finalEleveUuid = uuid.v4();
              tx.executeSql(
                `UPDATE elevesinscrits SET uuid = ? WHERE id = ?`,
                [finalEleveUuid, eleveId],
                () =>
                  console.log(
                    `🆕 UUID généré pour élève ${eleveId}: ${finalEleveUuid}`,
                  ),
                (_, err) =>
                  console.error('Erreur mise à jour UUID élève :', err),
              );
            }

            // ✅ Mise à jour souscription
            tx.executeSql(
              `UPDATE elevesinscrits SET souscrit = 1 WHERE id = ?`,
              [eleveId],
              () => {
                console.log(
                  `Souscription mise à jour pour élève ID: ${eleveId}`,
                );

                // 🔍 Récupération des manuels
                tx.executeSql(
                  `SELECT id, typemanuels_id FROM manuels WHERE classes_id = ?`,
                  [classeId],
                  (tx, manuelsResult) => {
                    const manuels = [];
                    for (let i = 0; i < manuelsResult.rows.length; i++) {
                      manuels.push(manuelsResult.rows.item(i));
                    }

                    manuels.forEach(manuel => {
                      if (manuel.typemanuels_id === 1) {
                        // Vérifier existence
                        tx.executeSql(
                          `SELECT id, uuid FROM manuelseleves WHERE elevesinscrits_id = ? AND manuels_id = ?`,
                          [eleveId, manuel.id],
                          (tx, existResult) => {
                            if (existResult.rows.length === 0) {
                              const manuelsUuid = uuid.v4();
                              tx.executeSql(
                                `INSERT INTO manuelseleves (manuels_id, elevesinscrits_id, rendu, uuid) VALUES (?, ?, ?, ?)`,
                                [manuel.id, eleveId, 0, manuelsUuid],
                                (tx, insertResult) => {
                                  const newId = insertResult.insertId;

                                  tx.executeSql(
                                    `INSERT INTO sync_log (table_name, record_id, action, data, uuid, source)
                                   VALUES (?, ?, ?, ?, ?, ?)`,
                                    [
                                      'manuelseleves',
                                      newId,
                                      'insert',
                                      JSON.stringify({
                                        manuels_id: manuel.id,
                                        elevesinscrits_id: eleveId,
                                        rendu: 0,
                                      }),
                                      manuelsUuid,
                                      'local',
                                    ],
                                    () => {
                                      console.log(
                                        `✅ Log sync manuelseleves ID: ${newId}`,
                                      );
                                    },
                                    (_, err) => {
                                      console.error(
                                        'Erreur sync_log manuelseleves :',
                                        err,
                                      );
                                    },
                                  );
                                },
                                (_, err) => {
                                  console.error(
                                    'Erreur insertion manuelseleves :',
                                    err,
                                  );
                                },
                              );
                            } else {
                              console.log(`➡️ Manuel déjà attribué à l'élève`);
                            }
                          },
                          (_, err) => {
                            console.error('Erreur SELECT manuelseleves :', err);
                          },
                        );
                      }
                    });

                    // 🧾 Log sync pour elevesinscrits
                    tx.executeSql(
                      `INSERT INTO sync_log (table_name, record_id, action, data, uuid, source)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                      [
                        'elevesinscrits',
                        eleveId,
                        'update',
                        JSON.stringify({souscrit: 1}),
                        finalEleveUuid,
                        'local',
                      ],
                      () => {
                        console.log('✅ Log sync elevesinscrits inséré');
                      },
                      (_, err) => {
                        console.error('Erreur sync_log elevesinscrits :', err);
                      },
                    );

                    fetchElevesInscrits();
                    Alert.alert(
                      'Succès',
                      "La validation de l'élève et l'attribution des manuels ont été effectuées.",
                    );
                  },
                  (_, err) => {
                    console.error('Erreur SELECT manuels :', err);
                  },
                );
              },
              (_, err) => {
                console.error('Erreur UPDATE elevesinscrits :', err);
              },
            );
          },
          (_, err) => {
            console.error('Erreur SELECT elevesinscrits :', err);
          },
        );
      },
      error => {
        console.error('❌ Erreur de transaction :', error);
        Alert.alert('Erreur', 'La transaction a échoué.');
      },
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher par nom, matricule ou prénom"
        placeholderTextColor="black"
        value={searchText}
        onChangeText={setSearchText}
      />
      <FlatList
        data={eleves}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.text}>
              <Text style={styles.bold}>Élève :</Text> {item.eleve}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Classe :</Text> {item.classe}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Inscrit :</Text>{' '}
              {item.presouscrit ? 'Oui' : 'Non'}
            </Text>
            <Button
              title="Valider"
              onPress={() => confirmValidation(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
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
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
});

export default ElevesInscritsvalidation;
