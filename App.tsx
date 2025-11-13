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
  useColorScheme,
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
import AuthenticationService from './src/authentificationservice';
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
import {Provider as PaperProvider, MD3LightTheme, MD3DarkTheme, List, Divider, Avatar, Appbar, useTheme} from 'react-native-paper';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Simple theme preference context
type ThemePref = { mode: 'system' | 'light' | 'dark'; toggle: () => void; setMode: (m: 'system' | 'light' | 'dark') => void };
const ThemePrefContext = React.createContext<ThemePref>({ mode: 'system', toggle: () => {}, setMode: () => {} });

const lightTheme = {
  ...MD3LightTheme,
  roundness: 8,
  colors: {
    ...MD3LightTheme.colors,
    // Soft MD3 palette
    primary: '#2563EB',
    onPrimary: '#FFFFFF',
    primaryContainer: '#DBEAFE',
    onPrimaryContainer: '#1E3A8A',

    secondary: '#F59E0B',
    onSecondary: '#1F2937',
    secondaryContainer: '#FEF3C7',
    onSecondaryContainer: '#92400E',

    surface: '#FFFFFF',
    onSurface: '#111827',
    surfaceVariant: '#F6F8FA',
    onSurfaceVariant: '#334155',
    background: '#FFFFFF',
    outline: '#D0D5DD',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  roundness: 8,
  colors: {
    ...MD3DarkTheme.colors,
    // Soft MD3 dark counterparts
    primary: '#93C5FD',
    onPrimary: '#0B1A39',
    primaryContainer: '#1E3A8A',
    onPrimaryContainer: '#DBEAFE',

    secondary: '#FBBF24',
    onSecondary: '#1F2937',
    secondaryContainer: '#92400E',
    onSecondaryContainer: '#FEF3C7',

    surface: '#0B1220',
    onSurface: '#E5E7EB',
    surfaceVariant: '#111827',
    onSurfaceVariant: '#CBD5E1',
    background: '#0B1220',
    outline: '#334155',
  },
};

const AppHeader = (props: NativeStackHeaderProps) => {
  const {navigation, route, options, back} = props;
  const theme = useTheme();
  const themePref = React.useContext(ThemePrefContext);
  return (
  <Appbar.Header elevated>
    {back ? (
      <Appbar.BackAction onPress={navigation.goBack} />
    ) : (
      // Open drawer from parent navigator if available
      <Appbar.Action
        icon="menu"
        onPress={() => {
          const parent = (navigation as any)?.getParent?.();
          parent?.openDrawer?.();
        }}
      />
    )}
    <Appbar.Content title={options?.title ?? route?.name ?? ''} />
    {false && (
      <Appbar.Action
        icon={theme.dark ? 'white-balance-sunny' : 'weather-night'}
        onPress={() => themePref.toggle()}
        accessibilityLabel="Changer le thème clair/sombre"
      />
    )}
    {options?.headerRight ? options.headerRight({canGoBack: !!back}) : null}
  </Appbar.Header>
  );
};

const handleLogout = async navigation => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  await AsyncStorage.removeItem('etablissements_id');
  await AsyncStorage.removeItem('drenas_id');
  await AsyncStorage.setItem('drenaDataInitialized', 'false');
  await AsyncStorage.setItem('etabDataInitialized', 'false'); // Marquer comme non initialisé
  await AsyncStorage.setItem('databaseInitialized', 'false'); // Marquer comme non initialisé
  navigation.reset({index: 0, routes: [{name: 'Login'}]});
};
const CustomDrawerContent1 = ({navigation}) => {
  const anneeId = useAnneescolairesID();
  const [syncing, setSyncing] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await checkAndSync(true);
    } catch (e) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };
  const handleInit = async () => {
    if (initializing) return;
    setInitializing(true);
    try {
      const isConnected = await checkConnection();
      if (!isConnected) {
        Alert.alert('Erreur', 'Aucune connexion internet détectée.');
        return;
      }
      const madrenaId = await AsyncStorage.getItem('drenas_id');
      const drenaId = madrenaId ? parseInt(madrenaId, 10) : null;
      await initializeDatabase('drena', drenaId, anneeId, true);
      Alert.alert('Succès', 'Initialisation des données terminée.');
    } catch (e) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'initialisation.");
    } finally {
      setInitializing(false);
    }
  };
  return (
    <View style={{flex: 1}}>
      <View style={{padding: 16, flexDirection: 'row', alignItems: 'center'}}>
        <Avatar.Icon size={40} icon="account" />
        <Text style={{marginLeft: 12, fontSize: 16, fontWeight: '600'}}>Menu</Text>
      </View>
      <Divider />
      <List.Section>
        <List.Item
          title="Synchroniser maintenant"
          left={props => <List.Icon {...props} icon="sync" color="#FFFFFF" />}
          right={() => (syncing ? <ActivityIndicator /> : null)}
          onPress={handleSync}
          disabled={syncing}
          style={{backgroundColor: '#2563EB', borderRadius: 8, marginHorizontal: 12, marginTop: 8}}
          titleStyle={{color: '#FFFFFF', fontWeight: '600'}}
        />
        <List.Item
          title="Initialiser les données"
          left={props => <List.Icon {...props} icon="database" color="#FFFFFF" />}
          right={() => (initializing ? <ActivityIndicator /> : null)}
          onPress={handleInit}
          disabled={initializing}
          style={{backgroundColor: '#2563EB', borderRadius: 8, marginHorizontal: 12, marginTop: 8}}
          titleStyle={{color: '#FFFFFF', fontWeight: '600'}}
        />
        <List.Item title="Tableau de bord" left={props => <List.Icon {...props} icon="view-dashboard" />} onPress={() => navigation.navigate('Tableau de bord')} />
        <List.Item title="Documentation" left={props => <List.Icon {...props} icon="file-document" />} onPress={() => navigation.navigate('Documentation')} />
        <List.Item title="Paramètres généraux" left={props => <List.Icon {...props} icon="cog" />} onPress={() => navigation.navigate('Paramètres généraux')} />
        <List.Item title="Liste des manuels" left={props => <List.Icon {...props} icon="book" />} onPress={() => navigation.navigate('Liste des manuels')} />
        <List.Item title="Souscriptions" left={props => <List.Icon {...props} icon="account-group" />} onPress={() => navigation.navigate('Souscriptions')} />
        <List.Item title="Recap Etab" left={props => <List.Icon {...props} icon="school" />} onPress={() => navigation.navigate('Recap Etab')} />
      </List.Section>
      <Divider />
      <List.Item title="Déconnexion" left={props => <List.Icon {...props} icon="logout" />} onPress={() => handleLogout(navigation)} />
    </View>
  );
};
const CustomDrawerContent = ({navigation}) => {
  const anneeId = useAnneescolairesID();
  const [syncing, setSyncing] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await checkAndSync(true);
    } catch (e) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };
  const handleInit = async () => {
    if (initializing) return;
    setInitializing(true);
    try {
      const isConnected = await checkConnection();
      if (!isConnected) {
        Alert.alert('Erreur', 'Aucune connexion internet détectée.');
        return;
      }
      const monEtablissementId = await AsyncStorage.getItem('etablissements_id');
      const etablissementId = monEtablissementId ? parseInt(monEtablissementId, 10) : null;
      await initializeDatabase('etab', etablissementId, anneeId, true);
      Alert.alert('Succès', 'Initialisation des données terminée.');
    } catch (e) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'initialisation.");
    } finally {
      setInitializing(false);
    }
  };
  return (
    <View style={{flex: 1}}>
      <View style={{padding: 16, flexDirection: 'row', alignItems: 'center'}}>
        <Avatar.Icon size={40} icon="account" />
        <Text style={{marginLeft: 12, fontSize: 16, fontWeight: '600'}}>Menu</Text>
      </View>
      <Divider />
      <List.Section>
        <List.Item
          title="Synchroniser maintenant"
          left={props => <List.Icon {...props} icon="sync" color="#FFFFFF" />}
          right={() => (syncing ? <ActivityIndicator /> : null)}
          onPress={handleSync}
          disabled={syncing}
          style={{backgroundColor: '#2563EB', borderRadius: 8, marginHorizontal: 12, marginTop: 8}}
          titleStyle={{color: '#FFFFFF', fontWeight: '600'}}
        />
        <List.Item
          title="Initialiser les données"
          left={props => <List.Icon {...props} icon="database" color="#FFFFFF" />}
          right={() => (initializing ? <ActivityIndicator /> : null)}
          onPress={handleInit}
          disabled={initializing}
          style={{backgroundColor: '#2563EB', borderRadius: 8, marginHorizontal: 12, marginTop: 8}}
          titleStyle={{color: '#FFFFFF', fontWeight: '600'}}
        />
        <List.Item title="Tableau de bord" left={props => <List.Icon {...props} icon="view-dashboard" />} onPress={() => navigation.navigate('Tableau de bord')} />
        <List.Item title="Souscriptions" left={props => <List.Icon {...props} icon="account-group" />} onPress={() => navigation.navigate('Souscriptions')} />
        <List.Item title="Validations" left={props => <List.Icon {...props} icon="check-decagram" />} onPress={() => navigation.navigate('Validations')} />
        <List.Item title="Remise" left={props => <List.Icon {...props} icon="send" />} onPress={() => navigation.navigate('Remise')} />
        <List.Item title="Retour" left={props => <List.Icon {...props} icon="undo" />} onPress={() => navigation.navigate('Retour')} />
        <List.Item title="Liste des manuels" left={props => <List.Icon {...props} icon="book" />} onPress={() => navigation.navigate('Liste des manuels')} />
        <List.Item title="Documentation" left={props => <List.Icon {...props} icon="file-document" />} onPress={() => navigation.navigate('Documentation')} />
        <List.Item title="Paramètres généraux" left={props => <List.Icon {...props} icon="cog" />} onPress={() => navigation.navigate('Paramètres généraux')} />
      </List.Section>
      <Divider />
      <List.Item title="Déconnexion" left={props => <List.Icon {...props} icon="logout" />} onPress={() => handleLogout(navigation)} />
    </View>
  );
};
function DrawerScreens1({navigation}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const anneeId = useAnneescolairesID();
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

      // Initialisation complète basée sur l'utilisateur connecté (DRENA)
      await initializeDatabase('drena', drenaId, anneeId, true);
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
      <Drawer.Navigator
        drawerContent={props => <CustomDrawerContent1 {...props} />}>
        <Drawer.Screen name="Tableau de bord" component={Home1} />
        <Drawer.Screen name="Documentation" component={DocumentationStack} />
        <Drawer.Screen
          name="Paramètres généraux"
          component={ParametresStack1}
        />
        {/** Transferts de manuels (désactivé) */}
        {/**
        <Drawer.Screen
          name="Transferts de manuels"
          component={TransfertStack1}
        />
        */}
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
  const anneeId = useAnneescolairesID();
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

      const monEtablissementId = await AsyncStorage.getItem(
        'etablissements_id',
      );
      const etablissementId = monEtablissementId
        ? parseInt(monEtablissementId, 10)
        : null;
      // Initialisation complète basée sur l'utilisateur connecté (Etablissement)
      await initializeDatabase('etab', etablissementId, anneeId, true);
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
      <Stack.Screen name=" " component={ParametresgenereauxScreen} />
      <Stack.Screen name="Manuels en stock" component={ManuelsEnStock} options={{ title: 'Manuels en stock' }}/>
      <Stack.Screen name="Créer un CE" component={CreationDeCe} options={{ title: 'Créer un CE' }}/>
      <Stack.Screen
        name="Actualiser les données"
        component={ActualisationEleve}
        options={{ title: 'Actualiser les données' }}
      />
    </Stack.Navigator>
  );
}
function ParametresStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={ParametresgenereauxScreen1} />
      <Stack.Screen name="Manuels en stock" component={ManuelsEnStock1} options={{ title: 'Manuels en stock' }}/>
    </Stack.Navigator>
  );
}
function TransfertStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={TransfertScreen1} />
      <Stack.Screen name="Transferts" component={Transferts} />
    </Stack.Navigator>
  );
}
function ManuelRetrouveStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={ManuelRetrouveScreen1} />
      <Stack.Screen name="ManuelRetrouve" component={ManuelRetrouve1} options={{ title: 'Manuel Retrouve' }}/>
    </Stack.Navigator>
  );
}
function ManuelRetrouveStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={ManuelRetrouveScreen} />
      <Stack.Screen name="ManuelRetrouve" component={ManuelRetrouve} options={{ title: 'Manuel Retrouve' }}/>
    </Stack.Navigator>
  );
}
// Stack Navigator pour Documentation et sous-menus
function DocumentationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={DocumentationScreen} />
      <Stack.Screen name="Manuel d'utilisation" component={Guide} options={{ title: 'Manuel d\'utilisation' }}/>
    </Stack.Navigator>
  );
}

function EtablissementchoisiStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={Etablissementchoisi} />
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}
// Stack Navigator pour la remise des manuels et sous-menus
function RemiseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={RemiseScreen} />
      <Stack.Screen name="RemiseEleve" component={RemiseEleve} options={{ title: 'Remise élève' }} />
      <Stack.Screen name="RemiseCe" component={RemiseCe} options={{ title: 'Remise CE' }} />
    </Stack.Navigator>
  );
}

// Stack Navigator pour les souscripteurs et sous-menus
function SouscripteursStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={SouscripteursScreen} />
      <Stack.Screen name="Eleves attendus" component={ElevesAttendus} options={{ title: 'Eleves attendus' }}/>
      <Stack.Screen name="Eleves Inscrits" component={Eleves} options={{ title: 'Eleves Inscrits' }}/>
      <Stack.Screen name="Ce Inscrits" component={CeInscrits} options={{ title: 'Ce Inscrits' }}/>
    </Stack.Navigator>
  );
}

function SouscripteursStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={SouscripteursScreen1} />
      <Stack.Screen name="Eleves attendus" component={ElevesAttendus1} options={{ title: 'Eleves attendus' }}/>
      <Stack.Screen name="Eleves Inscrits" component={Eleves1} options={{ title: 'Eleves Inscrits' }}/>
      <Stack.Screen name="Ce Inscrits" component={CeInscrits1} options={{ title: 'Ce Inscrits' }}/>
    </Stack.Navigator>
  );
}
// Stack Navigator pour les souscripteurs et sous-menus
function ValidationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={ValidationScreen} />
      <Stack.Screen name="Eleves" component={ValidationEleve} options={{ title: 'Validation Eleves' }}/>
      <Stack.Screen name="CEs" component={ValidationCe} options={{ title: 'Validation CEs' }}/>
    </Stack.Navigator>
  );
}

