import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';

const SendEmail = ({navigation}) => {
  const [message, setMessage] = useState('');

  const sendEmail = () => {
    const email = 'atioumou@gmail.com';
    const subject = "Contact depuis l'application";
    const body = encodeURIComponent(message);

    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoLink)
      .then(() => Alert.alert('Succès', 'Application mail ouverte !'))
      .catch(() =>
        Alert.alert('Erreur', 'Impossible d’ouvrir l’application mail.'),
      );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Envoyer un mail</Text>

      <TextInput
        style={styles.input}
        placeholder="Votre message..."
        multiline
        numberOfLines={5}
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={sendEmail}>
        <Text style={styles.buttonText}>Envoyer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Retour</Text>
      </TouchableOpacity>
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
  input: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#D81B60',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#D81B60',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SendEmail;
