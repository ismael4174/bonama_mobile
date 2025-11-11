import {useState, useEffect} from 'react';
import {openDatabase} from 'react-native-sqlite-storage';

const dbName = 'bd_bonamas_local.db';

const UseAnneescolairesID = () => {
  const [anneescolairesID, setAnneescolairesID] = useState(null);

  useEffect(() => {
    const db = openDatabase({name: dbName, location: 'default'});

    db.transaction(tx => {
      tx.executeSql(
        'SELECT anneescolaires_id FROM parametrages WHERE id = ?',
        [1],
        (tx, results) => {
          if (results.rows.length > 0) {
            const value = results.rows.item(0).anneescolaires_id;
            console.log('✅ Année scolaire trouvée :', value);
            setAnneescolairesID(value);
          } else {
            console.log('⚠️ Aucun résultat trouvé pour id=1');
          }
        },
        error => {
          console.log(
            '❌ Erreur lors de la récupération depuis la base :',
            error,
          );
        },
      );
    });
  }, []);

  return anneescolairesID;
};

export default UseAnneescolairesID;
