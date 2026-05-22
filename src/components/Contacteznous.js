import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const Contacteznous = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contactez-nous</Text>
      <Text style={styles.text}>📧 Email: a.niangoran@education.gouv.ci</Text>
      <Text style={styles.text}>📞 Téléphone: +225 01 53 98 98 57</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mailButton}
          onPress={() => navigation.navigate('SendEmail')}>
          <Text style={styles.buttonText}>Envoyer un mail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D81B60',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  mailButton: {
    backgroundColor: '#D81B60',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
export default Contacteznous;
