import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TextInput} from 'react-native';
import {db} from '../../db/database';
import useAnneescolairesID from '../../parametres/anneescolaire.js';
import useEtablissementId from '../../parametres/etablissement.js';

const ElevesInscrits = () => {
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
          ei.souscrit 
        FROM elevesinscrits ei
        JOIN anneescolaires a ON ei.anneescolaires_id = a.id
        JOIN eleves e ON ei.eleves_id = e.id
        JOIN etablissements et ON ei.etablissements_id = et.id
        JOIN classes c ON ei.classes_id = c.id
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
          const rows = result.rows.raw();
          setEleves(rows);
        },
        (_, error) => {
          console.error(
            'Erreur lors de la récupération des élèves inscrits :',
            error,
          );
        },
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* 🟢 Notification du total */}
      <View style={styles.notification}>
        <Text style={styles.notificationText}>
          Total des élèves inscrits :{' '}
          <Text style={styles.count}>{eleves.length}</Text>
        </Text>
      </View>

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
            <Text style={styles.text}>
              <Text style={styles.bold}>Élève :</Text> {item.eleve}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>Classe :</Text> {item.classe}
            </Text>
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
  notification: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  count: {
    color: '#ffd700',
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
});

export default ElevesInscrits;
