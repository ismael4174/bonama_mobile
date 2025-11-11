import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Button,
  Modal,
  TextInput,
} from 'react-native';
import {db} from '../../db/database';

const getLogsFromSQLite = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM sync_log',
        [],
        (_, results) => {
          const logs = [];
          for (let i = 0; i < results.rows.length; i++) {
            logs.push(results.rows.item(i));
          }
          resolve(logs);
        },
        (_, error) => reject(error),
      );
    });
  });
};

const addSyncLogToSQLite = (tableName, recordId, operation, data) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO sync_log (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)',
        [tableName, recordId, operation, data],
        (_, results) => resolve(results.insertId),
        (_, error) => reject(error),
      );
    });
  });
};

const updateSyncLogInSQLite = (id, tableName, recordId, operation, data) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE sync_log SET table_name = ?, record_id = ?, operation = ?, data = ? WHERE id = ?',
        [tableName, recordId, operation, data, id],
        resolve,
        reject,
      );
    });
  });
};

const deleteSyncLog = id => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM sync_log WHERE id = ?', [id], resolve, reject);
    });
  });
};

const SyncLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [newLog, setNewLog] = useState({
    table_name: '',
    record_id: '',
    operation: '',
    data: '',
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const fetchedLogs = await getLogsFromSQLite();
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddLog = async () => {
    try {
      await addSyncLogToSQLite(
        newLog.table_name,
        newLog.record_id,
        newLog.operation,
        newLog.data,
      );
      setNewLog({table_name: '', record_id: '', operation: '', data: ''});
      setIsAddModalVisible(false);
      loadLogs();
    } catch (error) {
      console.error("Erreur lors de l'ajout du log:", error);
      Alert.alert(
        'Erreur',
        "Une erreur s'est produite lors de l'ajout du log.",
      );
    }
  };

  const handleUpdateLog = async () => {
    try {
      await updateSyncLogInSQLite(
        editingLog.id,
        editingLog.table_name,
        editingLog.record_id,
        editingLog.operation,
        editingLog.data,
      );
      setEditingLog(null);
      setIsEditModalVisible(false);
      loadLogs();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du log:', error);
      Alert.alert(
        'Erreur',
        "Une erreur s'est produite lors de la mise à jour du log.",
      );
    }
  };

  const handleDeleteLog = async id => {
    Alert.alert('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce log ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Supprimer',
        onPress: async () => {
          try {
            await deleteSyncLog(id);
            loadLogs();
          } catch (error) {
            console.error('Erreur lors de la suppression du log:', error);
            Alert.alert(
              'Erreur',
              "Une erreur s'est produite lors de la suppression du log.",
            );
          }
        },
      },
    ]);
  };

  const renderLogItem = ({item}) => (
    <View style={styles.card}>
      <View>
        <Text>Table: {item.table_name}</Text>
        <Text>Record ID: {item.record_id}</Text>
        <Text>Operation: {item.operation}</Text>
        <Text>Data: {item.data}</Text>
        <Text>Timestamp: {item.timestamp}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => {
            setEditingLog(item);
            setIsEditModalVisible(true);
          }}>
          <Text style={styles.editButton}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteLog(item.id)}>
          <Text style={styles.deleteButton}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  return (
    <View style={styles.container}>
      <Button
        title="Ajouter un log"
        onPress={() => setIsAddModalVisible(true)}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={item => item.id.toString()}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Add Log Modal */}
      <Modal visible={isAddModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Table Name"
            value={newLog.table_name}
            onChangeText={text => setNewLog({...newLog, table_name: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Record ID"
            value={newLog.record_id}
            onChangeText={text => setNewLog({...newLog, record_id: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Operation"
            value={newLog.operation}
            onChangeText={text => setNewLog({...newLog, operation: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Data"
            value={newLog.data}
            onChangeText={text => setNewLog({...newLog, data: text})}
          />
          <Button title="Ajouter" onPress={handleAddLog} />
          <Button title="Annuler" onPress={() => setIsAddModalVisible(false)} />
        </View>
      </Modal>

      {/* Edit Log Modal */}
      <Modal visible={isEditModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Table Name"
            value={editingLog?.table_name || ''}
            onChangeText={text =>
              setEditingLog({...editingLog, table_name: text})
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Record ID"
            value={editingLog?.record_id || ''}
            onChangeText={text =>
              setEditingLog({...editingLog, record_id: text})
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Operation"
            value={editingLog?.operation || ''}
            onChangeText={text =>
              setEditingLog({...editingLog, operation: text})
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Data"
            value={editingLog?.data || ''}
            onChangeText={text => setEditingLog({...editingLog, data: text})}
          />
          <Button title="Enregistrer" onPress={handleUpdateLog} />
          <Button
            title="Annuler"
            onPress={() => setIsEditModalVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
  },
  deleteButton: {
    color: 'red',
  },
});

export default SyncLogs;
/*import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {db} from '../../db/database';

const getLogsFromSQLite = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM sync_log',
        [],
        (_, results) => {
          const logs = [];
          for (let i = 0; i < results.rows.length; i++) {
            logs.push(results.rows.item(i));
          }
          resolve(logs);
        },
        (_, error) => reject(error),
      );
    });
  });
};

const deleteSyncLog = id => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM sync_log WHERE id = ?', [id], resolve, reject);
    });
  });
};

const SyncLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const fetchedLogs = await getLogsFromSQLite();
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDeleteLog = async id => {
    Alert.alert('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce log ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Supprimer',
        onPress: async () => {
          try {
            await deleteSyncLog(id);
            loadLogs();
          } catch (error) {
            console.error('Erreur lors de la suppression du log:', error);
            Alert.alert(
              'Erreur',
              "Une erreur s'est produite lors de la suppression du log.",
            );
          }
        },
      },
    ]);
  };

  const renderLogItem = ({item}) => (
    <View style={styles.card}>
      <View>
        <Text>Table: {item.table_name}</Text>
        <Text>Record ID: {item.record_id}</Text>
        <Text>Operation: {item.operation}</Text>
        <Text>Data: {item.data}</Text>
        <Text>Timestamp: {item.timestamp}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => handleDeleteLog(item.id)}>
          <Text style={styles.deleteButton}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={item => item.id.toString()}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
  },
  deleteButton: {
    color: 'red',
  },
});

export default SyncLogs;*/
