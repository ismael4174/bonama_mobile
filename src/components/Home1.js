import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {db} from '../db/database';
import useAnneescolairesID from '../parametres/anneescolaire.js';
import useDrenaId from '../parametres/drena.js';
import {useRefresh} from '../db/refreshContext.js'; // 👈 ajout pour refresh global

export default function Home1() {
  const [annees, setAnnees] = useState([]);
  const [cesouscrit, setCesouscrit] = useState(0);
  const [elevesouscrit, setElevesouscrit] = useState(0);
  const [manueletab6, setManueletab6] = useState(0);
  const [manueletab5, setManueletab5] = useState(0);
  const [manueletab, setManueletab] = useState(0);
  const [manuelremiseleve6, setManuelremiseleve6] = useState(0);
  const [manuelremiseleve5, setManuelremiseleve5] = useState(0);
  const [manuelremiseleve, setManuelremiseleve] = useState(0);
  const [manuelretoureleve6, setManuelretoureleve6] = useState(0);
  const [manuelretoureleve5, setManuelretoureleve5] = useState(0);
  const [manuelretoureleve, setManuelretoureleve] = useState(0);
  const [etablissements, setEtablissements] = useState([]);
  const [drenas, setDrenas] = useState([]);

  const anneescolairesID = useAnneescolairesID();
  const drenasID = useDrenaId();
  const {refreshKey} = useRefresh(); // 👈 écoute du refresh global

  const safeDivide = (num, denom) => (denom === 0 ? 0 : num / denom);

  const anneescolaire = useCallback(
    id => {
      const monannee = annees.find(e => e.id === id);
      return monannee ? monannee.libelleanneescolaire : 'Inconnu';
    },
    [annees],
  );

  const drena = useCallback(
    id => {
      const madrena = drenas.find(e => e.id === id);
      return madrena ? madrena.designation : 'Inconnu';
    },
    [drenas],
  );

  // 🔄 fonction unique pour charger toutes les données
  const loadData = useCallback(() => {
    db.transaction(tx => {
      const queries = [
        {
          sql: 'SELECT id, libelleanneescolaire FROM anneescolaires;',
          setter: setAnnees,
        },
        {
          sql: 'SELECT COUNT(elevesinscrits.id) AS NBRE FROM elevesinscrits JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE elevesinscrits.presouscrit=1 AND elevesinscrits.anneescolaires_id = ? AND etablissements.drenas_id = ?;',
          params: [anneescolairesID, drenasID],
          setter: setElevesouscrit,
        },
        {
          sql: 'SELECT COUNT(commandesues.id) AS NBRE FROM commandesues JOIN ues ON ues.id = commandesues.ues_id JOIN etablissements ON etablissements.id = ues.etablissements_id WHERE commandesues.presouscrit=1 AND commandesues.anneescolaires_id = ? AND etablissements.drenas_id = ?;',
          params: [anneescolairesID, drenasID],
          setter: setCesouscrit,
        },
        {
          sql: 'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels ON manuels.id = stockmanuels.manuels_id JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id WHERE manuels.classes_id = 1 AND etablissements.drenas_id = ?;',
          params: [drenasID],
          setter: setManueletab6,
        },
        {
          sql: 'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels ON manuels.id = stockmanuels.manuels_id JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id WHERE manuels.classes_id = 2 AND etablissements.drenas_id = ?;',
          params: [drenasID],
          setter: setManueletab5,
        },
        {
          sql: 'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels ON manuels.id = stockmanuels.manuels_id JOIN etablissements ON etablissements.id = stockmanuels.etablissements_id WHERE etablissements.drenas_id = ?;',
          params: [drenasID],
          setter: setManueletab,
        },
        {
          sql: 'SELECT id, nometablissement FROM etablissements WHERE etablissements.drenas_id=?;',
          params: [drenasID],
          setter: setEtablissements,
        },
        {sql: 'SELECT id, designation FROM drenas;', setter: setDrenas},
      ];

      queries.forEach(q => {
        tx.executeSql(
          q.sql,
          q.params || [],
          (_, results) => {
            if (results.rows.length > 0) {
              if (results.rows.item(0).NBRE !== undefined)
                q.setter(results.rows.item(0).NBRE);
              else q.setter(results.rows.raw());
            } else {
              q.setter(0);
            }
          },
          (_, error) => console.log('Erreur SQL:', error),
        );
      });
    });
  }, [anneescolairesID, drenasID]);

  // 📌 chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔄 recharge automatique après synchronisation
  useEffect(() => {
    loadData();
  }, [refreshKey, loadData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titre}>DRENA</Text>
        <Text style={styles.text}>{drena(drenasID)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.titre}>ANNEE SCOLAIRE</Text>
        <Text style={styles.text}>{anneescolaire(anneescolairesID)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.titre}>SOUSCRIPTEURS</Text>
        <Text style={styles.text}>CE : {cesouscrit}</Text>
        <Text style={styles.text}>Elèves : {elevesouscrit}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.titre}>MANUELS kit(s)</Text>
        <Text style={styles.text}>6ème : {safeDivide(manueletab6, 8)}</Text>
        <Text style={styles.text}>5ème : {safeDivide(manueletab5, 8)}</Text>
        <Text style={styles.text}>Total : {safeDivide(manueletab, 8)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, alignItems: 'center'},
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '90%',
  },
  text: {fontSize: 16, marginVertical: 2},
  titre: {fontSize: 18, marginVertical: 2, color: 'red'},
});
