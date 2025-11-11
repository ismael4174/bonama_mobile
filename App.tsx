import 'react-native-gesture-handler';
import * as React from 'react';
import {RefreshProvider, useRefresh} from './src/db/refreshContext';
import {useEffect, useState} from 'react';
import {
  createTables,
  initializeData,
  initializeDatabase,
  initializeDataEtab,
  initializeDataDrena,
  getAdminUsers,
  getNationalites,
  fetchAndInsertData,
  insertionDesUsers,
  insertionDesAnneescolaires,
  insertionDesParametrages,
} from './src/db/database';
import {NetworkSync, checkConnection} from './src/db/network';
import {checkAndSync} from './src/db/sync'; // Import de la fonction de synchronisation
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Home from './src/components/Home';
import Home1 from './src/components/Home1';
import Accueil from './src/components/Accueil';
import Accueil2 from './src/components/Accueil2';
import Contacteznous from './src/components/Contacteznous';
import SendEmail from './src/components/SendEmail';
import Login from './src/components/Login';
import Etablissementchoisi from './src/components/Etablissementchoisi';
//import Ces from './src/components/ces/CeInscrits';
import Genres from './src/components/genres/Genres';
import Synclogs from './src/components/synclogs/Synclog';
import Eleves from './src/components/eleves/ElevesInscrits';
import Eleves1 from './src/components/eleves/ElevesInscrits1';
import Adminusers from './src/components/adminusers/Adminusers';
import ElevesAttendus from './src/components/eleves/ElevesAttendus';
import ElevesAttendus1 from './src/components/eleves/ElevesAttendus1';
import RemiseEleve from './src/components/eleves/RemiseEleve';
import RemiseCe from './src/components/ces/RemiseCe';
import RemiseCeDetails from './src/components/ces/RemiseCeDetails';
import RetourCeDetails from './src/components/ces/RetourCeDetails';
import RemiseEleveDetails from './src/components/eleves/RemiseEleveDetails';
import RetourEleveDetails from './src/components/eleves/RetourEleveDetails';
import RetourEleve from './src/components/eleves/RetourEleve';
import ActualisationEleve from './src/components/eleves/ActualisationEleves';
import RetourCe from './src/components/ces/RetourCe';
import ManuelsEnStock from './src/components/manuels/ManuelsEnStock';
import ManuelsEnStock1 from './src/components/manuels/ManuelsEnStock1';
import Transferts from './src/components/manuels/Transferts';
import ManuelRetrouve from './src/components/manuels/ManuelRetrouve';
import ManuelRetrouve1 from './src/components/manuels/ManuelRetrouve1';
import CeInscrits from './src/components/ces/CeInscrits';
import CeInscrits1 from './src/components/ces/CeInscrits1';
import CreationDeCe from './src/components/ces/CreationDeCe';
import ValidationCe from './src/components/ces/ValidationSouscriptionCe';
import ValidationEleve from './src/components/eleves/ValidationSouscriptionEleve';
import Guide from './src/components/GuideUtilisateur';
import useAnneescolairesID from './src/parametres/anneescolaire.js';
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const handleLogout = async navigation => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.setItem('drenaDataInitialized', 'false');
  await AsyncStorage.setItem('etabDataInitialized', 'false'); // Marquer comme non initialisé
  await AsyncStorage.setItem('databaseInitialized', 'false'); // Marquer comme non initialisé
  navigation.navigate('Accueil2');
};
const CustomDrawerContent1 = ({navigation}) => {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Tableau de bord"
        onPress={() => navigation.navigate('Tableau de bord')}
      />
      <Button
        title="Documentation"
        onPress={() => navigation.navigate('Documentation')}
      />
      <Button
        title="Paramètres généraux"
        onPress={() => navigation.navigate('Paramètres généraux')}
      />
      <Button
        title="Transferts de manuels"
        onPress={() => navigation.navigate('Transferts de manuels')}
      />
      <Button
        title="Liste des manuels"
        onPress={() => navigation.navigate('Liste des manuels')}
      />
      <Button
        title="Souscriptions"
        onPress={() => navigation.navigate('Souscriptions')}
      />
      <Button
        title="Recap Etab"
        onPress={() => navigation.navigate('Recap Etab')}
      />

      <Button title="Déconnexion" onPress={() => handleLogout(navigation)} />
    </View>
  );
};
const CustomDrawerContent = ({navigation}) => {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Tableau de bord"
        onPress={() => navigation.navigate('Tableau de bord')}
      />

      <Button
        title="Souscriptions"
        onPress={() => navigation.navigate('Souscriptions')}
      />
      <Button
        title="Validations"
        onPress={() => navigation.navigate('Validations')}
      />

      <Button title="Remise" onPress={() => navigation.navigate('Remise')} />
      <Button title="Retour" onPress={() => navigation.navigate('Retour')} />
      <Button
        title="Liste des manuels"
        onPress={() => navigation.navigate('Liste des manuels')}
      />
      <Button
        title="Documentation"
        onPress={() => navigation.navigate('Documentation')}
      />
      <Button
        title="Paramètres généraux"
        onPress={() => navigation.navigate('Paramètres généraux')}
      />
      <Button title="Déconnexion" onPress={() => handleLogout(navigation)} />
    </View>
  );
};
function DrawerScreens1({navigation}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  ///////////////////////////////
  const handleInitialize = async () => {
    if (isInitialized) {
      Alert.alert('Information', 'Les données ont déjà été initialisées.');
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await checkConnection(); // Use the imported checkConnection function
      if (!isConnected) {
        Alert.alert('Erreur', 'Aucune connexion internet détectée.');
        return;
      }
      const madrenaId = await AsyncStorage.getItem('drenas_id');
      const drenaId = madrenaId ? parseInt(madrenaId, 10) : null;

      // If you have an initializeData function in your database.js file, call it here:
      // await initializeData();  // Uncomment if needed
      //await initializeData();
      await initializeDatabase();
      await initializeDataDrena(drenaId, useAnneescolairesID);
      Alert.alert('Succès', 'Initialisation des données terminée.');
      setIsInitialized(true);
    } catch (error) {
      console.error("Erreur dans App.tsx lors de l'initialisation:", error);
      Alert.alert(
        'Erreur',
        "Une erreur s'est produite lors de l'initialisation.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /////////////////////////////////
  return (
    <View style={{flex: 1, padding: 10}}>
      <Button
        title="🔄 Synchroniser maintenant"
        onPress={() => checkAndSync(true)}
      />
      <Button
        title="Initialiser les données"
        onPress={handleInitialize}
        disabled={isLoading || isInitialized}
      />
      {isLoading && <ActivityIndicator />}

      <Drawer.Navigator
        drawerContent={props => <CustomDrawerContent1 {...props} />}>
        <Drawer.Screen name="Tableau de bord" component={Home1} />
        <Drawer.Screen name="Documentation" component={DocumentationStack} />
        <Drawer.Screen
          name="Paramètres généraux"
          component={ParametresStack1}
        />
        <Drawer.Screen
          name="Transferts de manuels"
          component={TransfertStack1}
        />
        <Drawer.Screen name="Liste des manuels" component={ManuelRetrouve1} />
        <Drawer.Screen name="Souscriptions" component={SouscripteursStack1} />
        <Drawer.Screen name="Recap Etab" component={EtablissementchoisiStack} />
      </Drawer.Navigator>
    </View>
  );
}
function DrawerScreens({navigation}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  ///////////////////////////////
  const handleInitialize = async () => {
    if (isInitialized) {
      Alert.alert('Information', 'Les données ont déjà été initialisées.');
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await checkConnection(); // Use the imported checkConnection function
      if (!isConnected) {
        Alert.alert('Erreur', 'Aucune connexion internet détectée.');
        return;
      }

      // If you have an initializeData function in your database.js file, call it here:
      // await initializeData();  // Uncomment if needed

      const monEtablissementId = await AsyncStorage.getItem(
        'etablissements_id',
      );
      const etablissementId = monEtablissementId
        ? parseInt(monEtablissementId, 10)
        : null;
      //await initializeData();
      await initializeDatabase();
      await initializeDataEtab(etablissementId, useAnneescolairesID);
      Alert.alert('Succès', 'Initialisation des données terminée.');
      setIsInitialized(true);
    } catch (error) {
      console.error("Erreur dans App.tsx lors de l'initialisation:", error);
      Alert.alert(
        'Erreur',
        "Une erreur s'est produite lors de l'initialisation.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /////////////////////////////////
  return (
    <View style={{flex: 1, padding: 10}}>
      <Button
        title="🔄 Synchroniser maintenant"
        onPress={() => checkAndSync(true)}
      />
      <Button
        title="Initialiser les données"
        onPress={handleInitialize}
        disabled={isLoading || isInitialized}
      />
      {isLoading && <ActivityIndicator />}

      <Drawer.Navigator
        drawerContent={props => <CustomDrawerContent {...props} />}>
        <Drawer.Screen name="Tableau de bord" component={Home} />
        <Drawer.Screen name="Documentation" component={DocumentationStack} />
        <Drawer.Screen name="Paramètres généraux" component={ParametresStack} />
        <Drawer.Screen name="Liste des manuels" component={ManuelRetrouve} />

        <Drawer.Screen name="Souscriptions" component={SouscripteursStack} />

        <Drawer.Screen name="Validations" component={ValidationStack} />
        <Drawer.Screen name="Remise" component={RemiseStack} />
        <Drawer.Screen name="Retour" component={RetourStack} />
      </Drawer.Navigator>
    </View>
  );
}

// Sous-menus
function ParametresgenereauxScreen1({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Manuels en stock"
        onPress={() => navigation.navigate('Manuels en stock')}
      />
    </View>
  );
}
function TransfertScreen1({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Transferts de manuels"
        onPress={() => navigation.navigate('Transferts')}
      />
    </View>
  );
}
function ManuelRetrouveScreen1({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Liste des manuels"
        onPress={() => navigation.navigate('ManuelRetrouve1')}
      />
    </View>
  );
}
function ManuelRetrouveScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Liste des manuels"
        onPress={() => navigation.navigate('ManuelRetrouve')}
      />
    </View>
  );
}
function ParametresgenereauxScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Manuels en stock"
        onPress={() => navigation.navigate('Manuels en stock')}
      />
      <Button
        title="Créer un CE"
        onPress={() => navigation.navigate('Créer un CE')}
      />
      <Button
        title="Actualiser les données des élèves"
        onPress={() => navigation.navigate('Actualiser les données')}
      />
    </View>
  );
}
// Sous-menus
function RemiseScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Elèves"
        onPress={() => navigation.navigate('RemiseEleve')}
      />
      <Button title="CEs" onPress={() => navigation.navigate('RemiseCe')} />
    </View>
  );
}
// Sous-menus
function RetourScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Elèves"
        onPress={() => navigation.navigate('RetourEleve')}
      />
      <Button title="CEs" onPress={() => navigation.navigate('RetourCe')} />
    </View>
  );
}
// Sous-menus
function SouscripteursScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Elèves attendus"
        onPress={() => navigation.navigate('Eleves attendus')}
      />
      <Button
        title="Elèves souscripteurs"
        onPress={() => navigation.navigate('Eleves Inscrits')}
      />
      <Button
        title="CEs souscripteurs"
        onPress={() => navigation.navigate('Ce Inscrits')}
      />
    </View>
  );
}

