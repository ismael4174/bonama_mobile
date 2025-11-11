import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Button,
  Modal, // Import Modal
} from 'react-native';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import axios from 'axios';
import API_URL from '../../api/urldeconnexion.js';

// ... (Your SQLite and MySQL functions remain the same)

// Fonctions SQLite
const getLogsFromSQLite = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM sync_log',
        [],
        (_, results) => {
          const meslogs = [];
          for (let i = 0; i < results.rows.length; i++) {
            meslogs.push(results.rows.item(i));
          }
          resolve(meslogs);
        },
        (_, error) => reject(error),
      );
    });
  });
};
const getGenresFromSQLite = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM genre',
        [],
        (_, results) => {
          const genres = [];
          for (let i = 0; i < results.rows.length; i++) {
            genres.push(results.rows.item(i));
          }
          resolve(genres);
        },
        (_, error) => reject(error),
      );
    });
  });
};

const addGenreToSQLite = (genre, created_by, updated_by, deleted_by) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO genre (genre, created_by, updated_by, deleted_by) VALUES (?, ?, ?, ?)',
        [genre, created_by, updated_by, deleted_by],
        (_, results) => resolve(results.insertId),
        (_, error) => reject(error),
      );
    });
  });
};

/*const updateGenreInSQLite = (id, genre, updated_by) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE genre SET genre = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
        [genre, updated_by, id],
        resolve,
        reject,
      );
    });
  });
};*/

const updateGenreInSQLite = (id, genre, updated_by, newId = null) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      if (newId !== null && newId !== undefined && newId !== id) {
        // Mettre à jour l'ID si newId est fourni et différent de l'ID actuel
        tx.executeSql(
          'UPDATE genre SET id = ?, genre = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
          [newId, genre, updated_by, id],
          resolve,
          reject,
        );
      } else {
        // Mettre à jour les autres champs sans modifier l'ID
        tx.executeSql(
          'UPDATE genre SET genre = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
          [genre, updated_by, id],
          resolve,
          reject,
        );
      }
    });
  });
};

