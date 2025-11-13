import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Surface, Avatar, useTheme, Button as PaperButton} from 'react-native-paper';
import {db} from '../db/database';

import useAnneescolairesID from '../parametres/anneescolaire.js';
import useEtablissementId from '../parametres/etablissement.js';
import {useRefresh} from '../db/refreshContext.js'; // 👈 on ajoute ça

export default function Home({navigation}) {
  const theme = useTheme();
  const [annees, setAnnees] = useState([]);
  const [cesouscrit, setCesouscrit] = useState(null);
  const [elevesouscrit, setElevesouscrit] = useState(null);
  const [manueletab, setManueletab] = useState(null);
  const [manueletab5, setManueletab5] = useState(null);
  const [manueletab6, setManueletab6] = useState(null);

  const [manuelremiseleve5, setManuelremiseleve5] = useState(null);
  const [manuelremiseleve6, setManuelremiseleve6] = useState(null);
  const [manuelremiseleve, setManuelremiseleve] = useState(null);
  const [manuelretoureleve5, setManuelretoureleve5] = useState(null);
  const [manuelretoureleve6, setManuelretoureleve6] = useState(null);
  const [manuelretoureleve, setManuelretoureleve] = useState(null);
  const [etablissements, setEtablissements] = useState([]);

  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();
  const {refreshKey} = useRefresh(); // 👈 on écoute refreshKey

  const anneescolaire = useCallback(
    id => {
      const monannee = annees.find(e => e.id === id);
      return monannee ? monannee.libelleanneescolaire : 'Inconnu';
    },
    [annees],
  );

  const etablissement = useCallback(
    id => {
      const monetablissement = etablissements.find(e => e.id === id);
      return monetablissement ? monetablissement.nometablissement : 'Inconnu';
    },
    [etablissements],
  );

  // 🔄 On regroupe la logique de chargement dans une fonction réutilisable
  const loadData = useCallback(() => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, results) => setAnnees(results.rows.raw()),
      );
      tx.executeSql(
        'SELECT COUNT(elevesinscrits.id) AS NBRE FROM elevesinscrits WHERE presouscrit=1 and anneescolaires_id = ? AND etablissements_id = ?;',
        [anneescolairesID, etablissementsID],
        (_, results) => setElevesouscrit(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        // 'SELECT COUNT(commandesues.id) AS NBRE FROM commandesues  JOIN ues on ues.id = commandesues.ues_id WHERE commandesues.presouscrit=1 and commandesues.anneescolaires_id = ? AND ues.etablissements_id = ?;',
        'SELECT COUNT(commandesues.id) AS NBRE FROM commandesues  JOIN ues on ues.id = commandesues.ues_id WHERE commandesues.anneescolaires_id = ? AND ues.etablissements_id = ?;',
        [anneescolairesID, etablissementsID],
        (_, results) => setCesouscrit(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels on manuels.id = stockmanuels.manuels_id WHERE manuels.classes_id = 1 AND stockmanuels.etablissements_id = ?;',
        [etablissementsID],
        (_, results) => setManueletab6(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels on manuels.id = stockmanuels.manuels_id WHERE manuels.classes_id = 2 AND stockmanuels.etablissements_id = ?;',
        [etablissementsID],
        (_, results) => setManueletab5(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(stockmanuels.id) AS NBRE FROM stockmanuels JOIN manuels on manuels.id = stockmanuels.manuels_id WHERE stockmanuels.etablissements_id = ?;',
        [etablissementsID],
        (_, results) => setManueletab(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuels.classes_id=2 AND manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelremiseleve5(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuels.classes_id=1 AND manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelremiseleve6(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuelseleves.exemplairemanuelseleve_id IS NOT NULL AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelremiseleve(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuels.classes_id=2 AND manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelretoureleve5(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuels.classes_id=1 AND manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelretoureleve6(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT COUNT(manuelseleves.id) AS NBRE FROM manuelseleves JOIN elevesinscrits on elevesinscrits.id = manuelseleves.elevesinscrits_id JOIN manuels on manuels.id=manuelseleves.manuels_id WHERE manuelseleves.etatmanuelsretoureleve_id IN (1,2,3,4) AND elevesinscrits.etablissements_id = ? AND elevesinscrits.anneescolaires_id=?;',
        [etablissementsID, anneescolairesID],
        (_, results) => setManuelretoureleve(results.rows.item(0)?.NBRE || 0),
      );
      tx.executeSql(
        'SELECT id, nometablissement FROM etablissements;',
        [],
        (_, results) => setEtablissements(results.rows.raw()),
      );
    });
  }, [anneescolairesID, etablissementsID]);

  useEffect(() => {
    loadData(); // charge les données initialement
  }, [loadData]);

  // 👇 Recharge automatiquement si un refresh est déclenché globalement
  useEffect(() => {
    loadData();
  }, [refreshKey, loadData]);

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="home-city" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>ETABLISSEMENT</Text>
        </View>
        <Text style={styles.text}> {etablissement(etablissementsID)}</Text>
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
        <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Souscriptions')}>
          Voir souscriptions
        </PaperButton>
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="book" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>MANUELS kit(s)</Text>
        </View>
        <Text style={styles.text}>6ème : {manueletab6 / 8}</Text>
        <Text style={styles.text}>5ème : {manueletab5 / 8}</Text>
        <Text style={styles.text}>Total : {manueletab / 8}</Text>
        <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Liste des manuels')}>
          Voir liste des manuels
        </PaperButton>
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="chart-line" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>PROPORTION DE REMISE</Text>
        </View>
        <Text style={styles.text}>
          6ème : {((manuelremiseleve6 / manueletab6) * 100).toFixed(2)} %
        </Text>
        <Text style={styles.text}>
          5ème : {((manuelremiseleve5 / manueletab5) * 100).toFixed(2)} %
        </Text>
        <Text style={styles.text}>
          Total : {((manuelremiseleve / manueletab) * 100).toFixed(2)} %
        </Text>
        <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Remise')}>
          Aller à Remise
        </PaperButton>
      </Surface>
      <Surface style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Avatar.Icon size={32} icon="backup-restore" />
          <Text style={[styles.titre, {marginLeft: 8, color: theme.colors.primary}]}>PROPORTION DE RETOUR</Text>
        </View>
        <Text style={styles.text}>
          6ème : {((manuelretoureleve6 / manuelremiseleve6) * 100).toFixed(2)} %
        </Text>
        <Text style={styles.text}>
          5ème : {((manuelretoureleve5 / manuelremiseleve5) * 100).toFixed(2)} %
        </Text>
        <Text style={styles.text}>
          Total : {((manuelretoureleve / manuelremiseleve) * 100).toFixed(2)} %
        </Text>
        <PaperButton style={{marginTop: 8}} mode="outlined" onPress={() => navigation.navigate('Retour')}>
          Aller à Retour
        </PaperButton>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
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
    alignSelf: 'center',
  },
  text: {fontSize: 16, marginVertical: 2},
  titre: {fontSize: 18, marginVertical: 2},
});
