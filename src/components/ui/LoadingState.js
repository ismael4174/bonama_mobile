import React from 'react';
import {View, StyleSheet} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';

const LoadingState = ({label = 'Chargement en cours...'}) => (
  <View style={styles.container}>
    <ActivityIndicator animating size="large" />
    <Text style={styles.text}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 32},
  text: {marginTop: 12}
});

export default LoadingState;
