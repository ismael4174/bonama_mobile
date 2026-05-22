import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button, Icon} from 'react-native-paper';

const ErrorState = ({title = 'Une erreur est survenue', subtitle = 'Veuillez réessayer.', actionLabel = 'Réessayer', onAction}) => {
  return (
    <View style={styles.container}>
      <Icon source="alert-circle" size={40} color="#d32f2f" />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {onAction ? (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 32},
  title: {marginTop: 8},
  subtitle: {marginTop: 4, color: '#666', textAlign: 'center', paddingHorizontal: 16},
  button: {marginTop: 12},
});

export default ErrorState;
