import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import uuid from 'react-native-uuid';
import SQLite from 'react-native-sqlite-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../db/database';
import {addSyncLog} from '../../db/sync_log';
import {checkConnection} from '../../db/network';
import API_URL from '../../api/urldeconnexion.js';
import CustomPicker from '../CustomPicker';
import useEtablissementId from '../../parametres/etablissement.js';
import useAnneescolairesID from '../../parametres/anneescolaire.js';

const CreationDeCe = () => {
  const anneescolairesID = useAnneescolairesID();
  const etablissementsID = useEtablissementId();

  const [ues, setUes] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUe, setEditingUe] = useState(null);
  const [denominationue, setDenominationue] = useState('');
  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [annee, setAnnee] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [matiere, setMatiere] = useState('');
  const [etablissements, setEtablissements] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [annees, setAnnees] = useState([]);

  useEffect(() => {
    fetchUes();
  }, []);

  useEffect(() => {
    // Récupérer les établissements
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, nometablissement FROM etablissements;',
        [],
        (_, results) => {
          let rows = results.rows.raw();
          setEtablissements(rows);
        },
        error =>
          console.log('Erreur lors du chargement des établissements', error),
      );
    });

    // Récupérer les années scolaires
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libelleanneescolaire FROM anneescolaires;',
        [],
        (_, results) => {
          let rows = results.rows.raw();
          setAnnees(rows);
        },
        error =>
          console.log('Erreur lors du chargement des années scolaires', error),
      );
    });

    // Récupérer les matières
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id, libellematiere FROM matieres;',
        [],
        (_, results) => {
          let rows = results.rows.raw();
          setMatieres(rows);
        },
        error => console.log('Erreur lors du chargement des matières', error),
      );
    });
  }, []);

  const fetchUes = () => {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM ues', [], (_, {rows}) => {
        setUes(rows.raw());
      });
    });
  };

  const handleSearch = text => {
    setSearchText(text);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM ues WHERE denominationue LIKE ?',
        [`%${text}%`],
        (_, {rows}) => {
          setUes(rows.raw());
        },
      );
    });
  };

  const syncData = async (localId, action) => {
    const data = {
      denominationue: denominationue,
      etablissements_id: etablissement,
      matieres_id: matiere,
      responsable: {
        matriculeresponsablece: matricule,
        nomresponsablece: nom,
        emailresponsablece: email,
        contactresponsablece: contact,
        anneescolaires_id: annee,
      },
    };

    const isConnected = await checkConnection();

    if (isConnected) {
      const url =
        action === 'insert' ? `${API_URL}ues` : `${API_URL}ues/${localId}`;
      const method = action === 'insert' ? axios.post : axios.put;

      method(url, data, {
        headers: {'Content-Type': 'application/json'},
      })
        .then(() => {
          db.transaction(tx => {
            tx.executeSql('DELETE FROM sync_log WHERE record_id = ?', [
              localId,
            ]);
          });
        })
        .catch(error => console.error('Sync erreur:', error));
    } else {
      addSyncLog('ues', localId, action, data);
    }
  };

  // 🧩 FONCTION SAVEUE COMPLÈTE AVEC SYNCHRONISATION
  const saveUe = async () => {
    if (!denominationue || !etablissement || !matiere || !annee) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    db.transaction(tx => {
      if (editingUe) {
        // --- 🔄 Mise à jour d'une UE existante ---
        tx.executeSql(
          'UPDATE ues SET denominationue = ?, etablissements_id = ?, matieres_id = ? WHERE id = ?',
          [denominationue, etablissement, matiere, editingUe.id],
          async (_, result) => {
            tx.executeSql(
              `UPDATE uesannees 
               SET matriculeresponsablece = ?, nomresponsablece = ?, emailresponsablece = ?, contactresponsablece = ?, anneescolaires_id = ?
               WHERE ues_id = ?`,
              [matricule, nom, email, contact, annee, editingUe.id],
            );

            await addSyncLog('ues', editingUe.id, 'update', {
              denominationue,
              etablissements_id: etablissement,
              matieres_id: matiere,
              responsable: {
                matriculeresponsablece: matricule,
                nomresponsablece: nom,
                emailresponsablece: email,
                contactresponsablece: contact,
                anneescolaires_id: annee,
              },
            });

            await syncData(editingUe.id, 'update');

            fetchUes();
            Alert.alert('Succès', 'UE mise à jour avec succès.');
            closeModal();
          },
          error =>
            console.error('Erreur lors de la mise à jour de l’UE :', error),
        );
      } else {
        // --- ➕ Insertion d'une nouvelle UE ---
        const ueUuid = uuid.v4();
        tx.executeSql(
          'INSERT INTO ues (uuid, denominationue, etablissements_id, matieres_id) VALUES (?, ?, ?, ?)',
          [ueUuid, denominationue, etablissement, matiere],
          async (_, result) => {
            const insertedId = result.insertId;

            tx.executeSql(
              `INSERT INTO uesannees 
                (uuid, ues_id, matriculeresponsablece, nomresponsablece, emailresponsablece, contactresponsablece, anneescolaires_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [uuid.v4(), insertedId, matricule, nom, email, contact, annee],
            );

            await addSyncLog('ues', insertedId, 'insert', {
              denominationue,
              etablissements_id: etablissement,
              matieres_id: matiere,
              responsable: {
                matriculeresponsablece: matricule,
                nomresponsablece: nom,
                emailresponsablece: email,
                contactresponsablece: contact,
                anneescolaires_id: annee,
              },
            });

            await syncData(insertedId, 'insert');

            fetchUes();
            Alert.alert('Succès', 'UE enregistrée avec succès.');
            closeModal();
          },
          error => console.error('Erreur lors de l’insertion de l’UE :', error),
        );
      }
    });
  };

  const deleteUe = id => {
    Alert.alert('Confirmation', 'Voulez-vous supprimer cette UE ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Oui',
        onPress: () => {
          db.transaction(tx => {
            tx.executeSql('DELETE FROM ues WHERE id = ?', [id], () => {
              tx.executeSql('DELETE FROM uesannees WHERE ues_id = ?', [id]);
              db.transaction(tx2 => {
                tx2.executeSql(
                  'INSERT INTO sync_log (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
                  ['ues', id, 'delete', JSON.stringify({id})],
                );
              });
              fetchUes();
            });
          });
        },
      },
    ]);
  };

  const openModal = (ue = null) => {
    if (ue) {
      setEditingUe(ue);
      setDenominationue(ue.denominationue);
      setEtablissement(ue.etablissements_id);
      setMatiere(ue.matieres_id);
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM uesannees WHERE ues_id = ?',
          [ue.id],
          (_, {rows}) => {
            const respo = rows.item(0);
            if (respo) {
              setMatricule(respo.matriculeresponsablece);
              setNom(respo.nomresponsablece);
              setEmail(respo.emailresponsablece);
              setContact(respo.contactresponsablece);
              setAnnee(respo.anneescolaires_id);
            }
          },
        );
      });
    } else {
      setEditingUe(null);
      setDenominationue('');
      setMatricule('');
      setNom('');
      setEmail('');
      setContact('');
      setAnnee(anneescolairesID || '');
      setEtablissement(etablissementsID || '');
      setMatiere('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingUe(null);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Recherche rapide"
        value={searchText}
        placeholderTextColor="black"
        onChangeText={handleSearch}
      />

      <Button title="Ajouter une UE" onPress={() => openModal()} />

      <FlatList
        data={ues}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const etab = etablissements.find(
            e => e.id === item.etablissements_id,
          );
          const mat = matieres.find(m => m.id === item.matieres_id);
          return (
            <View style={styles.card}>
              <Text style={styles.title}>{item.denominationue}</Text>
              <Text>
                {etab ? etab.nometablissement : 'Établissement inconnu'}
              </Text>
              <Text>{mat ? mat.libellematiere : 'Matière inconnue'}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(item)}>
                  <Text style={{fontSize: 20}}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteUe(item.id)}>
                  <Text style={{fontSize: 20}}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modale */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <TextInput
              style={styles.input}
              placeholder="Nom UE"
              placeholderTextColor="black"
              value={denominationue}
              onChangeText={setDenominationue}
            />
            <TextInput
              style={styles.input}
              placeholder="Matricule Responsable"
              placeholderTextColor="black"
              value={matricule}
              onChangeText={setMatricule}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom Responsable"
              placeholderTextColor="black"
              value={nom}
              onChangeText={setNom}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Responsable"
              placeholderTextColor="black"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact"
              placeholderTextColor="black"
              value={contact}
              onChangeText={setContact}
            />

            <CustomPicker
              items={annees.map(ane => ({
                label: ane.libelleanneescolaire,
                value: ane.id,
              }))}
              selectedId={annee}
              onValueChange={setAnnee}
            />
            <CustomPicker
              items={etablissements.map(etab => ({
                label: etab.nometablissement,
                value: etab.id,
              }))}
              selectedId={etablissement}
              onValueChange={setEtablissement}
            />
            <CustomPicker
              items={matieres.map(mat => ({
                label: mat.libellematiere,
                value: mat.id,
              }))}
              selectedId={matiere}
              onValueChange={setMatiere}
            />

            <Button title="Enregistrer" onPress={saveUe} />
            <Button title="Annuler" onPress={closeModal} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 10, flex: 1, backgroundColor: '#fff'},
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    color: 'black',
  },
  card: {padding: 15, margin: 10, backgroundColor: '#eee', borderRadius: 10},
  title: {fontSize: 18, fontWeight: 'bold'},
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {backgroundColor: 'white', padding: 20, borderRadius: 10},
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
    color: 'black',
  },
});

export default CreationDeCe;
