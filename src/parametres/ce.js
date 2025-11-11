import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UseUeId = () => {
  const [ueId, setUeId] = useState(null);

  useEffect(() => {
    const fetchUeId = async () => {
      try {
        const value = await AsyncStorage.getItem('ues_id');
        setUeId(value ? JSON.parse(value) : null);
      } catch (error) {
        console.error('Erreur lors de la récupération de ues_id:', error);
        setUeId(null);
      }
    };

    fetchUeId();
  }, []);

  return ueId;
};

export default UseUeId;