function SouscripteursScreen1({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Elèves attendus"
        onPress={() => navigation.navigate('Eleves attendus')}
      />
      <Button
        title="Elèves souscripteurs"
        onPress={() => navigation.navigate('Eleves Inscrits')}
      />
      <Button
        title="CEs souscripteurs"
        onPress={() => navigation.navigate('Ce Inscrits')}
      />
    </View>
  );
}
// Sous-menus
function DocumentationScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Manuel d'utilisation"
        onPress={() => navigation.navigate('Guide')}
      />
    </View>
  );
}
function EtablissementchoisiScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button
        title="Choisir un établissement"
        onPress={() => navigation.navigate('Etablissementchoisi')}
      />
    </View>
  );
}

// Sous-menus
function ValidationScreen({navigation}) {
  return (
    <View style={{flex: 1}}>
      <Button title="Elèves" onPress={() => navigation.navigate('Eleves')} />
      <Button title="CEs" onPress={() => navigation.navigate('CEs')} />
    </View>
  );
}
// Stack Navigator pour Paramètres généraux et sous-menus
function ParametresStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={ParametresgenereauxScreen} />
      <Stack.Screen name="Manuels en stock" component={ManuelsEnStock} />
      <Stack.Screen name="Créer un CE" component={CreationDeCe} />
      <Stack.Screen
        name="Actualiser les données"
        component={ActualisationEleve}
      />
    </Stack.Navigator>
  );
}
function ParametresStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={ParametresgenereauxScreen1} />
      <Stack.Screen name="Manuels en stock" component={ManuelsEnStock1} />
    </Stack.Navigator>
  );
}
function TransfertStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={TransfertScreen1} />
      <Stack.Screen name="Transferts" component={Transferts} />
    </Stack.Navigator>
  );
}
function ManuelRetrouveStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={ManuelRetrouveScreen1} />
      <Stack.Screen name="ManuelRetrouve" component={ManuelRetrouve1} />
    </Stack.Navigator>
  );
}
function ManuelRetrouveStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={ManuelRetrouveScreen} />
      <Stack.Screen name="ManuelRetrouve" component={ManuelRetrouve} />
    </Stack.Navigator>
  );
}
// Stack Navigator pour Documentation et sous-menus
function DocumentationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={DocumentationScreen} />
      <Stack.Screen name="Manuel d'utilisation" component={Guide} />
    </Stack.Navigator>
  );
}

function EtablissementchoisiStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={Etablissementchoisi} />
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}
// Stack Navigator pour la remise des manuels et sous-menus
function RemiseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={RemiseScreen} />
      <Stack.Screen name="RemiseEleve" component={RemiseEleve} />
      <Stack.Screen name="RemiseCe" component={RemiseCe} />
    </Stack.Navigator>
  );
}

// Stack Navigator pour les souscripteurs et sous-menus
function SouscripteursStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={SouscripteursScreen} />
      <Stack.Screen name="Eleves attendus" component={ElevesAttendus} />
      <Stack.Screen name="Eleves Inscrits" component={Eleves} />
      <Stack.Screen name="Ce Inscrits" component={CeInscrits} />
    </Stack.Navigator>
  );
}

function SouscripteursStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={SouscripteursScreen1} />
      <Stack.Screen name="Eleves attendus" component={ElevesAttendus1} />
      <Stack.Screen name="Eleves Inscrits" component={Eleves1} />
      <Stack.Screen name="Ce Inscrits" component={CeInscrits1} />
    </Stack.Navigator>
  );
}
// Stack Navigator pour les souscripteurs et sous-menus
function ValidationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={ValidationScreen} />
      <Stack.Screen name="Eleves" component={ValidationEleve} />
      <Stack.Screen name="CEs" component={ValidationCe} />
    </Stack.Navigator>
  );
}

