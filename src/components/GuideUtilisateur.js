import React from 'react';
import {View, Text, Button, StyleSheet, Alert, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export default function GuideUtilisateur({navigation}) {
  const downloadManual = async () => {
    try {
      const downloadDest = `${RNFS.DocumentDirectoryPath}/manuel.pdf`;

      // Lire le fichier à partir des assets (Android)
      const fileContent = await RNFS.readFileAssets('manuel.pdf', 'base64');

      // Écrire le fichier dans le répertoire de documents
      await RNFS.writeFile(downloadDest, fileContent, 'base64');

      Share.open({
        url: 'file://' + downloadDest,
        type: 'application/pdf',
      }).catch(err => {
        err && console.log(err);
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement :', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du téléchargement du manuel.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text>GUIDE</Text>
      <Button title="Télécharger le manuel" onPress={downloadManual} />
      <Button title="Retour" onPress={() => navigation.goBack()} />
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
/*import React from 'react';
import {View, Text, Button, StyleSheet, Alert, Platform} from 'react-native';
import RNFS from 'react-native-fs';

export default function GuideUtilisateur({navigation}) {
  const downloadManual = async () => {
    try {
      const downloadDest = `${RNFS.DocumentDirectoryPath}/manuel.pdf`; // Chemin de destination du téléchargement
      const sourceUrl = RNFS.MainBundlePath + '/manuel.pdf'; // Chemin source du fichier dans votre application
      console.log('voici le chemein du pdf:', RNFS.MainBundlePath);
      // Téléchargement du fichier
      await RNFS.copyFile(sourceUrl, downloadDest);

      Alert.alert(
        'Téléchargement réussi',
        `Le manuel a été téléchargé dans : ${downloadDest}`,
      );
    } catch (error) {
      console.error('Erreur lors du téléchargement :', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du téléchargement du manuel.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text>GUIDE</Text>
      <Button title="Télécharger le manuel" onPress={downloadManual} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});*/

/*import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';

export default function GuideUtilisateur({navigation}) {
  return (
    <View style={styles.container}>
      <Text>GUIDE</Text>
      <Button
        title="Télécharger le manuel"
        onPress={() => navigation.navigate('Eleves')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});*/
