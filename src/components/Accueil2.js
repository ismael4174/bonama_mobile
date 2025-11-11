import React, {useEffect} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeIn, FadeInUp, FadeInDown} from 'react-native-reanimated';

const Accueil2 = ({navigation}) => {
  return (
    <LinearGradient colors={['#FFFFFF', '#D81B60']} style={styles.container}>
      {/* Section des logos */}
      <Animated.View style={styles.header} entering={FadeIn.delay(200)}>
        <Image source={require('./armoirie.png')} style={styles.logoSmall} />
        <Image source={require('./logo1.png')} style={styles.logoSmall} />
      </Animated.View>

      {/* Texte BONAMAS */}
      <Animated.Text style={styles.title} entering={FadeInUp.delay(400)}>
        BONAMAS
      </Animated.Text>

      {/* Texte descriptif */}
      <Animated.Text style={styles.subtitle} entering={FadeInUp.delay(600)}>
        Dispositif de prêt-location de manuels scolaires.
      </Animated.Text>

      {/* Image des manuels */}
      <Animated.Image
        source={require('./imageDeManuels.png')}
        style={styles.bookImage}
        entering={FadeInUp.delay(800)}
      />

      {/* Conteneur des boutons */}
      <Animated.View
        style={styles.buttonContainer}
        entering={FadeInUp.delay(1000)}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Contacteznous')}>
          <Text style={styles.buttonText}>Contactez-nous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Connexion</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    position: 'absolute',
    top: 20,
  },
  logoSmall: {
    width: 80,
    height: 50,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D81B60',
    marginTop: 80,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  bookImage: {
    width: 250,
    height: 150,
    resizeMode: 'contain',
    marginVertical: 20,
  },
  buttonContainer: {
    width: '80%',
    alignItems: 'center',
    gap: 15,
    marginTop: 20,
  },
  button: {
    width: '100%',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D81B60',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#D81B60',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Accueil2;
