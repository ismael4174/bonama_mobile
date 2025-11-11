import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'react-native-bcrypt';
import {db} from './db/database';

export default class AuthenticationService {
  static async login(username, password) {
    try {
      const user = await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM admin_users WHERE username = ?',
            [username],
            (_, {rows}) => {
              if (rows.length > 0) {
                const user = rows.item(0); // Accéder correctement aux données

                if (!user.password) {
                  reject(new Error('Mot de passe non trouvé.'));
                  return;
                }

                // Vérification du mot de passe avec bcrypt
                const passwordMatch = bcrypt.compareSync(
                  password,
                  user.password,
                );

                if (passwordMatch) {
                  resolve(user);
                } else {
                  reject(
                    new Error('Nom d’utilisateur ou mot de passe incorrect.'),
                  );
                }
              } else {
                reject(
                  new Error('Nom d’utilisateur ou mot de passe incorrect.'),
                );
              }
            },
            (_, error) =>
              reject(
                new Error('Erreur lors de la vérification des identifiants.'),
              ),
          );
        });
      });

      // Stockage des données utilisateur
      await AsyncStorage.setItem('user', JSON.stringify(user));
      if (user.drenas_id) {
        await AsyncStorage.setItem('drenas_id', user.drenas_id.toString());
      } else {
        await AsyncStorage.setItem('drenas_id', '');
      }
      if (user.etablissements_id) {
        await AsyncStorage.setItem(
          'etablissements_id',
          user.etablissements_id.toString(),
        );
      } else {
        await AsyncStorage.setItem('etablissements_id', '');
      }
      if (user.ues_id) {
        await AsyncStorage.setItem('ues_id', user.ues_id.toString());
      } else {
        await AsyncStorage.setItem('ues_id', '');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  static async checkAuthentication() {
    const user = await AsyncStorage.getItem('user');
    return !!user;
  }

  static async getUser() {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  static async logout() {
    await AsyncStorage.multiRemove([
      'user',
      'drenas_id',
      'etablissements_id',
      'ues_id',
      //'drenaDataInitialized',
      //'etabDataInitialized',
    ]);
  }
}
