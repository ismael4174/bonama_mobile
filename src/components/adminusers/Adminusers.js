import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, Alert} from 'react-native';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import axios from 'axios';
import API_URL from '../../api/urldeconnexion.js';

const AdminUsersList = () => {
  const [adminUsers, setAdminUsers] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM admin_users;',
        [],
        (_, {rows}) => setAdminUsers(rows._array),
        (_, error) => console.log('Erreur lors de la récupération', error),
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liste des Administrateurs</Text>
      <FlatList
        data={adminUsers}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.username}</Text>
            <Text style={styles.name}>{item.password}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    padding: 15,
    backgroundColor: 'white',
    marginVertical: 5,
    borderRadius: 5,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    alignItems: 'center',
  },
  count: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminUsersList;
