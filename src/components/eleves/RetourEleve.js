import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {TextInput as PaperTextInput, List, Divider, Button as PaperButton} from 'react-native-paper';

import {db} from '../../db/database';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useEtablissementId from '../../parametres/etablissement.js';
import {useFocusEffect} from '@react-navigation/native';

const ElevesInscrits = ({navigation}) => {
  const [eleves, setEleves] = useState([]);
  const [searchText, setSearchText] = useState('');
  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();

  const fetchElevesInscrits = useCallback(() => {
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
          ei.remisefinalise,
          ei.retourfinalise,
          (SELECT COUNT(*) FROM manuelseleves me
           WHERE me.elevesinscrits_id = ei.id
             AND me.exemplairemanuelseleve_id IS NOT NULL) AS nb_remis,
          (SELECT COUNT(*) FROM manuelseleves me
           WHERE me.elevesinscrits_id = ei.id
             AND me.exemplairemanuelseleve_id IS NOT NULL
             AND me.etatmanuelsretoureleve_id IS NOT NULL) AS nb_retournes_renseignes
        FROM elevesinscrits ei
        JOIN anneescolaires a ON ei.anneescolaires_id = a.id
        JOIN eleves e ON ei.eleves_id = e.id
        JOIN etablissements et ON ei.etablissements_id = et.id
        JOIN classes c ON ei.classes_id = c.id
        WHERE ei.remisefinalise = 1
          AND ei.anneescolaires_id = ?
          AND ei.etablissements_id = ?
      `;

      let params = [anneescolairesID, etablissementsID];

      if (searchText) {
        query += ` AND (
          UPPER(e.nomeleve) LIKE ?
          OR UPPER(e.prenomseleve) LIKE ?
          OR UPPER(e.matriculeeleve) LIKE ?
          OR UPPER(COALESCE(e.nomeleve,'') || ' ' || COALESCE(e.prenomseleve,'')) LIKE ?
        )`;
        const like = `%${searchText.toUpperCase()}%`;
        params.push(like, like, like, like);
      }

      tx.executeSql(
        query,
        params,
        (_, result) => setEleves(result.rows.raw()),
        (_, error) =>
          console.error('Erreur récupération élèves inscrits :', error),
      );
    });
  }, [searchText, anneescolairesID, etablissementsID]);

  useEffect(() => {
    fetchElevesInscrits();
  }, [fetchElevesInscrits]);

  useFocusEffect(
    useCallback(() => {
      fetchElevesInscrits();
    }, [fetchElevesInscrits]),
  );

  return (
    <View style={styles.container}>
      <PaperTextInput
        mode="outlined"
        style={styles.searchInput}
        placeholder="Rechercher par nom, matricule ou prénom"
        value={searchText}
        onChangeText={setSearchText}
        left={<PaperTextInput.Icon icon="magnify" />}
      />
      <FlatList
        data={eleves}
        keyExtractor={item => item.id.toString()}
        ItemSeparatorComponent={Divider}
        renderItem={({item}) => {
          const tousRenseignes =
            item.nb_remis > 0 && item.nb_remis === item.nb_retournes_renseignes;

          return (
            <List.Item
              title={item.eleve}
              titleNumberOfLines={3}
              titleEllipsizeMode="tail"
              description={() => (
                <View>
                  <Text style={styles.text}>Classe : {item.classe}</Text>
                  {item.retourfinalise === 0 && item.nb_remis > 0 && (
                    <Text style={styles.progression}>
                      États renseignés : {item.nb_retournes_renseignes}/{item.nb_remis}
                    </Text>
                  )}
                  {item.retourfinalise === 1 && item.penalite > 0 && (
                    <Text style={styles.penalite}>
                      Pénalité : {item.penalite} FCFA
                    </Text>
                  )}
                </View>
              )}
              left={props => <List.Icon {...props} icon="account" />}
              right={() => (
                <View style={styles.rightContainer}>
                  {item.retourfinalise === 1 ? (
                    <PaperButton
                      mode="contained"
                      disabled
                      compact
                      style={styles.doneButton}
                      labelStyle={styles.doneButtonLabel}>
                      Retourné
                    </PaperButton>
                  ) : (
                    <PaperButton
                      mode="contained"
                      buttonColor={tousRenseignes ? '#2e7d32' : undefined}
                      compact
                      onPress={() =>
                        navigation.navigate('RetourEleveDetails', {
                          eleveInscritId: item.id,
                        })
                      }>
                      {tousRenseignes ? 'Finaliser' : 'Editer'}
                    </PaperButton>
                  )}
                </View>
              )}
            />
          );
        }}
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
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 5,
    color: 'black',
  },
  text: {
    fontSize: 14,
    marginVertical: 1,
  },
  progression: {
    fontSize: 13,
    color: '#e65100',
    marginTop: 2,
  },
  penalite: {
    fontSize: 14,
    marginVertical: 2,
    color: 'red',
    fontWeight: '600',
  },
  rightContainer: {
    justifyContent: 'center',
    paddingLeft: 4,
  },
  doneButton: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    minWidth: 10,
  },
  doneButtonLabel: {
    fontSize: 10,
  },
});

export default ElevesInscrits;