const deleteGenreFromSQLite = id => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM genre WHERE id = ?', [id], resolve, reject);
    });
  });
};
//////////////////////////////////////////////////////////////////////////////////////////////////
// Fonctions pour l'API MySQL
//const addGenreToMySQL = async (genre, created_by, updated_by, deleted_by) => {
const addGenreToMySQL = async genreData => {
  try {
    const dataToSendJSON = JSON.stringify(genreData);
    const response = await axios.post(`${API_URL}genres`, dataToSendJSON, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'ajout du genre sur le serveur:", error);
    throw error;
  }
};

const updateGenreInMySQL = async (id, genreData) => {
  try {
    const {id: idToExclude, ...dataToSend} = genreData;
    const dataToSendJSON = JSON.stringify(dataToSend);
    const response = await axios.patch(
      `${API_URL}genres/${id}`,
      dataToSendJSON,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('API Response:', response); // Affiche la réponse complète
    return response.data;
  } catch (error) {
    console.error('Error updating genre on server:', error);
    console.error('Error Response:', error.response); // Affiche la réponse d'erreur
    throw error;
  }
};

const deleteGenreFromMySQL = async id => {
  try {
    const response = await axios.delete(`${API_URL}genres/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error(
      'Erreur lors de la suppression du genre sur le serveur:',
      error,
    );
    throw error;
  }
};
/////////////////////////////////////////////////////////////////////
// Fonction de synchronisation
const syncGenre = async (genre, operation, id = null) => {
  const isConnected = await checkConnection();

  if (isConnected) {
    try {
      if (operation === 'add') {
        const newGenre = await addGenreToMySQL(
          genre,
          /*genre.genre,
          genre.created_by,
          genre.updated_by,
          genre.deleted_by,*/
        );
        // Mettre à jour l'ID dans SQLite si nécessaire (si l'API retourne un ID différent)
        if (newGenre && newGenre.id) {
          await updateGenreInSQLite(
            genre.id,
            genre.genre,
            genre.updated_by,
            newGenre.id,
          );
        }
      } else if (operation === 'update') {
        await updateGenreInMySQL(genre.id, genre);
      } else if (operation === 'delete') {
        await deleteGenreFromMySQL(id);
      }
    } catch (error) {
      console.error(
        'Erreur lors de la synchronisation avec le serveur:',
        error,
      );
      // Gérer l'erreur (par exemple, afficher un message à l'utilisateur)
    }
  } else {
    try {
      // Enregistrer l'opération dans sync_log (à implémenter)
      const recordId = id || genre.id; // Use provided ID or genre.id
      await addSyncLog('genre', recordId, operation, JSON.stringify(genre));
      console.log(
        'Opération enregistrée dans sync_log:',
        operation,
        'genre',
        id || genre.id,
        JSON.stringify(genre),
      );
    } catch (error) {
      console.error('Error adding to sync_log:', error);
      // Handle error (e.g., show a message to the user)
    }
  }
};
/////////////////////
const Genres = () => {
  const [genres, setGenres] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false); // Modal visibility state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // Modal visibility state
  const [newGenre, setNewGenre] = useState('');
  const [editingGenre, setEditingGenre] = useState(null);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    setIsLoading(true);
    try {
      const fetchedGenres = await getGenresFromSQLite();
      setGenres(fetchedGenres);
      //console.log('DONNEES GENRES:',fetchedGenres);
    } catch (error) {
      console.error('Erreur lors du chargement des genres:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false); // Réinitialiser l'état de rafraîchissement
    }
  };

  const handleAddGenre = async () => {
    if (!newGenre) return;

    try {
      const genreId = await addGenreToSQLite(newGenre);
      const genreToSync = {id: genreId, genre: newGenre};
      await syncGenre(genreToSync, 'add');
      setNewGenre('');
      setIsAddModalVisible(false); // Close the modal after adding
      loadGenres();
    } catch (error) {
      console.error('Error adding genre:', error);
      Alert.alert('Error', 'An error occurred while adding the genre.');
    }
  };

  const handleUpdateGenre = async () => {
    if (!editingGenre || !editingGenre.genre) return;

    try {
      //console.log(editingGenre);
      await updateGenreInSQLite(editingGenre.id, editingGenre.genre);
      await syncGenre(editingGenre, 'update');
      setEditingGenre(null);
      setIsEditModalVisible(false); // Close the modal after updating
      loadGenres();
    } catch (error) {
      console.error('Error updating genre:', error);
      Alert.alert('Error', 'An error occurred while updating the genre.');
    }
  };

  const handleDeleteGenre = async id => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer ce genre ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              await deleteGenreFromSQLite(id);
              await syncGenre({id}, 'delete', id);
              loadGenres();
            } catch (error) {
              console.error('Erreur lors de la suppression du genre:', error);
              Alert.alert(
                'Erreur',
                "Une erreur s'est produite lors de la suppression du genre.",
              );
            }
          },
        },
      ],
    );
  };

  const renderGenreItem = ({item}) => (
    <View style={styles.card}>
      <Text>{item.genre}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => {
            setEditingGenre(item);
            setIsEditModalVisible(true); // Open edit modal
          }}>
          <Text style={styles.editButton}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteGenre(item.id)}>
          <Text style={styles.deleteButton}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredGenres = genres.filter(genre =>
    genre.genre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadGenres();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Rechercher un genre"
        onChangeText={setSearchTerm}
        value={searchTerm}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={filteredGenres}
          renderItem={renderGenreItem}
          keyExtractor={item => item.id.toString()}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      )}

      <Button
        title="Ajouter un genre"
        onPress={() => setIsAddModalVisible(true)}
      />

      {/* Add Genre Modal */}
      <Modal visible={isAddModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nouveau genre"
            onChangeText={setNewGenre}
            value={newGenre}
          />
          <Button title="Ajouter" onPress={handleAddGenre} />
          <Button title="Annuler" onPress={() => setIsAddModalVisible(false)} />
        </View>
      </Modal>

      {/* Edit Genre Modal */}
      <Modal visible={isEditModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Modifier le genre"
            onChangeText={text =>
              setEditingGenre({...editingGenre, genre: text})
            }
            value={editingGenre ? editingGenre.genre : ''} // Handle null editingGenre
          />
          <Button title="Enregistrer" onPress={handleUpdateGenre} />
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
  // ... (Your existing styles)
  container: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 3, // Pour l'ombre sur Android
    shadowColor: '#000', // Pour l'ombre sur iOS
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row', // Aligner le texte et les boutons
    justifyContent: 'space-between', // Espacer le texte et les boutons
    alignItems: 'center', // Centrer verticalement le texte et les boutons
  },
  cardActions: {
    flexDirection: 'row',
  },
  editButton: {
    color: 'blue',
    marginRight: 8,
  },
  deleteButton: {
    color: 'red',
  },
  formContainer: {
    marginTop: 16,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white', // Add background color for better visibility
  },
});

export default Genres;
