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
  TouchableOpacity, StatusBar, Animated, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora } from '../utils/calculos';

export default function DashboardScreen({ navigation }) {
  const {
    totalKmMes, totalReembolsoMes, totalPendentes,
    viagensConfirmadas, rastreamentoAtivo, viagemEmCurso, 
    pararViagem, mesAtual, carregando,
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
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
      >
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <View style={estilos.header}>
          <View style={estilos.logoContainer}>
            <Image 
              source={{ uri: 'https://s.criacaostatic.cc/safrasecifraswng5tdg0/uploads/elementor/thumbs/Logo-Safras-Cifras_Preto-scaled-rjjysb7a3posnup5alh9kcof83jcfvb2evxnsvanbo.png' }}
              style={estilos.logo}
              resizeMode="contain"
            />
          </View>
          <View style={estilos.rastreamentoIndicador}>
            <View style={[
              estilos.rastreioPonto,
              rastreamentoAtivo && estilos.rastreioPontoAtivo
            ]} />
            <Text style={estilos.rastreaioTexto}>
              {rastreamentoAtivo ? 'Rastreando' : 'Pausado'}
            </Text>
            {viagemEmCurso && (
              <TouchableOpacity 
                style={estilos.botaoPararManual}
                onPress={async () => {
                  const parou = await pararViagem();
                  if (parou) {
                    Alert.alert('Sucesso', 'Viagem encerrada e enviada para a Triagem!');
                  }
                }}
              >
                <Ionicons name="stop-circle" size={18} color={cores.branco} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={estilos.headerRow}>
          <Text style={estilos.headerTitulo}>Reembolso de Combustível</Text>
          <View style={estilos.statusBadge}>
            <View style={estilos.pontoStatus} />
            <Text style={estilos.statusTexto}>ATIVO</Text>
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

        {/* ─── Gráfico Semanal ────────────────────────────────────────── */}
        <View style={estilos.graficoContainer}>
          <Text style={estilos.graficoTitulo}>KM na semana atual</Text>
          <View style={estilos.graficoBarras}>
            {(() => {
              const hoje = new Date();
              const diaSemanaAtual = hoje.getDay(); // 0 = Domingo, 5 = Sexta
              const dias = [];
              const nomesDias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
              
              for (let i = 0; i < 7; i++) {
                const d = new Date(hoje);
                d.setDate(hoje.getDate() - (diaSemanaAtual - i));
                
                // Formato local: "DD/MM/YYYY"
                const dataLocalStr = d.toLocaleDateString('pt-BR');

                const kmDia = viagensConfirmadas
                  .filter(v => {
                    const dataVStr = new Date(v.inicio).toLocaleDateString('pt-BR');
                    return dataVStr === dataLocalStr;
                  })
                  .reduce((acc, v) => acc + (v.distanciaKm || 0), 0);

                dias.push({ 
                  label: nomesDias[i], 
                  km: kmDia, 
                  hoje: i === diaSemanaAtual 
                });
              }
              
              const maxKm = Math.max(...dias.map(d => d.km), 1);
              
              return dias.map((dia, idx) => (
                <View key={idx} style={estilos.colunaGrafico}>
                  <View style={estilos.barraContainer}>
                    <View style={[
                      estilos.barra,
                      { height: `${Math.min((dia.km / maxKm) * 100, 100)}%` },
                      dia.hoje && { backgroundColor: cores.primario },
                      !dia.hoje && dia.km > 0 && { backgroundColor: 'rgba(255,255,255,0.4)' }
                    ]} />
                  </View>
                  <Text style={[estilos.diaTexto, dia.hoje && { color: cores.primario, fontWeight: 'bold' }]}>
                    {dia.label}
                  </Text>
                </View>
              ));
            })()}
          </View>
        </View>

        <TouchableOpacity
          style={[estilos.botaoTriagem, totalPendentes > 0 ? estilos.botaoTriagemAtivo : estilos.botaoTriagemVazio]}
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
              { color: cores.texto }
            ]}>
              {totalPendentes > 0
                ? `${totalPendentes} trajeto${totalPendentes > 1 ? 's' : ''} para classificar`
                : 'Triagem de Viagens'}
            </Text>
            <Text style={estilos.botaoTriagemSub}>
              {totalPendentes > 0 ? 'Toque para classificar agora →' : 'Nenhuma viagem pendente ✓'}
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
              <ViagemItem key={viagem.id} viagem={viagem} navigation={navigation} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Componente: Item de Viagem ───────────────────────────────────────────────
function ViagemItem({ viagem, navigation }) {
  return (
    <TouchableOpacity 
      style={estilos.viagemItem}
      onPress={() => navigation.navigate('DetalhesViagem', { viagem })}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
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
    paddingHorizontal: espacamento.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: espacamento.sm,
    paddingBottom: espacamento.md,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    ...sombras.pequena,
  },
  logo: {
    width: 90,
    height: 25,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  pontoStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusTexto: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  headerTitulo: {
    fontSize: tipografia.h2,
    fontWeight: tipografia.bold,
    color: cores.branco,
    marginBottom: espacamento.lg,
  },
  rastreamentoIndicador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  botaoPararManual: {
    marginLeft: 10,
    backgroundColor: cores.erro,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rastreioPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.cinzaEscuro,
    marginRight: 8,
  },
  rastreioPontoAtivo: {
    backgroundColor: cores.sucesso,
    shadowColor: cores.sucesso,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  rastreaioTexto: {
    fontSize: 12,
    fontWeight: 'bold',
    color: cores.cinzaTexto,
    marginLeft: 4,
  },

  // Gráfico
  graficoContainer: {
    backgroundColor: cores.fundoCard,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  graficoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: cores.cinzaTexto,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  graficoBarras: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  colunaGrafico: {
    alignItems: 'center',
    flex: 1,
  },
  barraContainer: {
    flex: 1,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barra: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  diaTexto: {
    fontSize: 10,
    color: cores.cinzaTexto,
    marginTop: 8,
    fontWeight: '600',
  },

  // ─── Card Hero ──────────────────────────────────────────────────
  cardHero: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.lg,
    marginBottom: espacamento.lg,
    overflow: 'hidden',
    ...sombras.media,
  },
  cardHeroDecoracao: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: cores.branco,
    opacity: 0.05,
  },
  cardHeroLabel: {
    fontSize: tipografia.micro,
    fontWeight: tipografia.bold,
    color: cores.cinzaEscuro,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardHeroValor: {
    fontSize: 36,
    fontWeight: tipografia.bold,
    color: '#00D1FF', // Ciano vibrante para o valor
    marginVertical: 4,
  },
  cardHeroSub: {
    fontSize: tipografia.normal,
    color: cores.cinzaTexto,
    marginBottom: espacamento.md,
  },
  cardHeroDivisor: {
    height: 1,
    backgroundColor: cores.cinzaMedio,
    marginBottom: espacamento.md,
    opacity: 0.5,
  },
  cardHeroKm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeroKmTexto: {
    fontSize: tipografia.normal,
    color: cores.branco,
    fontWeight: '500',
  },

  // ─── Botão Triagem ──────────────────────────────────────────────
  botaoTriagem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.fundoCard,
    padding: espacamento.md,
    borderRadius: bordas.md,
    marginBottom: espacamento.lg,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  botaoTriagemVazio: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  botaoTriagemAtivo: {
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
    borderColor: cores.primario,
    borderWidth: 2,
  },
  botaoTriagemIcone: {
    width: 48,
    height: 48,
    borderRadius: bordas.md,
    backgroundColor: cores.primarioFundo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacamento.md,
    position: 'relative', // Essencial para o badge não flutuar
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: cores.erro,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: cores.fundoCard,
  },
  badgeTexto: {
    color: cores.branco,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
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
