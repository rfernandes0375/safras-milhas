/**
 * App.js — Ponto de entrada do app Safras Milhas
 * 
 * Configura: navegação, contexto global e permissões iniciais
 */

import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Text, AppState, Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Desativar redimensionamento automático de fonte do sistema (Fix para Layout TDAH)
if (Text.defaultProps) {
  Text.defaultProps.allowFontScaling = false;
} else {
  Text.defaultProps = { allowFontScaling: false };
}

import { AppProvider } from './src/context/AppContext';
import DashboardScreen from './src/screens/DashboardScreen';
import TriagemScreen from './src/screens/TriagemScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import ConfiguracoesScreen from './src/screens/ConfiguracoesScreen';
import DetalhesViagemScreen from './src/screens/DetalhesViagemScreen';
import RelatorioScreen from './src/screens/RelatorioScreen';
import { cores, tipografia } from './src/utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Navegação por abas ───────────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: cores.primario,
        tabBarInactiveTintColor: cores.cinzaTexto,
        tabBarStyle: {
          backgroundColor: cores.fundoCard,
          borderTopWidth: 1,
          borderTopColor: cores.cinzaClaro,
          paddingTop: 6,
          paddingBottom: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: tipografia.micro,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icones = {
            Dashboard: focused ? 'home' : 'home-outline',
            Historico: focused ? 'list' : 'list-outline',
            Configuracoes: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icones[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Historico"
        component={HistoricoScreen}
        options={{ tabBarLabel: 'Histórico' }}
      />
      <Tab.Screen
        name="Configuracoes"
        component={ConfiguracoesScreen}
        options={{ tabBarLabel: 'Ajustes' }}
      />
    </Tab.Navigator>
  );
}

// ─── Navegação raiz (inclui telas modais) ────────────────────────────────────
function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Triagem"
        component={TriagemScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Relatorio"
        component={RelatorioScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="DetalhesViagem"
        component={DetalhesViagemScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Verifica permissões ao iniciar e toda vez que o app volta ao foreground
    verificarPermissoes();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        verificarPermissoes();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const verificarPermissoes = async () => {
    // No Expo Go, ignoramos o aviso de "Sempre" pois o iOS não permite essa opção para sub-apps
    if (Constants.appOwnership === 'expo') return;

    // 1. Permissão básica (Foreground)
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;

    // 2. Permissão crítica (Background / "Sempre")
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    
    if (bgStatus !== 'granted' && Platform.OS === 'ios') {
      Alert.alert(
        'Ajuste Necessário',
        'Para que o Safras Milhas rastreie suas viagens automaticamente com o celular bloqueado, você deve alterar a localização para "Sempre" nos ajustes do iPhone.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