// Stack Navigator pour la remise des manuels et sous-menus
function RetourStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="..." component={RetourScreen} />
      <Stack.Screen name="RetourEleve" component={RetourEleve} />
      <Stack.Screen name="RetourCe" component={RetourCe} />
    </Stack.Navigator>
  );
}

function AppWrapper() {
  const [loading, setLoading] = useState(true); // Ajout de l'état pour le chargement
  const [isSyncing, setIsSyncing] = useState(false); // Nouvel état pour la synchronisation
  const {triggerRefresh} = useRefresh(); // 👈 on récupère le trigger ici

  // On expose triggerRefresh globalement
  useEffect(() => {
    global.triggerRefresh = triggerRefresh;
  }, [triggerRefresh]);

  /*useEffect(() => {
    createTables();
  }, []);*/
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true); // Début du chargement
        // await insertionDesUsers();
        await insertionDesAnneescolaires();
        await insertionDesParametrages();
        await initializeDatabase();
      } catch (error) {
        console.error(
          "Erreur lors de l'initialisation de la base de données :",
          error,
        );
        // Gérer l'erreur ici, par exemple afficher un message à l'utilisateur
      } finally {
        setLoading(false); // Fin du chargement
      }
    };

    initialize();
  }, []);
  /*
  useEffect(() => {
    insertionDesUsers();
  }, []);
*/
  const triggerSync = async isConnected => {
    if (isConnected && !isSyncing) {
      setIsSyncing(true);
      console.log('📡 Lancement de la synchronisation...');
      try {
        await checkAndSync(isConnected);
        console.log('✅ Synchronisation terminée.');
      } catch (error) {
        console.error('❌ Erreur lors de la synchronisation dans App:', error);
      } finally {
        setIsSyncing(false);
      }
    } else if (!isConnected) {
      console.log('🚫 Pas de connexion, synchronisation reportée.');
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loaderText}>
          Chargement des données de base, veuillez rester connecté...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <NetworkSync />

      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Accueil" component={Accueil} />
        <Stack.Screen name="Guide" component={Guide} />
        <Stack.Screen name="Accueil2" component={Accueil2} />
        <Stack.Screen name="Contacteznous" component={Contacteznous} />
        <Stack.Screen name="SendEmail" component={SendEmail} />
        <Stack.Screen
          name="RemiseEleveDetails"
          component={RemiseEleveDetails}
        />
        <Stack.Screen name="RemiseCeDetails" component={RemiseCeDetails} />
        <Stack.Screen
          name="RetourEleveDetails"
          component={RetourEleveDetails}
        />
        <Stack.Screen name="RetourCeDetails" component={RetourCeDetails} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Main" component={DrawerScreens} />
        <Stack.Screen name="Main1" component={DrawerScreens1} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // pour éviter que le texte touche les bords
    backgroundColor: '#fff', // optionnel, tu peux mettre une couleur douce
  },
  loaderText: {
    marginTop: 16, // espace entre le spinner et le texte
    fontSize: 16,
    textAlign: 'center',
    color: '#333', // couleur plus douce que le noir pur
  },
});

export default function App() {
  return (
    <RefreshProvider>
      <AppWrapper />
    </RefreshProvider>
  );
}
