import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button, Icon} from 'react-native-paper';

const EmptyState = ({title = 'Aucun élément', subtitle = '', actionLabel, onAction}) => {
  return (
    <View style={styles.container}>
      <Icon source="inbox" size={40} />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction ? (
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

export default EmptyState;
