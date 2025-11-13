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
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthenticationService from '../authentificationservice';
import useAnneescolairesID from '../parametres/anneescolaire.js';
import {initializeDataEtab, initializeDataDrena} from '../db/database';

const Login = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const anneescolairesId = useAnneescolairesID();
  const usernameError = touched && !String(username).trim();
  const passwordError = touched && !String(password).trim();

  const handleLogin = async () => {
    setTouched(true);
    if (!String(username).trim() || !String(password).trim()) {
      return;
    }
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
          navigation.reset({index: 0, routes: [{name: 'Main'}]});
        } else {
          if (drenaId) {
            // await AsyncStorage.setItem('logindrena', username);
            await initializeDataDrena(drenaId, anneescolairesId);
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
      Alert.alert('Erreur', error.message);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.loadingText}>
            Chargement des données... Veuillez rester connecté
          </Text>
        </View>
      ) : (
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
            <Image source={require('./login.jpg')} style={[styles.heroImage, {height: heroHeight}]} accessibilityLabel="Illustration de manuels scolaires" />
            <LinearGradient
              colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.45)"]}
              style={styles.heroOverlay}
              pointerEvents="none"
            />
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
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    // padding: 16,
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
});

export default Login;
