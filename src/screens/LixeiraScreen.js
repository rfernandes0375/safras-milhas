/**
 * LixeiraScreen.js — Recuperação de viagens descartadas
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Database from '../services/database';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarHora, formatarData } from '../utils/calculos';

export default function LixeiraScreen({ navigation }) {
  const { carregarViagens } = useApp();
  const [viagens, setViagens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarLixeira();
  }, []);

  const carregarLixeira = async () => {
    try {
      const dados = await Database.buscarViagensDescartadas();
      setViagens(dados);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const handleRestaurar = async (id) => {
    await Database.restaurarViagem(id);
    await carregarViagens(); // Recarrega a triagem no contexto global
    carregarLixeira(); // Recarrega esta tela
  };

  const handleExcluirDefinitivo = (id) => {
    Alert.alert(
      "Excluir para sempre?",
      "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            await Database.excluirViagem(id);
            carregarLixeira();
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={estilos.card}>
      <View style={estilos.cardHeader}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={estilos.dataBadge}>
            <Text style={estilos.dataTexto}>{formatarData(item.inicio)}</Text>
          </View>
          <View style={[estilos.statusBadge, { backgroundColor: item.classificacao === 'pessoal' ? 'rgba(158,158,158,0.2)' : 'rgba(239,68,68,0.2)' }]}>
            <Text style={[estilos.statusTexto, { color: item.classificacao === 'pessoal' ? '#9CA3AF' : cores.erro }]}>
              {item.classificacao === 'pessoal' ? 'Pessoal' : 'Descartada'}
            </Text>
          </View>
        </View>
        <Text style={estilos.distancia}>{formatarKm(item.distanciaKm)}</Text>
      </View>

      <View style={estilos.locais}>
        <View style={estilos.localRow}>
          <Ionicons name="radio-button-on" size={14} color={cores.primario} />
          <Text style={estilos.localTexto} numberOfLines={1}>{item.localInicio || 'Local não identificado'}</Text>
        </View>
        <View style={estilos.localRow}>
          <Ionicons name="location" size={14} color={cores.erro} />
          <Text style={estilos.localTexto} numberOfLines={1}>{item.localFim || 'Local não identificado'}</Text>
        </View>
      </View>

      <View style={estilos.acoes}>
        <TouchableOpacity 
          style={[estilos.botaoAcao, estilos.botaoRestaurar]}
          onPress={() => handleRestaurar(item.id)}
        >
          <Ionicons name="refresh" size={18} color={cores.primario} />
          <Text style={estilos.textoRestaurar}>Restaurar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={estilos.botaoApagar}
          onPress={() => handleExcluirDefinitivo(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={cores.erro} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoVoltar}>
          <Ionicons name="arrow-back" size={24} color={cores.texto} />
        </TouchableOpacity>
        <Text style={estilos.titulo}>Lixeira</Text>
        <View style={{ width: 40 }} />
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={cores.primario} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={viagens}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Ionicons name="trash-bin-outline" size={64} color={cores.cinzaMedio} />
              <Text style={estilos.vazioTexto}>Sua lixeira está vazia</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espacamento.md,
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: cores.texto,
  },
  lista: {
    padding: espacamento.md,
  },
  card: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacamento.sm,
  },
  dataBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: bordas.sm,
  },
  dataTexto: {
    color: cores.cinzaTexto,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusTexto: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  distancia: {
    color: cores.texto,
    fontWeight: 'bold',
    fontSize: 16,
  },
  locais: {
    gap: 8,
    marginBottom: espacamento.md,
  },
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localTexto: {
    color: cores.cinzaTexto,
    fontSize: 14,
    flex: 1,
  },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: espacamento.sm,
  },
  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: bordas.md,
  },
  botaoRestaurar: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  textoRestaurar: {
    color: cores.primario,
    fontWeight: 'bold',
  },
  botaoApagar: {
    padding: 8,
  },
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 16,
  },
  vazioTexto: {
    color: cores.cinzaTexto,
    fontSize: 16,
  }
});
