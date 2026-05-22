import React, {useState, useEffect, useRef} from 'react';
import {View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, Dimensions, ScrollView, Keyboard} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  HelperText,
  Surface,
  IconButton,
  ProgressBar,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthenticationService from '../authentificationservice';
import useAnneescolairesID from '../parametres/anneescolaire.js';
import {initializeDataEtab, initializeDataDrena, resetDatabase, resetDatabaseDrena, refreshAdminUsers} from '../db/database';
import {checkConnection} from '../db/network';

const TABLE_LABELS = {
  etablissements: 'Établissements',
  etablissementannees: 'Années scolaires',
  eleves: 'Élèves',
  elevesinscrits: 'Élèves inscrits',
  ues: "Unités d'enseignement",
  uesannees: 'Manuels par année',
  commandesues: 'Commandes',
  detailscommandeues: 'Détails des commandes',
  receptiondrena: 'Réceptions DRENA',
  detailsreceptiondrena: 'Détails réceptions DRENA',
  receptions: 'Réceptions',
  detailsreceptions: 'Détails des réceptions',
  stockmanuels: 'Stock de manuels',
  manuelseleves: 'Manuels des élèves',
  manuelsues: 'Manuels UE',
  drenas: 'DRENA',
  transferts: 'Transferts',
  detailstransferts: 'Détails des transferts',
};

