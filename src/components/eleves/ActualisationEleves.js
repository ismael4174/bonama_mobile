import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
//importation de l'URL de connexion
//import url from '../api/urldeconnexion.js';
export default function RetourEleve({navigation}) {
  return (
    <View style={styles.container}>
      {/* <TouchableOpacity
        onPress={syncData}
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: 'blue',
          borderRadius: 5,
        }}>
        <Text style={{color: 'white'}}>Forcer la synchronisation</Text>
      </TouchableOpacity>*/}

      <Text>Actualisation des éleves</Text>
      <Button title="Eleves" onPress={() => navigation.navigate('Eleves')} />
      <Button title="CES" onPress={() => navigation.navigate('CE')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
