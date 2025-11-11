/*import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from 'react-native';

const CustomPicker = ({
  items,
  selectedId,
  onValueChange,
  displayKey = 'label',
  valueKey = 'value',
  isDisabled = false,
  label, // <--- C'est la ligne importante à ajouter ici
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items?.find(item => item[valueKey] === selectedId);
  const selectedLabel = selectedItem?.[displayKey] ?? 'Sélectionner une option';

  const handleItemPress = item => {
    if (!isDisabled) {
      onValueChange(item[valueKey]);
      setModalVisible(false);
    }
  };

  // Filtrer les items pour éviter les erreurs
  const filteredItems = items?.filter(
    item => item[valueKey] != null && item[displayKey] != null,
  );

  return (
    <View style={styles.container}>
      
      {label && <Text style={styles.labelText}>{label}:</Text>}
      <TouchableOpacity
        style={[styles.pickerButton, isDisabled && styles.disabledPickerButton]}
        onPress={isDisabled ? null : () => setModalVisible(true)}
        activeOpacity={isDisabled ? 1 : 0.7}>
        <Text style={isDisabled && styles.disabledText}>{selectedLabel}</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={filteredItems}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress(item)}>
                  <Text>{item[displayKey]}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item[valueKey].toString()}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Nouveau style pour le conteneur du picker, pour espacement
    marginBottom: 15,
  },
  labelText: {
    // Style pour le label
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  pickerButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    // marginBottom: 10, // Déplacé vers le container pour un meilleur contrôle
  },
  disabledPickerButton: {
    backgroundColor: '#e9e9e9',
    borderColor: '#d9d9d9',
  },
  disabledText: {
    color: '#a0a0a0',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%',
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
});

export default CustomPicker;*/

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from 'react-native';

const CustomPicker = ({
  items,
  selectedId,
  onValueChange,
  displayKey = 'label',
  valueKey = 'value',

  isDisabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items?.find(item => item[valueKey] === selectedId);
  const selectedLabel = selectedItem?.[displayKey] ?? 'Sélectionner une option';

  const handleItemPress = item => {
    if (!isDisabled) {
      onValueChange(item[valueKey]);
      setModalVisible(false);
    }
  };

  // Filtrer les items pour éviter les erreurs
  const filteredItems = items?.filter(
    item => item[valueKey] != null && item[displayKey] != null,
  );

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          isDisabled && styles.disabledPickerButton, // 3. Appliquez un style pour indiquer qu'il est désactivé
        ]}
        onPress={isDisabled ? null : () => setModalVisible(true)}
        // Optionnel: ajoutez une prop `activeOpacity` pour un meilleur feedback visuel
        activeOpacity={isDisabled ? 1 : 0.7}>
        <Text style={isDisabled && styles.disabledText}>{selectedLabel}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={filteredItems}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress(item)}>
                  <Text>{item[displayKey]}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item[valueKey].toString()}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10, // Ajouté pour un meilleur espacement
  },
  // Nouveau style pour le bouton désactivé
  disabledPickerButton: {
    backgroundColor: '#e9e9e9', // Fond plus clair pour indiquer la désactivation
    borderColor: '#d9d9d9',
  },
  // Nouveau style pour le texte désactivé
  disabledText: {
    color: '#a0a0a0',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%', // Limite la hauteur de la modale
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
});

export default CustomPicker;
