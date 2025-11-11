import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useEtablissementId = () => {
  const [etablissementId, setEtablissementId] = useState(null);

  useEffect(() => {
    const fetchEtablissementId = async () => {
      try {
        const value = await AsyncStorage.getItem('etablissements_id');
        setEtablissementId(value ? JSON.parse(value) : null);
      } catch (error) {
        console.error(
          'Erreur lors de la récupération de etablissements_id:',
          error,
        );
        setEtablissementId(null);
      }
    };

    fetchEtablissementId();
  }, []);

  return etablissementId;
};

export default useEtablissementId;
