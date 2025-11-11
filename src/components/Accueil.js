import React, {useEffect} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeIn, FadeInUp, FadeInDown} from 'react-native-reanimated';

const Accueil = ({navigation}) => {
  return (
    <LinearGradient colors={['#FFFFFF', '#D81B60']} style={styles.container}>
      {/* Section des logos */}

      {/* Texte BONAMAS */}
      <Animated.Text style={styles.title} entering={FadeInUp.delay(400)}>
        BONAMAS
      </Animated.Text>

      {/* Conteneur des boutons */}
      <Animated.View
        style={styles.buttonContainer}
        entering={FadeInUp.delay(1000)}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Accueil2')}>
          <Text style={styles.buttonText}>Démarrer</Text>
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
    fontSize: 40,
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
    width: '30%',
    alignItems: 'center',
    gap: 15,
    marginTop: 200,
  },
  button: {
    width: '100%',
    //backgroundColor: 'white',
    backgroundColor: '#D81B60',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D81B60',
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    //color: '#D81B60',
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default Accueil;
