import React, {useEffect, useRef} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import {checkAndSync} from './sync';
import NetInfo from '@react-native-community/netinfo'; // Assurez-vous que NetInfo est importé

const SYNC_INTERVAL = 60000; // 1 minute en millisecondes

const NetworkSync = () => {
  const intervalId = useRef(null);
  const netInfo = useNetInfo(); // Garder l'hook pour l'état initial

  useEffect(() => {
    const startPeriodicSync = () => {
      intervalId.current = setInterval(() => {
        if (netInfo.isConnected) {
          // Utiliser l'état de l'hook ici
          console.log('⏰ Synchronisation périodique (toutes les minutes)...');
          checkAndSync(netInfo.isConnected);
        } else {
          console.log(
            '⏰ Pas de connexion pour la synchronisation périodique.',
          );
        }
      }, SYNC_INTERVAL);
    };

    // Démarrer la synchronisation périodique au montage si la connexion est présente
    if (netInfo.isConnected) {
      startPeriodicSync();
    }

    // Écouter les changements de connexion en utilisant NetInfo.addEventListener
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('📡 Connexion établie (listener).');
        // Démarrer la synchronisation périodique si elle n'est pas déjà en cours
        if (!intervalId.current) {
          startPeriodicSync();
        }
      } else {
        console.log('🚫 Pas de connexion (listener).');
        // Arrêter la synchronisation périodique si la connexion est perdue
        if (intervalId.current) {
          clearInterval(intervalId.current);
          intervalId.current = null;
        }
      }
    });

    // Nettoyer l'intervalle et l'écouteur lorsque le composant est démonté
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      unsubscribe();
    };
  }, [netInfo.isConnected]); // Dépendance sur netInfo.isConnected pour redémarrer l'effet si l'état change

  return null;
};

async function checkConnection() {
  const netInfoState = await NetInfo.fetch();
  return netInfoState.isConnected;
}

export {NetworkSync, checkConnection};
/*import React, {useEffect} from 'react';
import {Alert} from 'react-native';
import {useNetInfo} from '@react-native-community/netinfo';
import {checkAndSync} from './sync';
import NetInfo from '@react-native-community/netinfo'; // Import NetInfo

const NetworkSync = () => {
  // NetworkSync est le composant principal
  const netInfo = useNetInfo();

  useEffect(() => {
    if (netInfo.isConnected !== null) {
      console.log('📡 Connexion rétablie, synchronisation en cours...');
      checkAndSync(netInfo.isConnected); // Lancer la synchronisation si connecté
    } else {
      console.log('🚫 Pas de connexion');
    }
  }, [netInfo.isConnected]);

  return null; // Ce composant n'affiche rien, il fonctionne en arrière-plan
};

// Fonction séparée pour vérifier la connexion (en dehors du composant)
async function checkConnection() {
  const netInfoState = await NetInfo.fetch(); // Utilisez NetInfo.fetch() ici
  return netInfoState.isConnected;
}

export {NetworkSync, checkConnection}; // Export des deux éléments
*/
