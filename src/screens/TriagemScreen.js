/**
 * TriagemScreen.js — Tela de Triagem com swipe (Tela 2)
 * 
 * Interface de cards estilo Tinder para classificar viagens.
 * Swipe direita = Trabalho (verde)
 * Swipe esquerda = Pessoal (cinza)
 * 
 * DESIGN TDAH: zero digitação, resposta imediata, recompensa visual
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, TouchableOpacity, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarHora, formatarData } from '../utils/calculos';

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get('window');
const LIMIAR_SWIPE = LARGURA_TELA * 0.35; // 35% da tela para confirmar swipe

export default function TriagemScreen({ navigation }) {
  const { viagensPendentes, classificarViagem, totalReembolsoMes, config } = useApp();
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [swipando, setSwipando] = useState(false);
  const [descricao, setDescricao] = useState('');

  // Animações
  const posicao = useRef(new Animated.ValueXY()).current;
  const rotacao = posicao.x.interpolate({
    inputRange: [-LARGURA_TELA / 2, 0, LARGURA_TELA / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  const opacidadeTrabalho = posicao.x.interpolate({
    inputRange: [0, LIMIAR_SWIPE / 2, LIMIAR_SWIPE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });
  const opacidadePessoal = posicao.x.interpolate({
    inputRange: [-LIMIAR_SWIPE, -LIMIAR_SWIPE / 2, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // PanResponder — controla o gesto de swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        posicao.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > LIMIAR_SWIPE) {
          confirmarSwipe('trabalho');
        } else if (gestureState.dx < -LIMIAR_SWIPE) {
          confirmarSwipe('pessoal');
        } else {
          // Retorna ao centro
          Animated.spring(posicao, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Executa o swipe com animação
  const confirmarSwipe = useCallback((classificacao) => {
    if (swipando) return;
    setSwipando(true);

    const direcao = classificacao === 'trabalho' ? LARGURA_TELA * 1.5 : -LARGURA_TELA * 1.5;

    Haptics.impactAsync(
      classificacao === 'trabalho'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    Animated.timing(posicao, {
      toValue: { x: direcao, y: 50 },
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      const viagem = viagensPendentes[indiceAtual];
      if (viagem) {
        await classificarViagem(viagem.id, classificacao, descricao);
      }
      
      setDescricao('');

      // Avança para próximo card
      posicao.setValue({ x: 0, y: 0 });
      setIndiceAtual(prev => prev + 1);
      setSwipando(false);
    });
  }, [swipando, indiceAtual, viagensPendentes, classificarViagem]);

  const viagemAtual = viagensPendentes[indiceAtual];
  const proxima = viagensPendentes[indiceAtual + 1];
  const restantes = viagensPendentes.length - indiceAtual;

  // ─── Concluído ─────────────────────────────────────────────────────────────
  if (!viagemAtual) {
    return (
      <SafeAreaView style={estilos.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />
        <View style={estilos.concluido}>
          <View style={estilos.concluidoIcone}>
            <Ionicons name="checkmark-circle" size={72} color={cores.sucesso} />
          </View>
          <Text style={estilos.concluidoTitulo}>Tudo classificado!</Text>
          <Text style={estilos.concluidoSub}>
            Você acumulou {formatarMoeda(totalReembolsoMes)} para reembolso este mês.
          </Text>
          <TouchableOpacity
            style={estilos.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <Text style={estilos.botaoVoltarTexto}>Voltar ao início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoFechar}>
          <Ionicons name="close" size={24} color={cores.texto} />
        </TouchableOpacity>
        <Text style={estilos.contador}>{restantes} restante{restantes !== 1 ? 's' : ''}</Text>
        <View style={estilos.totalMes}>
          <Text style={estilos.totalMesTexto}>{formatarMoeda(totalReembolsoMes)}</Text>
        </View>
      </View>

      {/* ─── Instruções ──────────────────────────────────────────────── */}
      <View style={estilos.instrucoes}>
        <View style={[estilos.instrucaoItem, { borderColor: cores.swipeEsquerda }]}>
          <Ionicons name="close" size={14} color={cores.swipeEsquerda} />
          <Text style={[estilos.instrucaoTexto, { color: cores.swipeEsquerda }]}>Pessoal</Text>
        </View>
        <Text style={estilos.instrucaoCentro}>deslize para classificar</Text>
        <View style={[estilos.instrucaoItem, { borderColor: cores.swipeDireita }]}>
          <Text style={[estilos.instrucaoTexto, { color: cores.swipeDireita }]}>Trabalho</Text>
          <Ionicons name="checkmark" size={14} color={cores.swipeDireita} />
        </View>
      </View>

      {/* ─── Pilha de Cards ──────────────────────────────────────────── */}
      <View style={estilos.pilhaCards}>

        {/* Card de fundo (próxima viagem) */}
        {proxima && (
          <View style={[estilos.card, estilos.cardAtras]}>
            <Text style={estilos.cardAtrasTexto}>
              {proxima.localInicio || '—'} → {proxima.localFim || '—'}
            </Text>
          </View>
        )}

        {/* Card principal (com gestos) */}
        <Animated.View
          style={[
            estilos.card,
            {
              transform: [
                { translateX: posicao.x },
                { translateY: posicao.y },
                { rotate: rotacao },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Overlay TRABALHO (swipe direita) */}
          <Animated.View style={[estilos.overlayTrabalho, { opacity: opacidadeTrabalho }]}>
            <View style={estilos.overlayBadge}>
              <Ionicons name="checkmark" size={28} color={cores.sucesso} />
              <Text style={[estilos.overlayTexto, { color: cores.sucesso }]}>TRABALHO</Text>
            </View>
          </Animated.View>

          {/* Overlay PESSOAL (swipe esquerda) */}
          <Animated.View style={[estilos.overlayPessoal, { opacity: opacidadePessoal }]}>
            <View style={estilos.overlayBadge}>
              <Ionicons name="close" size={28} color={cores.swipeEsquerda} />
              <Text style={[estilos.overlayTexto, { color: cores.swipeEsquerda }]}>PESSOAL</Text>
            </View>
          </Animated.View>

          {/* Conteúdo do card */}
          <CardViagem 
            viagem={viagemAtual} 
            descricao={descricao}
            setDescricao={setDescricao}
          />
        </Animated.View>
      </View>

      {/* ─── Botões Manuais ──────────────────────────────────────────── */}
      <View style={estilos.botoes}>
        <TouchableOpacity
          style={[estilos.botao, estilos.botaoPessoal]}
          onPress={() => confirmarSwipe('pessoal')}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={28} color={cores.cinzaEscuro} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.botao, estilos.botaoTrabalho]}
          onPress={() => confirmarSwipe('trabalho')}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={28} color={cores.sucesso} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Card de Viagem ───────────────────────────────────────────────────────────
function CardViagem({ viagem, descricao, setDescricao }) {
  return (
    <View style={estilos.cardConteudo}>
      {/* Badge pré-classificação automática */}
      {viagem.provalTrabalho && (
        <View style={estilos.badgeAutoClassificado}>
          <Ionicons name="flash" size={12} color={cores.primario} />
          <Text style={estilos.badgeAutoTexto}>Provável trabalho</Text>
        </View>
      )}

      {/* Mapa placeholder (área reservada para mapa estático) */}
      <View style={estilos.mapaContainer}>
        <View style={estilos.mapaPlaceholder}>
          <Ionicons name="map" size={40} color={cores.cinzaMedio} />
          <Text style={estilos.mapaTexto}>
            {formatarData(viagem.inicio)}
          </Text>
        </View>

        {/* Linha de rota */}
        <View style={estilos.rotaContainer}>
          <View style={estilos.rotaPonto} />
          <View style={estilos.rotaLinha} />
          <View style={[estilos.rotaPonto, { backgroundColor: cores.erro }]} />
        </View>
      </View>

      {/* Detalhes */}
      <View style={estilos.cardDetalhes}>
        <View style={estilos.localRow}>
          <View style={[estilos.localIcone, { backgroundColor: cores.primarioFundo }]}>
            <Ionicons name="radio-button-on" size={12} color={cores.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.localLabel}>Saída</Text>
            <Text style={estilos.localNome} numberOfLines={1}>
              {viagem.localInicio || 'Local desconhecido'}
            </Text>
          </View>
          <Text style={estilos.horario}>{formatarHora(viagem.inicio)}</Text>
        </View>

        <View style={estilos.localLinhaConect} />

        <View style={estilos.localRow}>
          <View style={[estilos.localIcone, { backgroundColor: '#FCE8E6' }]}>
            <Ionicons name="location" size={12} color={cores.erro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.localLabel}>Chegada</Text>
            <Text style={estilos.localNome} numberOfLines={1}>
              {viagem.localFim || 'Local desconhecido'}
            </Text>
          </View>
          <Text style={estilos.horario}>{formatarHora(viagem.fim)}</Text>
        </View>

        {/* Campo de Descrição */}
        <View style={estilos.descricaoContainer}>
          <Text style={estilos.descricaoLabel}>Descrição da viagem (opcional)</Text>
          <TextInput
            style={estilos.descricaoInput}
            placeholder="Ex: Visita ao cliente X, Banco, etc..."
            placeholderTextColor={cores.cinzaTexto}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            maxLength={100}
          />
        </View>
      </View>

      {/* Footer com km e valor */}
      <View style={estilos.cardFooter}>
        <View style={estilos.cardStat}>
          <Ionicons name="navigate-outline" size={16} color={cores.cinzaTexto} />
          <Text style={estilos.cardStatValor}>{formatarKm(viagem.distanciaKm)}</Text>
        </View>
        <View style={estilos.cardFooterDivisor} />
        <View style={estilos.cardStat}>
          <Ionicons name="cash-outline" size={16} color={cores.cinzaTexto} />
          <Text style={[estilos.cardStatValor, { color: cores.primario }]}>
            {formatarMoeda(viagem.valor)}
          </Text>
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
  },
  botaoFechar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.fundoCard,
    justifyContent: 'center',
    alignItems: 'center',
    ...sombras.pequena,
  },
  contador: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.cinzaEscuro,
  },
  totalMes: {
    backgroundColor: cores.primarioFundo,
    paddingHorizontal: espacamento.sm,
    paddingVertical: 5,
    borderRadius: bordas.pill,
  },
  totalMesTexto: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.bold,
    color: cores.primario,
  },

  // Instruções
  instrucoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacamento.xl,
    marginBottom: espacamento.sm,
  },
  instrucaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: bordas.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  instrucaoTexto: {
    fontSize: tipografia.micro,
    fontWeight: tipografia.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instrucaoCentro: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
  },

  // Pilha de cards
  pilhaCards: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -espacamento.sm,
  },

  card: {
    width: LARGURA_TELA - espacamento.md * 2,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.xl,
    overflow: 'hidden',
    position: 'absolute',
    borderWidth: 1,
    borderColor: cores.cinzaMedio,
  },
  cardAtras: {
    top: 16,
    transform: [{ scale: 0.95 }],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: espacamento.xl,
    backgroundColor: cores.cinzaClaro,
  },
  cardAtrasTexto: {
    color: cores.cinzaTexto,
    fontSize: tipografia.pequeno,
  },

  // Overlays de swipe
  overlayTrabalho: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52,168,83,0.1)',
    zIndex: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: espacamento.lg,
    borderRadius: bordas.xl,
    borderWidth: 3,
    borderColor: cores.sucesso,
  },
  overlayPessoal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(158,158,158,0.1)',
    zIndex: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: espacamento.lg,
    borderRadius: bordas.xl,
    borderWidth: 3,
    borderColor: cores.swipeEsquerda,
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cores.fundoCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: bordas.pill,
  },
  overlayTexto: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.bold,
    letterSpacing: 1,
  },

  // Conteúdo do card
  cardConteudo: {
    padding: 0,
  },
  badgeAutoClassificado: {
    position: 'absolute',
    top: espacamento.sm,
    left: espacamento.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.primarioFundo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: bordas.pill,
    gap: 4,
    zIndex: 5,
  },
  badgeAutoTexto: {
    fontSize: tipografia.micro,
    color: cores.primario,
    fontWeight: tipografia.semibold,
  },

  // Mapa
  mapaContainer: {
    height: 160,
    backgroundColor: cores.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapaPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  mapaTexto: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
  },
  rotaContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacamento.xl,
  },
  rotaPonto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: cores.primario,
  },
  rotaLinha: {
    flex: 1,
    height: 2,
    backgroundColor: cores.primario,
    opacity: 0.3,
    marginHorizontal: 4,
  },

  // Detalhes do card
  cardDetalhes: {
    padding: espacamento.md,
  },
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  localIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localLabel: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  localNome: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.texto,
  },
  horario: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    fontWeight: tipografia.medio,
  },
  localLinhaConect: {
    width: 2,
    height: 16,
    backgroundColor: cores.cinzaMedio,
    marginLeft: 13,
    marginVertical: 2,
  },

  // Descrição
  descricaoContainer: {
    marginTop: espacamento.md,
    paddingTop: espacamento.md,
    borderTopWidth: 1,
    borderTopColor: cores.cinzaClaro,
  },
  descricaoLabel: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descricaoInput: {
    backgroundColor: cores.cinzaFundo,
    borderRadius: bordas.md,
    padding: espacamento.sm,
    fontSize: tipografia.pequeno,
    color: cores.texto,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },

  // Footer do card
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: cores.cinzaClaro,
    paddingVertical: espacamento.md,
    paddingHorizontal: espacamento.lg,
  },
  cardStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardStatValor: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },
  cardFooterDivisor: {
    width: 1,
    backgroundColor: cores.cinzaClaro,
    marginVertical: -espacamento.md,
  },

  // Botões
  botoes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacamento.xl,
    paddingVertical: espacamento.lg,
    paddingBottom: espacamento.xl,
  },
  botao: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.cinzaMedio,
  },
  botaoPessoal: {
    backgroundColor: cores.fundoCard,
    borderWidth: 2,
    borderColor: cores.cinzaMedio,
  },
  botaoTrabalho: {
    backgroundColor: cores.fundoCard,
    borderWidth: 2,
    borderColor: cores.sucesso,
  },

  // Concluído
  concluido: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacamento.xl,
  },
  concluidoIcone: {
    marginBottom: espacamento.lg,
  },
  concluidoTitulo: {
    fontSize: tipografia.titulo,
    fontWeight: tipografia.bold,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },
  concluidoSub: {
    fontSize: tipografia.normal,
    color: cores.cinzaEscuro,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: espacamento.xl,
  },
  botaoVoltar: {
    backgroundColor: cores.primario,
    paddingHorizontal: espacamento.xl,
    paddingVertical: espacamento.md,
    borderRadius: bordas.pill,
  },
  botaoVoltarTexto: {
    color: '#0F172A', // Texto escuro para contrastar no fundo cyan
    fontWeight: tipografia.semibold,
    fontSize: tipografia.normal,
  },
});