const Login = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingStage, setLoadingStage] = useState({current: 0, total: 0, tableName: ''});
  const anneescolairesId = useAnneescolairesID();
  const usernameError = touched && !String(username).trim();
  const passwordError = touched && !String(password).trim();

  const handleLogin = async () => {
    setTouched(true);
    if (!String(username).trim() || !String(password).trim()) {
      return;
    }
    setLoading(true);
    setLoadingStage({current: 0, total: 0, tableName: ''});
    try {
      // Rafraîchir admin_users depuis le serveur si connecté, pour qu'un
      // utilisateur créé après l'installation soit bien dans la base locale.
      try {
        const isConnected = await checkConnection();
        if (isConnected) {
          await refreshAdminUsers();
        }
      } catch {
        // Non-bloquant : on continue avec les données locales existantes.
      }

      const data = await AuthenticationService.login(username, password);

      if (data) {
        await AuthenticationService.checkAuthentication();
        const monEtablissementId = await AsyncStorage.getItem('etablissements_id');
        const etablissementId = parseInt(monEtablissementId, 10);
        const madrenaId = await AsyncStorage.getItem('drenas_id');
        const drenaId = parseInt(madrenaId, 10);

        const onProgress = (current, total, tableName) => {
          setLoadingStage({current, total, tableName});
        };

        // Comparer avec la session précédente pour détecter un changement de contexte.
        // Sans reset, INSERT OR IGNORE saute silencieusement les enregistrements dont
        // l'ID existe déjà (issus de l'ancienne session), ce qui vide les écrans.
        const lastEtabId = await AsyncStorage.getItem('last_etab_id');
        const lastDrenaId = await AsyncStorage.getItem('last_drena_id');

        if (etablissementId) {
          const contextChanged = !!lastDrenaId || lastEtabId !== String(etablissementId);
          if (contextChanged) {
            await resetDatabase();
            await AsyncStorage.removeItem('last_drena_id');
          }
          await initializeDataEtab(etablissementId, anneescolairesId, false, onProgress);
          await AsyncStorage.setItem('last_etab_id', String(etablissementId));
          navigation.reset({index: 0, routes: [{name: 'Main'}]});
        } else {
          if (drenaId) {
            const contextChanged = !!lastEtabId || lastDrenaId !== String(drenaId);
            if (contextChanged) {
              await resetDatabaseDrena();
              await AsyncStorage.removeItem('last_etab_id');
            }
            await initializeDataDrena(drenaId, anneescolairesId, false, onProgress);
            await AsyncStorage.setItem('last_drena_id', String(drenaId));
            navigation.reset({index: 0, routes: [{name: 'Main1'}]});
          } else {
            Alert.alert(
              'Erreur',
              'Cette application est réservée seulement pour les établissements, les ce et les DRENA',
            );
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
          }
        }
      } else {
        Alert.alert('Erreur', "Nom d'utilisateur ou mot de passe incorrect");
      }
    } catch (error) {
      console.error('Login failed:', error);
      if (error.message === 'USER_NOT_FOUND') {
        Alert.alert(
          'Utilisateur introuvable',
          "Aucun compte trouvé pour ce nom d'utilisateur. Vérifiez la saisie ou contactez votre administrateur.",
        );
      } else {
        Alert.alert('Erreur', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const screenHeight = Dimensions.get('window').height;
  const HERO_HEIGHT = Math.round(screenHeight * (screenHeight < 700 ? 0.52 : 0.6));
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const scrollRef = useRef(null);
  const passwordRef = useRef(null);
  const [usernameY, setUsernameY] = useState(0);
  const [passwordY, setPasswordY] = useState(0);
  const [heroHeight, setHeroHeight] = useState(HERO_HEIGHT);

  useEffect(() => {
    const onShow = (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardPadding(h);
      const reduced = Math.round(screenHeight * (screenHeight < 700 ? 0.38 : 0.46));
      setHeroHeight(reduced);
    };
    const onHide = () => {
      setKeyboardPadding(0);
      setHeroHeight(HERO_HEIGHT);
    };
    const subShow = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillShow', onShow) : Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillHide', onHide) : Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const progressValue = loadingStage.total > 0 ? loadingStage.current / loadingStage.total : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {loading ? (
        <View style={styles.loadingScreen}>
          <LinearGradient
            colors={['#D81B60', '#880E4F']}
            style={styles.loadingGradient}
            start={{x: 0.2, y: 0}}
            end={{x: 0.8, y: 1}}
          >
            <View style={styles.loadingLogoCircle}>
              <Image
                source={require('./logobonamas.png')}
                style={styles.loadingLogoImage}
                accessibilityLabel="Logo BONAMAS"
              />
            </View>
            <Text style={styles.loadingAppName}>BONAMAS</Text>
            <Text style={styles.loadingStatusText}>
              {loadingStage.total === 0
                ? 'Authentification...'
                : 'Initialisation des données...'}
            </Text>
            <View style={styles.progressWrapper}>
              {loadingStage.total > 0 ? (
                <>
                  <ProgressBar
                    progress={progressValue}
                    color="#FFFFFF"
                    style={styles.progressBar}
                  />
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressTableName} numberOfLines={1}>
                      {loadingStage.tableName
                        ? TABLE_LABELS[loadingStage.tableName] || loadingStage.tableName
                        : 'Finalisation...'}
                    </Text>
                    <Text style={styles.progressCount}>
                      {loadingStage.current}/{loadingStage.total}
                    </Text>
                  </View>
                </>
              ) : (
                <ActivityIndicator
                  animating
                  color="#FFFFFF"
                  size="small"
                  style={{marginTop: 24}}
                />
              )}
            </View>
            <Text style={styles.loadingHintText}>Veuillez rester connecté</Text>
          </LinearGradient>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{flex: 1}}
          contentContainerStyle={[styles.scroll, {paddingBottom: 120 + keyboardPadding, minHeight: screenHeight}]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
          scrollEventThrottle={16}
          nestedScrollEnabled
        >
          <View style={{flex: 1}}>
            <View style={styles.heroContainer}>
              <IconButton
                icon="chevron-left"
                size={24}
                onPress={() => navigation.navigate('Accueil2')}
                style={styles.backButton}
                iconColor="#FFFFFF"
                accessibilityLabel="Revenir à l'accueil"
              />
              <Image source={('')} style={[styles.heroImage, {height: heroHeight}]} accessibilityLabel="Illustration de manuels scolaires" />
              <LinearGradient
                colors={["#FFFFFF", "#D81B60"]}
                style={styles.heroOverlay}
                pointerEvents="none"
              >
                <View style={styles.logoCircle}>
                  <Image
                    source={require('./logobonamas.png')}
                    style={styles.logoImage}
                    accessibilityLabel="Logo BONAMAS"
                  />
                </View>
              </LinearGradient>
              <Text style={styles.heroTitle}>BONAMAS LOGIN</Text>
            </View>
            <Surface style={styles.card} mode="flat" accessibilityLabel="Formulaire de connexion">
              <Text
                variant="headlineMedium"
                style={styles.title}
                accessibilityLabel="Titre de la page Connexion"
              >
                Connexion
              </Text>
            <View onLayout={(e) => setUsernameY(e.nativeEvent.layout.y)}>
              <TextInput
                mode="flat"
                style={styles.input}
                label="Nom d'utilisateur"
                value={username}
                onChangeText={setUsername}
                onFocus={() => scrollRef.current?.scrollTo({y: Math.max(0, usernameY - 24), animated: true})}
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                left={<TextInput.Icon icon="account" />}
                error={!!usernameError}
                underlineColor="#9CA3AF"
                activeUnderlineColor="#2563EB"
                accessibilityLabel="Champ nom d'utilisateur"
                accessibilityHint="Saisissez votre nom d'utilisateur"
              />
            </View>
            <HelperText type="error" visible={!!usernameError}>
              Nom d'utilisateur requis
            </HelperText>
            <View onLayout={(e) => setPasswordY(e.nativeEvent.layout.y)}>
              <TextInput
                ref={passwordRef}
                mode="flat"
                style={styles.input}
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                onFocus={() => scrollRef.current?.scrollTo({y: Math.max(0, passwordY - 24), animated: true})}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                left={<TextInput.Icon icon="lock" />}
                right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(prev => !prev)}
                  forceTextInputFocus={false}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                />
              }
              error={!!passwordError}
              underlineColor="#9CA3AF"
              activeUnderlineColor="#2563EB"
              accessibilityLabel="Champ mot de passe"
              accessibilityHint="Saisissez votre mot de passe"
            />
            </View>
            <HelperText type="error" visible={!!passwordError}>
              Mot de passe requis
            </HelperText>
            <Button
              mode="contained"
              onPress={handleLogin}
              disabled={loading || !String(username).trim() || !String(password).trim()}
              loading={loading}
              accessibilityRole="button"
              accessibilityLabel="Bouton Se connecter"
              accessibilityHint="Valide vos identifiants et ouvre le tableau de bord"
              style={styles.primaryButton}
              contentStyle={styles.primaryButtonContent}
              labelStyle={styles.primaryButtonLabel}
            >
              Se connecter
            </Button>
            <View style={{height: 24}} />
            </Surface>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    justifyContent: 'flex-start',
  },
  card: {
    padding: 24,
    marginHorizontal: 0,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginTop: -96,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 0,
  },
  heroContainer: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 2,
  },
  heroImage: {
    width: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 9},
    marginTop: -196,
    elevation: 40,
  },
  logoImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  heroTitle: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    transform: [{translateY: -12}],
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  primaryButton: {
    borderRadius: 26,
    marginTop: 8,
  },
  primaryButtonContent: {
    height: 50,
  },
  primaryButtonLabel: {
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  input: {
    marginBottom: 12,
  },
  // Écran de chargement progressif
  loadingScreen: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  loadingLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 8,
    marginBottom: 28,
  },
  loadingLogoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  loadingAppName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 8,
  },
  loadingStatusText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 48,
  },
  progressWrapper: {
    width: '100%',
    marginBottom: 36,
    minHeight: 60,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  progressTableName: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  progressCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 12,
  },
  loadingHintText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default Login;
