import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {TextInput as PaperTextInput, List, Divider} from 'react-native-paper';
import {db} from '../../db/database';
import UseAnneescolairesID from '../../parametres/anneescolaire.js';
import UseEtablissementId from '../../parametres/etablissement.js';

const ElevesAttendus = () => {
  const [eleves, setEleves] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Conversion des IDs en entier
  const anneescolairesID = parseInt(UseAnneescolairesID(), 10);
  const etablissementsID = parseInt(UseEtablissementId(), 10);

  useEffect(() => {
    fetchElevesInscrits();
  }, [searchText, anneescolairesID, etablissementsID]);

  const fetchElevesInscrits = () => {
    console.log('Année scolaire (attendus):', anneescolairesID);
    console.log('Établissement (attendus):', etablissementsID);

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
        WHERE ei.anneescolaires_id = ? AND ei.etablissements_id = ?
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

      console.log('Paramètres SQL:', params);

      tx.executeSql(
        query,
        params,
        (_, result) => {
          const rows = result.rows.raw();
          setEleves(rows);
          console.log('Élèves attendus:', rows);
        },
        (_, error) => {
          console.error(
            'Erreur lors de la récupération des élèves attendus :',
            error,
          );
          if (error) {
            if (error.message)
              console.error("Message d'erreur :", error.message);
            if (error.code) console.error("Code d'erreur :", error.code);
            if (error.sql) console.error('Requête SQL échouée :', error.sql);
          }
        },
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* 🟢 Notification du total des élèves attendus */}
      <View style={styles.notification}>
        <Text style={styles.notificationText}>
          Total des élèves attendus :{' '}
          <Text style={styles.count}>{eleves.length}</Text>
        </Text>
      </View>

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
        renderItem={({item}) => (
          <List.Item
            title={item.eleve}
            titleNumberOfLines={3}
            titleEllipsizeMode="tail"
            description={() => (
              <View>
                <Text style={styles.text}>Classe: {item.classe}</Text>
                <Text style={styles.text}>
                  Souscrit: {item.souscrit ? 'Oui' : 'Non'}
                </Text>
              </View>
            )}
            left={props => <List.Icon {...props} icon="account" />}
          />
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
    backgroundColor: '#2196f3', // bleu différent pour distinguer les "attendus"
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
    color: '#ffd700', // jaune pour mettre le total en valeur
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

export default ElevesAttendus;

