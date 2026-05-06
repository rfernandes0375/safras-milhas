/**
 * HistoricoScreen.js — Tela de Histórico (Tela 3)
 * Lista mensal de viagens confirmadas como trabalho
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import * as Database from '../services/database';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora, formatarMes } from '../utils/calculos';

export default function HistoricoScreen({ navigation }) {
  const { mesAtual, setMesAtual, viagensConfirmadas, totalKmMes, totalReembolsoMes } = useApp();
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  useEffect(() => {
    carregarMeses();
  }, []);

  const carregarMeses = async () => {
    const meses = await Database.buscarMesesDisponiveis();
    // Garante que o mês atual aparece mesmo sem viagens
    const mesAtu = new Date().toISOString().slice(0, 7);
    if (!meses.includes(mesAtu)) meses.unshift(mesAtu);
    setMesesDisponiveis(meses);
  };

  const renderItem = ({ item: viagem, index }) => (
    <View style={[estilos.itemViagem, index === 0 && { marginTop: 0 }]}>
      <View style={estilos.itemData}>
        <Text style={estilos.itemDia}>
          {new Date(viagem.inicio).getDate().toString().padStart(2, '0')}
        </Text>
        <Text style={estilos.itemMes}>
          {new Date(viagem.inicio).toLocaleDateString('pt-BR', { month: 'short' })}
        </Text>
      </View>

      <View style={estilos.itemInfo}>
        <Text style={estilos.itemRota} numberOfLines={1}>
          {viagem.localInicio || '—'} → {viagem.localFim || '—'}
        </Text>
        <Text style={estilos.itemHorario}>
          {formatarHora(viagem.inicio)} às {formatarHora(viagem.fim)}
        </Text>
      </View>

      <View style={estilos.itemValores}>
        <Text style={estilos.itemKm}>{formatarKm(viagem.distanciaKm)}</Text>
        <Text style={estilos.itemReais}>{formatarMoeda(viagem.valor)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />

      {/* Header */}
      <View style={estilos.header}>
        <Text style={estilos.headerTitulo}>Histórico</Text>
        <TouchableOpacity
          style={estilos.botaoRelatorio}
          onPress={() => navigation.navigate('Relatorio')}
        >
          <Ionicons name="document-text-outline" size={18} color={cores.primario} />
          <Text style={estilos.botaoRelatorioTexto}>Exportar</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de mês */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.seletorMes}
      >
        {mesesDisponiveis.map((mes) => (
          <TouchableOpacity
            key={mes}
            style={[estilos.chipMes, mes === mesAtual && estilos.chipMesSelecionado]}
            onPress={() => setMesAtual(mes)}
          >
            <Text style={[estilos.chipMesTexto, mes === mesAtual && estilos.chipMesTextoSelecionado]}>
              {formatarMes(mes)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Card de totais do mês */}
      <View style={estilos.cardTotais}>
        <View style={estilos.totalItem}>
          <Text style={estilos.totalLabel}>Km percorridos</Text>
          <Text style={estilos.totalValor}>{formatarKm(totalKmMes)}</Text>
        </View>
        <View style={estilos.totalDivisor} />
        <View style={estilos.totalItem}>
          <Text style={estilos.totalLabel}>A reembolsar</Text>
          <Text style={[estilos.totalValor, { color: cores.primario }]}>
            {formatarMoeda(totalReembolsoMes)}
          </Text>
        </View>
        <View style={estilos.totalDivisor} />
        <View style={estilos.totalItem}>
          <Text style={estilos.totalLabel}>Viagens</Text>
          <Text style={estilos.totalValor}>{viagensConfirmadas.length}</Text>
        </View>
      </View>

      {/* Lista de viagens */}
      {viagensConfirmadas.length === 0 ? (
        <View style={estilos.vazio}>
          <Ionicons name="calendar-outline" size={48} color={cores.cinzaMedio} />
          <Text style={estilos.vazioTitulo}>Sem viagens em {formatarMes(mesAtual)}</Text>
          <Text style={estilos.vazioSub}>Viagens classificadas como trabalho aparecerão aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={viagensConfirmadas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
  },
  headerTitulo: {
    fontSize: tipografia.titulo,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },
  botaoRelatorio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cores.primarioFundo,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: bordas.pill,
  },
  botaoRelatorioTexto: {
    fontSize: tipografia.pequeno,
    color: cores.primario,
    fontWeight: tipografia.semibold,
  },

  seletorMes: {
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    gap: espacamento.sm,
  },
  chipMes: {
    paddingHorizontal: espacamento.md,
    paddingVertical: 7,
    borderRadius: bordas.pill,
    backgroundColor: cores.fundoCard,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  chipMesSelecionado: {
    backgroundColor: cores.primario,
    borderColor: cores.primario,
  },
  chipMesTexto: {
    fontSize: tipografia.pequeno,
    color: cores.textoSecundario,
    fontWeight: tipografia.medio,
  },
  chipMesTextoSelecionado: {
    color: '#0F172A', // Texto escuro no botão cyan
    fontWeight: tipografia.semibold,
  },

  cardTotais: {
    flexDirection: 'row',
    marginHorizontal: espacamento.md,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    marginBottom: 4,
    textAlign: 'center',
  },
  totalValor: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },
  totalDivisor: {
    width: 1,
    backgroundColor: cores.cinzaClaro,
    marginVertical: 4,
  },

  lista: { paddingHorizontal: espacamento.md, paddingBottom: espacamento.xxl },

  itemViagem: {
    flexDirection: 'row',
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.md,
    padding: espacamento.md,
    marginBottom: espacamento.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  itemData: {
    alignItems: 'center',
    width: 36,
    marginRight: espacamento.sm,
  },
  itemDia: {
    fontSize: tipografia.grande,
    fontWeight: tipografia.bold,
    color: cores.primario,
    lineHeight: 24,
  },
  itemMes: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    textTransform: 'uppercase',
  },
  itemInfo: { flex: 1, marginRight: espacamento.sm },
  itemRota: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.semibold,
    color: cores.texto,
    marginBottom: 3,
  },
  itemHorario: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
  },
  itemValores: { alignItems: 'flex-end' },
  itemKm: {
    fontSize: tipografia.micro,
    color: cores.cinzaEscuro,
    marginBottom: 2,
  },
  itemReais: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.bold,
    color: cores.primario,
  },

  vazio: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacamento.xl,
    gap: espacamento.sm,
  },
  vazioTitulo: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.semibold,
    color: cores.texto,
  },
  vazioSub: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    textAlign: 'center',
  },
});
