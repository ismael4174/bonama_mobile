import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UseDrenaId = () => {
  const [drenaId, setDrenaId] = useState(null);

  useEffect(() => {
    const fetchDrenaId = async () => {
      try {
        const value = await AsyncStorage.getItem('drenas_id');
        setDrenaId(value ? JSON.parse(value) : null);
      } catch (error) {
        console.error('Erreur lors de la récupération de drenas_id:', error);
        setDrenaId(null);
      }
    };

    fetchDrenaId();
  }, []);

  return drenaId;
};

export default UseDrenaId;
