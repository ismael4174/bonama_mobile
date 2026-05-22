import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, TextInput} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomPicker from './CustomPicker.js';
import {db} from '../db/database.js';
import useAnneescolairesID from '../parametres/anneescolaire.js';
//import {useNavigation} from '@react-navigation/native';

const Etablissementchoisi = ({navigation}) => {
  const [etablissements, setEtablissements] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedEtablissementId, setSelectedEtablissementId] = useState(null);
  const anneescolairesId = useAnneescolairesID();
  // const navigation = useNavigation();
  useEffect(() => {
    const fetchEtablissements = async () => {
      try {
        const madrenaId = await AsyncStorage.getItem('drenas_id');
        const drenaId = parseInt(madrenaId, 10);

        db.transaction(tx => {
          tx.executeSql(
            'SELECT etablissements.id, etablissements.nometablissement FROM etablissements JOIN etablissementannees ON etablissements.id = etablissementannees.etablissements_id WHERE etablissementannees.anneescolaires_id = ? AND etablissements.drenas_id = ? ORDER BY etablissements.nometablissement;',
            [anneescolairesId, drenaId],
            (_, results) => {
              setEtablissements(results.rows.raw());
              // console.log('voici les etabs: ', etablissements);
            },

            (_, error) =>
              console.error(
                'Erreur lors de la récupération des établissements:',
                error,
              ),
          );
        });
      } catch (error) {
        console.error('Erreur lors de la récupération de drenas_id:', error);
      }
    };

    fetchEtablissements();
  }, [anneescolairesId]);

  const handleValueChange = value => {
    setSelectedEtablissementId(value);
  };

  const handleValider = async () => {
    if (selectedEtablissementId) {
      await AsyncStorage.setItem(
        'etablissements_id',
        selectedEtablissementId.toString(),
      );
      navigation.navigate('Home'); // Remplacez 'Home' par le nom de votre écran d'accueil
    } else {
      alert('Veuillez sélectionner un établissement.');
    }
  };

  const handleAnnuler = () => {
    setSelectedEtablissementId(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisir un établissement</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Filtrer la liste des établissement..."
        value={searchText}
        onChangeText={setSearchText}
      />
      {/** filtrer les établissements par nom saisi */}
      {/** on laisse CustomPicker gérer uniquement la sélection */}
      <CustomPicker
        items={etablissements
          .filter(e => {
            const q = (searchText || '').trim().toLowerCase();
            if (!q) return true;
            return (e.nometablissement || '').toLowerCase().includes(q);
          })
          .map(etablissement => ({
            label: etablissement.nometablissement,
            value: etablissement.id,
          }))}
        selectedId={selectedEtablissementId}
        onValueChange={handleValueChange}
        displayKey="label"
        valueKey="value"
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleValider}>
          <Text style={styles.buttonText}>Valider</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleAnnuler}>
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Etablissementchoisi;
