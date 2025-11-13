import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {Surface, Avatar, useTheme, Button as PaperButton} from 'react-native-paper';
import {db} from '../db/database';
import useAnneescolairesID from '../parametres/anneescolaire.js';
import useDrenaId from '../parametres/drena.js';
import {useRefresh} from '../db/refreshContext.js'; // 👈 ajout pour refresh global

export default function Home1({navigation}) {
  const theme = useTheme();
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
        // Remises agrégées par DRENA
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuels.classes_id=2 AND manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelremiseleve5,
        },
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuels.classes_id=1 AND manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelremiseleve6,
        },
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelremiseleve,
        },
        // Retours agrégés par DRENA
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuels.classes_id=2 AND manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelretoureleve5,
        },
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuels.classes_id=1 AND manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelretoureleve6,
        },
        {
          sql: 'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits ON elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels ON manuels.id=manuelseleves.manuels_id JOIN etablissements ON etablissements.id = elevesinscrits.etablissements_id WHERE manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND etablissements.drenas_id = ? AND elevesinscrits.anneescolaires_id=?;',
          params: [drenasID, anneescolairesID],
          setter: setManuelretoureleve,
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
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="home-city" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>DRENA</Text>
        </View>
        <Text style={styles.text}>{drena(drenasID)}</Text>
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="calendar" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>ANNEE SCOLAIRE</Text>
        </View>
        <Text style={styles.text}>{anneescolaire(anneescolairesID)}</Text>
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="account-group" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>SOUSCRIPTEURS</Text>
        </View>
        <Text style={styles.text}>CE : {cesouscrit}</Text>
        <Text style={styles.text}>Elèves : {elevesouscrit}</Text>
        {!!navigation && (
          <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Souscriptions')}>
            Voir souscriptions
          </PaperButton>
        )}
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="book" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>MANUELS kit(s)</Text>
        </View>
        <Text style={styles.text}>6ème : {safeDivide(manueletab6, 8)}</Text>
        <Text style={styles.text}>5ème : {safeDivide(manueletab5, 8)}</Text>
        <Text style={styles.text}>Total : {safeDivide(manueletab, 8)}</Text>
        {!!navigation && (
          <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Liste des manuels')}>
            Voir liste des manuels
          </PaperButton>
        )}
      </Surface>
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
