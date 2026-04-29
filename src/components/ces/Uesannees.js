import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import {
  TextInput as PaperTextInput,
  Button as PaperButton,
} from 'react-native-paper';
import axios from 'axios';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import API_URL from '../../api/urldeconnexion.js';
import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';

const Uesannees = () => {
  const etablissementsID = useEtablissementId();
  const anneescolairesID = useAnneescolairesID();

  const [ues, setUes] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUe, setEditingUe] = useState(null);
  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    if (etablissementsID && anneescolairesID) {
      fetchUes();
    }
  }, [etablissementsID, anneescolairesID]);

  const fetchUes = () => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT 
            u.id,
            u.denominationue,
            u.etablissements_id,
            u.matieres_id,
            ua.id AS uesannees_id,
            ua.anneescolaires_id,
            a.libelleanneescolaire AS anneescolaire_libelle,
            ua.matriculeresponsablece,
            ua.nomresponsablece,
            ua.emailresponsablece,
            ua.contactresponsablece
         FROM ues u
         INNER JOIN uesannees ua ON ua.ues_id = u.id
         INNER JOIN anneescolaires a ON a.id = ua.anneescolaires_id
         WHERE u.etablissements_id = ? AND ua.anneescolaires_id = ?`,
        [etablissementsID, anneescolairesID],
        (_, {rows}) => {
          setUes(rows.raw());
        },
        error => {
          console.error('Erreur lors du chargement des UEs/années :', error);
        },
      );
    });
  };

  const syncData = async (localId, data) => {
    const isConnected = await checkConnection();

    if (!isConnected) {
      addSyncLog('uesannees', localId, 'update', data);
      return;
    }

    const url = `${API_URL}uesannees/${localId}`;

    try {
      console.log(
        '🔼 Envoi mise à jour UE vers API depuis Uesannees:',
        JSON.stringify(data),
      );

      await axios.put(url, data, {
        headers: {'Content-Type': 'application/json'},
      });

      db.transaction(tx => {
        tx.executeSql('DELETE FROM sync_log WHERE record_id = ?', [localId]);
      });
    } catch (error) {
      if (error.response) {
        console.error(
          'Sync erreur 422/4xx, body réponse API :',
          error.response.status,
          error.response.data,
        );
      } else {
        console.error('Sync erreur réseau/axios :', error.message || error);
      }

      addSyncLog('uesannees', localId, 'update', data);
    }
  };

  const openModal = ue => {
    setEditingUe(ue);
    setMatricule(ue.matriculeresponsablece || '');
    setNom(ue.nomresponsablece || '');
    setEmail(ue.emailresponsablece || '');
    setContact(ue.contactresponsablece || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingUe(null);
  };

  const saveUe = () => {
    if (!editingUe) {
      return;
    }

    // ID de la ligne uesannees (clé primaire côté API)
    const uesanneesId = editingUe.uesannees_id;

    db.transaction(tx => {
      tx.executeSql(
        `UPDATE uesannees
         SET matriculeresponsablece = ?,
             nomresponsablece = ?,
             emailresponsablece = ?,
             contactresponsablece = ?
         WHERE ues_id = ? AND anneescolaires_id = ?`,
        [matricule, nom, email, contact, editingUe.id, anneescolairesID],
        async () => {
          const data = {
            ues_id: editingUe.id,
            anneescolaires_id: anneescolairesID,
            matriculeresponsablece: matricule,
            nomresponsablece: nom,
            emailresponsablece: email,
            contactresponsablece: contact,
            created_by: etablissementsID, // id de l’établissement connecté
            updated_by: etablissementsID,
            deleted_by: 0, // ou etablissementsID si ton backend préfère
          };

          await addSyncLog('uesannees', uesanneesId, 'update', data);
          await syncData(uesanneesId, data);
          fetchUes();
          Alert.alert('Succès', 'Informations mises à jour avec succès.');
          closeModal();
        },
        error => {
          console.error("Erreur lors de la mise à jour de l'UE :", error);
        },
      );
    });
  };

  const filteredUes = useMemo(() => {
    const q = (searchText || '').trim().toLowerCase();
    if (!q) {
      return ues;
    }
    return ues.filter(ue =>
      (ue.denominationue || '').toLowerCase().includes(q),
    );
  }, [ues, searchText]);

  return (
    <View style={styles.container}>
      <PaperTextInput
        mode="outlined"
        style={styles.searchInput}
        placeholder="Rechercher un CE / UE"
        value={searchText}
        onChangeText={setSearchText}
        left={<PaperTextInput.Icon icon="magnify" />}
      />

      <FlatList
        data={filteredUes}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.denominationue}</Text>
            <Text style={styles.subtitle}>
              Année : {item.anneescolaire_libelle}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openModal(item)}>
                <Text style={{fontSize: 18}}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingUe ? editingUe.denominationue : ''}
            </Text>
            <PaperTextInput
              mode="outlined"
              style={styles.input}
              placeholder="Matricule responsable"
              value={matricule}
              onChangeText={setMatricule}
            />
            <PaperTextInput
              mode="outlined"
              style={styles.input}
              placeholder="Nom responsable"
              value={nom}
              onChangeText={setNom}
            />
            <PaperTextInput
              mode="outlined"
              style={styles.input}
              placeholder="Email responsable"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <PaperTextInput
              mode="outlined"
              style={styles.input}
              placeholder="Contact"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
            />

            <PaperButton mode="contained" onPress={saveUe}>
              Enregistrer
            </PaperButton>
            <PaperButton style={{marginTop: 8}} onPress={closeModal}>
              Annuler
            </PaperButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
    backgroundColor: '#fff',
  },
  searchInput: {
    marginBottom: 10,
  },
  card: {
    padding: 15,
    margin: 10,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
});

export default Uesannees;

