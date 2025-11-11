import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthenticationService from '../authentificationservice';
import useAnneescolairesID from '../parametres/anneescolaire.js';
import {initializeDataEtab, initializeDataDrena} from '../db/database';

const Login = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const anneescolairesId = useAnneescolairesID();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const data = await AuthenticationService.login(username, password);

      if (data) {
        await AuthenticationService.checkAuthentication();
        // Récupérer les ID après la connexion réussie
        const monEtablissementId = await AsyncStorage.getItem(
          'etablissements_id',
        );
        const etablissementId = parseInt(monEtablissementId, 10);
        //const anneescolairesId = await AsyncStorage.getItem('anneescolairesId');
        const madrenaId = await AsyncStorage.getItem('drenas_id');
        const drenaId = parseInt(madrenaId, 10);

        if (etablissementId) {
          //await AsyncStorage.setItem('loginetab', username);
          await initializeDataEtab(etablissementId, anneescolairesId);
          navigation.navigate('Main'); // Redirection après connexion réussie
        } else {
          if (drenaId) {
            // await AsyncStorage.setItem('logindrena', username);
            await initializeDataDrena(drenaId, anneescolairesId);
            navigation.navigate('Main1'); // Redirection après connexion réussie
          } else {
            Alert.alert(
              'Erreur',
              'Cette application est réservée seulement pour les établissements, les ce et les DRENA',
            );
            navigation.navigate('Login'); // Redirection après connexion réussie
          }
        }
      } else {
        Alert.alert('Erreur', "Nom d'utilisateur ou mot de passe incorrect");
      }
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>
            Chargement des données... Veuillez rester connecté
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Connexion</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="black"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="black"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Se connecter" onPress={handleLogin} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: 'gray',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    color: 'black',
  },
});

export default Login;
