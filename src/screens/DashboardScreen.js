/**
 * DashboardScreen.js — Tela Principal (Tela 1)
 * 
 * Mostra:
 * - Card hero com km total + valor a reembolsar do mês
 * - Botão de triagem com badge de pendentes
 * - Lista das últimas viagens confirmadas
 * - Indicador de rastreamento ativo
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora } from '../utils/calculos';

export default function DashboardScreen({ navigation }) {
  const {
    totalKmMes, totalReembolsoMes, totalPendentes,
    viagensConfirmadas, rastreamentoAtivo, mesAtual,
    carregando,
  } = useApp();

  // Pega as últimas 5 viagens confirmadas para o resumo
  const ultimasViagens = viagensConfirmadas.slice(0, 5);

  const mesFormatado = (() => {
    if (!mesAtual) return '';
    const [ano, mes] = mesAtual.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(mes)-1]} ${ano}`;
  })();

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primario} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
      >
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <View style={estilos.header}>
          <View>
            <Text style={estilos.headerSub}>Safras & Cifras</Text>
            <Text style={estilos.headerTitulo}>Reembolso</Text>
          </View>
          <View style={estilos.rastreamentoIndicador}>
            <View style={[
              estilos.rastreioPonto,
              { backgroundColor: rastreamentoAtivo ? cores.sucesso : cores.cinzaTexto }
            ]} />
            <Text style={estilos.rastreaioTexto}>
              {rastreamentoAtivo ? 'Rastreando' : 'Inativo'}
            </Text>
          </View>
        </View>

        {/* ─── Card Hero: Total do Mês ──────────────────────────────────── */}
        <View style={estilos.cardHero}>
          <View style={estilos.cardHeroDecoracao} />

          <Text style={estilos.cardHeroLabel}>{mesFormatado}</Text>

          <Text style={estilos.cardHeroValor}>
            {formatarMoeda(totalReembolsoMes)}
          </Text>
          <Text style={estilos.cardHeroSub}>a reembolsar</Text>

          <View style={estilos.cardHeroDivisor} />

          <View style={estilos.cardHeroKm}>
            <Ionicons name="navigate" size={18} color={cores.branco} style={{ opacity: 0.8 }} />
            <Text style={estilos.cardHeroKmTexto}>
              {formatarKm(totalKmMes)} confirmados
            </Text>
          </View>
        </View>

        {/* ─── Botão de Triagem ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={[estilos.botaoTriagem, totalPendentes > 0 && estilos.botaoTriagemAtivo]}
          onPress={() => navigation.navigate('Triagem')}
          activeOpacity={0.8}
        >
          <View style={estilos.botaoTriagemIcone}>
            <Ionicons
              name="layers"
              size={24}
              color={totalPendentes > 0 ? cores.primario : cores.cinzaTexto}
            />
            {totalPendentes > 0 && (
              <View style={estilos.badge}>
                <Text style={estilos.badgeTexto}>{totalPendentes}</Text>
              </View>
            )}
          </View>

          <View style={estilos.botaoTriagemTextos}>
            <Text style={[
              estilos.botaoTriagemTitulo,
              { color: totalPendentes > 0 ? cores.texto : cores.cinzaEscuro }
            ]}>
              {totalPendentes > 0
                ? `${totalPendentes} trajeto${totalPendentes > 1 ? 's' : ''} para classificar`
                : 'Nenhum trajeto pendente'}
            </Text>
            <Text style={estilos.botaoTriagemSub}>
              {totalPendentes > 0 ? 'Toque para classificar agora →' : 'Tudo em dia ✓'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ─── Lista de Viagens Recentes ────────────────────────────────── */}
        <View style={estilos.secao}>
          <View style={estilos.secaoHeader}>
            <Text style={estilos.secaoTitulo}>Viagens confirmadas</Text>
            {ultimasViagens.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Historico')}>
                <Text style={estilos.secaoLink}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {ultimasViagens.length === 0 ? (
            <View style={estilos.vazio}>
              <Ionicons name="car-outline" size={40} color={cores.cinzaMedio} />
              <Text style={estilos.vazioTexto}>
                Nenhuma viagem confirmada ainda.{'\n'}
                Elas aparecerão aqui após a triagem.
              </Text>
            </View>
          ) : (
            ultimasViagens.map((viagem) => (
              <ViagemItem key={viagem.id} viagem={viagem} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Componente: Item de Viagem ───────────────────────────────────────────────
function ViagemItem({ viagem }) {
  return (
    <View style={estilos.viagemItem}>
      <View style={estilos.viagemIconeContainer}>
        <Ionicons name="car" size={16} color={cores.primario} />
      </View>

      <View style={estilos.viagemInfo}>
        <Text style={estilos.viagemLocais} numberOfLines={1}>
          {viagem.localInicio || '—'} → {viagem.localFim || '—'}
        </Text>
        <Text style={estilos.viagemDetalhes}>
          {formatarData(viagem.inicio)} · {formatarHora(viagem.inicio)}
        </Text>
      </View>

      <View style={estilos.viagemValores}>
        <Text style={estilos.viagemKm}>{formatarKm(viagem.distanciaKm)}</Text>
        <Text style={estilos.viagemReais}>{formatarMoeda(viagem.valor)}</Text>
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.cinzaFundo,
  },
  scroll: {
    paddingBottom: espacamento.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: espacamento.md,
    paddingTop: espacamento.sm,
    paddingBottom: espacamento.lg,
  },
  headerSub: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    fontWeight: tipografia.medio,
  },
  headerTitulo: {
    fontSize: tipografia.grande,
    color: cores.texto,
    fontWeight: tipografia.bold,
    marginTop: 2,
  },
  rastreamentoIndicador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: bordas.pill,
  },
  rastreioPonto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  rastreaioTexto: {
    fontSize: tipografia.micro,
    color: cores.branco,
    fontWeight: tipografia.semibold,
  },

  // Card Hero
  cardHero: {
    marginHorizontal: espacamento.md,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.xl,
    padding: espacamento.xl,
    overflow: 'hidden',
    marginBottom: -bordas.xl,
    paddingBottom: espacamento.xxl,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  cardHeroDecoracao: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardHeroLabel: {
    fontSize: tipografia.pequeno,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: tipografia.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: espacamento.sm,
  },
  cardHeroValor: {
    fontSize: tipografia.hero,
    color: cores.primario,
    fontWeight: tipografia.heavy,
    lineHeight: 50,
  },
  cardHeroSub: {
    fontSize: tipografia.normal,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: espacamento.md,
  },
  cardHeroDivisor: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: espacamento.md,
  },
  cardHeroKm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeroKmTexto: {
    fontSize: tipografia.medio,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: tipografia.semibold,
  },

  // Botão Triagem
  botaoTriagem: {
    marginHorizontal: espacamento.md,
    marginTop: espacamento.xxl,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacamento.lg,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  botaoTriagemAtivo: {
    borderWidth: 2,
    borderColor: cores.primarioClaro,
  },
  botaoTriagemIcone: {
    width: 52,
    height: 52,
    borderRadius: bordas.md,
    backgroundColor: cores.primarioFundo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacamento.md,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: cores.erro,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: {
    color: cores.branco,
    fontSize: 11,
    fontWeight: tipografia.bold,
  },
  botaoTriagemTextos: {
    flex: 1,
  },
  botaoTriagemTitulo: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    marginBottom: 3,
  },
  botaoTriagemSub: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
  },

  // Seção
  secao: {
    marginHorizontal: espacamento.md,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  secaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacamento.md,
  },
  secaoTitulo: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.texto,
  },
  secaoLink: {
    fontSize: tipografia.pequeno,
    color: cores.primario,
    fontWeight: tipografia.semibold,
  },

  // Estado vazio
  vazio: {
    alignItems: 'center',
    paddingVertical: espacamento.xl,
    gap: espacamento.sm,
  },
  vazioTexto: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Item de viagem
  viagemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.cinzaClaro,
  },
  viagemIconeContainer: {
    width: 32,
    height: 32,
    borderRadius: bordas.sm,
    backgroundColor: cores.primarioFundo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacamento.sm,
  },
  viagemInfo: {
    flex: 1,
    marginRight: espacamento.sm,
  },
  viagemLocais: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.semibold,
    color: cores.texto,
    marginBottom: 2,
  },
  viagemDetalhes: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
  },
  viagemValores: {
    alignItems: 'flex-end',
  },
  viagemKm: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
    fontWeight: tipografia.medio,
  },
  viagemReais: {
    fontSize: tipografia.pequeno,
    color: cores.primario,
    fontWeight: tipografia.bold,
  },
});
