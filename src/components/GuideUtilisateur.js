import React, {useState} from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export default function GuideUtilisateur({navigation}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadManual = async () => {
    try {
      if (isDownloading) {
        return;
      }

      setIsDownloading(true);

      const fileUrl = 'https://bonamas.mena-ci.com/uploads/manuel_mobile.pdf';

      // Utiliser le dossier interne de l'application, accessible sans permissions
      const basePath = RNFS.DocumentDirectoryPath;

      // S'assurer que le dossier existe (en pratique DocumentDirectoryPath existe déjà)
      const dirExists = await RNFS.exists(basePath);
      if (!dirExists) {
        await RNFS.mkdir(basePath);
      }

      const downloadDest = `${basePath}/manuel_mobile.pdf`;

      const options = {
        fromUrl: fileUrl,
        toFile: downloadDest,
      };

      const result = await RNFS.downloadFile(options).promise;

      if (result.statusCode === 200) {
        Alert.alert(
          'Téléchargement terminé',
          `Le manuel a été téléchargé dans vos fichiers.\n\nChemin : ${downloadDest}`,
        );
      } else {
        Alert.alert(
          'Erreur',
          "Le téléchargement du manuel a échoué. Veuillez réessayer.",
        );
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement :', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du téléchargement du manuel.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text>GUIDE</Text>
      <Text></Text>
      <View style={{marginVertical: 8}}>
        <Button
          title={isDownloading ? 'Téléchargement...' : 'Télécharger le manuel'}
          onPress={downloadManual}
          disabled={isDownloading}
        />
      </View>
      {isDownloading && (
        <ActivityIndicator size="small" color="#007AFF" />
      )}
      <Text></Text>
      <Button title="Précédent" onPress={() => navigation.goBack()} />
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