// Stack Navigator pour la remise des manuels et sous-menus
function RetourStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name=" " component={RetourScreen} />
      <Stack.Screen name="RetourEleve" component={RetourEleve} options={{ title: 'Retour Eleves' }}/>
      <Stack.Screen name="RetourCe" component={RetourCe} options={{ title: 'Retour CEs' }}/>
    </Stack.Navigator>
  );
}

function AppWrapper() {
  const [loading, setLoading] = useState(true); // Ajout de l'état pour le chargement
  const [isSyncing, setIsSyncing] = useState(false); // Nouvel état pour la synchronisation
  const {triggerRefresh} = useRefresh(); // 👈 on récupère le trigger ici
  const scheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('light');
  const effectiveScheme = 'light';
  const themeForProvider = lightTheme;
  const [initialRoute, setInitialRoute] = useState<'Accueil' | 'Login' | 'Main' | 'Main1'>('Accueil');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('themeMode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeMode(saved);
        }
      } catch {}
    })();
  }, []);

  const toggleThemeMode = React.useCallback(() => {
    // Dark mode disabled; keep light only
    setThemeMode('light');
    AsyncStorage.setItem('themeMode', 'light').catch(() => {});
  }, []);

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
        // Déterminer la route initiale en fonction de la session existante
        let userJson = await AsyncStorage.getItem('user');
        let etabId = await AsyncStorage.getItem('etablissements_id');
        let drenaId = await AsyncStorage.getItem('drenas_id');
        const token = await AsyncStorage.getItem('token');
        const hasToken = !!(token && token.trim().length > 0);
        let hasUser = !!userJson;
        // Si un token existe mais aucun user n'est encore chargé, tenter une vérification
        if (hasToken && !hasUser && AuthenticationService?.checkAuthentication) {
          try {
            await AuthenticationService.checkAuthentication();
            userJson = await AsyncStorage.getItem('user');
            // relire les IDs éventuels après vérification
            etabId = await AsyncStorage.getItem('etablissements_id');
            drenaId = await AsyncStorage.getItem('drenas_id');
          } catch {}
        }
        const hasEtab = !!(etabId && etabId.trim().length > 0);
        const hasDrena = !!(drenaId && drenaId.trim().length > 0);
        if (hasUser && hasEtab) {
          setInitialRoute('Main');
        } else if (hasUser && hasDrena) {
          setInitialRoute('Main1');
        } else {
          setInitialRoute('Accueil');
        }
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
    <ThemePrefContext.Provider value={{mode: themeMode, toggle: toggleThemeMode, setMode: setThemeMode}}>
    <PaperProvider theme={themeForProvider}>
      <NavigationContainer>
        <NetworkSync />

        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{header: props => <AppHeader {...props} />, headerShown: true}}>
          <Stack.Screen name="Accueil" component={Accueil} options={{headerShown: false}} />
          <Stack.Screen name="Guide" component={Guide} options={{title: 'Guide utilisateur'}} />
          <Stack.Screen name="Accueil2" component={Accueil2} options={{headerShown: false}} />
          <Stack.Screen name="Contacteznous" component={Contacteznous} options={{title: 'Contactez-nous'}} />
          <Stack.Screen name="SendEmail" component={SendEmail} options={{title: 'Envoyer un email'}} />
          <Stack.Screen
            name="RemiseEleveDetails"
            component={RemiseEleveDetails}
            options={{title: 'Détails remise élève'}}
          />
          <Stack.Screen name="RemiseCeDetails" component={RemiseCeDetails} options={{title: 'Détails remise CE'}} />
          <Stack.Screen
            name="RetourEleveDetails"
            component={RetourEleveDetails}
            options={{title: 'Détails retour élève'}}
          />
          <Stack.Screen name="RetourCeDetails" component={RetourCeDetails} options={{title: 'Détails retour CE'}} />
          <Stack.Screen name="Login" component={Login} options={{title: 'Connexion', headerShown: false}} />
          <Stack.Screen name="Main" component={DrawerScreens} options={{headerShown: false}} />
          <Stack.Screen name="Main1" component={DrawerScreens1} options={{headerShown: false}} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
    </ThemePrefContext.Provider>
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
