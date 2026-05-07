/**
 * TriagemScreen.js — Tela de Triagem com swipe (Tela 2)
 * 
 * Interface de cards estilo Tinder para classificar viagens.
 * Swipe direita = Trabalho (verde)
 * Swipe esquerda = Pessoal (cinza)
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, TouchableOpacity, StatusBar, TextInput, Image,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarHora, formatarData } from '../utils/calculos';

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get('window');
const LIMIAR_SWIPE = LARGURA_TELA * 0.25; 

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

  // PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        posicao.setValue({ x: gestureState.dx, y: gestureState.dy * 0.2 });
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        if (dx > LIMIAR_SWIPE || vx > 0.5) {
          confirmarSwipe('trabalho');
        } else if (dx < -LIMIAR_SWIPE || vx < -0.5) {
          confirmarSwipe('pessoal');
        } else {
          Animated.spring(posicao, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

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
      duration: 200,
      useNativeDriver: false,
    }).start(async () => {
      const viagem = viagensPendentes[indiceAtual];
      if (viagem) {
        await classificarViagem(viagem.id, classificacao, descricao);
      }
      setDescricao('');
      posicao.setValue({ x: 0, y: 0 });
      setIndiceAtual(prev => prev + 1);
      setSwipando(false);
    });
  }, [swipando, indiceAtual, viagensPendentes, classificarViagem, descricao]);

  const viagemAtual = viagensPendentes[indiceAtual];
  const proxima = viagensPendentes[indiceAtual + 1];
  const restantes = viagensPendentes.length - indiceAtual;

  if (!viagemAtual) {
    return (
      <SafeAreaView style={estilos.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />
        <View style={estilos.concluido}>
          <Image 
            source={require('../../assets/triagem_concluida.png')}
            style={estilos.concluidoImagem}
            resizeMode="contain"
          />
          <Text style={estilos.concluidoTitulo}>Tudo em ordem!</Text>
          <Text style={estilos.concluidoSub}>
            Sua triagem está em dia. Você já acumulou <Text style={{ color: cores.primario, fontWeight: 'bold' }}>{formatarMoeda(totalReembolsoMes)}</Text> para reembolso este mês.
          </Text>
          <TouchableOpacity
            style={estilos.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" style={{ marginRight: 8 }} />
            <Text style={estilos.botaoVoltarTexto}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={estilos.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoFechar}>
                <Ionicons name="close" size={24} color={cores.texto} />
              </TouchableOpacity>
              <Text style={estilos.contador}>{restantes} restante{restantes !== 1 ? 's' : ''}</Text>
              <View style={estilos.totalMes}>
                <Text style={estilos.totalMesTexto}>{formatarMoeda(totalReembolsoMes)}</Text>
              </View>
            </View>

            {/* Instruções */}
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

            {/* Pilha de Cards */}
            <View style={estilos.pilhaCards}>
              {proxima && (
                <View style={[estilos.card, estilos.cardAtras]}>
                  <Text style={estilos.cardAtrasTexto}>Próxima viagem...</Text>
                </View>
              )}

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
                <Animated.View style={[estilos.overlayTrabalho, { opacity: opacidadeTrabalho }]}>
                  <View style={estilos.overlayBadge}>
                    <Ionicons name="checkmark" size={28} color={cores.sucesso} />
                    <Text style={[estilos.overlayTexto, { color: cores.sucesso }]}>TRABALHO</Text>
                  </View>
                </Animated.View>

                <Animated.View style={[estilos.overlayPessoal, { opacity: opacidadePessoal }]}>
                  <View style={estilos.overlayBadge}>
                    <Ionicons name="close" size={28} color={cores.swipeEsquerda} />
                    <Text style={[estilos.overlayTexto, { color: cores.swipeEsquerda }]}>PESSOAL</Text>
                  </View>
                </Animated.View>

                <CardViagem 
                  viagem={viagemAtual} 
                  descricao={descricao}
                  setDescricao={setDescricao}
                />
              </Animated.View>
            </View>

            {/* Botões */}
            <View style={estilos.botoes}>
              <View style={estilos.botaoWrapper}>
                <TouchableOpacity
                  style={[estilos.botao, estilos.botaoPessoal]}
                  onPress={() => confirmarSwipe('pessoal')}
                >
                  <Ionicons name="close" size={28} color={cores.cinzaEscuro} />
                </TouchableOpacity>
                <Text style={estilos.botaoLabel}>Pessoal</Text>
              </View>

              <View style={estilos.botaoWrapper}>
                <TouchableOpacity
                  style={[estilos.botao, estilos.botaoTrabalho]}
                  onPress={() => confirmarSwipe('trabalho')}
                >
                  <Ionicons name="checkmark" size={28} color={cores.sucesso} />
                </TouchableOpacity>
                <Text style={estilos.botaoLabel}>Trabalho</Text>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CardViagem({ viagem, descricao, setDescricao }) {
  return (
    <View style={estilos.cardConteudo}>
      {viagem.provalTrabalho && (
        <View style={estilos.badgeAutoClassificado}>
          <Ionicons name="flash" size={12} color={cores.primario} />
          <Text style={estilos.badgeAutoTexto}>Provável trabalho</Text>
        </View>
      )}

      <View style={estilos.mapaContainer}>
        <View style={estilos.mapaPlaceholder}>
          <Ionicons name="map" size={40} color={cores.cinzaMedio} />
          <Text style={estilos.mapaTexto}>{formatarData(viagem.inicio)}</Text>
        </View>
      </View>

      <View style={estilos.cardDetalhes}>
        <View style={estilos.localRow}>
          <View style={[estilos.localIcone, { backgroundColor: cores.primarioFundo }]}>
            <Ionicons name="radio-button-on" size={12} color={cores.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.localLabel}>Saída</Text>
            <Text style={estilos.localNome} numberOfLines={1}>{viagem.localInicio || '—'}</Text>
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
            <Text style={estilos.localNome} numberOfLines={1}>{viagem.localFim || '—'}</Text>
          </View>
          <Text style={estilos.horario}>{formatarHora(viagem.fim)}</Text>
        </View>

        <View style={estilos.descricaoContainer}>
          <Text style={estilos.descricaoLabel}>Descrição do motivo</Text>
          <TextInput
            style={estilos.descricaoInput}
            placeholder="Ex: Visita ao cliente X..."
            placeholderTextColor={cores.cinzaTexto}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            maxLength={100}
          />
        </View>
      </View>

      <View style={estilos.cardFooter}>
        <View style={estilos.cardStat}>
          <Ionicons name="navigate-outline" size={16} color={cores.cinzaTexto} />
          <Text style={estilos.cardStatValor}>{formatarKm(viagem.distanciaKm)}</Text>
        </View>
        <View style={estilos.cardFooterDivisor} />
        <View style={estilos.cardStat}>
          <Ionicons name="cash-outline" size={16} color={cores.cinzaTexto} />
          <Text style={[estilos.cardStatValor, { color: cores.primario }]}>{formatarMoeda(viagem.valor)}</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: espacamento.md, paddingVertical: espacamento.sm },
  botaoFechar: { width: 40, height: 40, borderRadius: 20, backgroundColor: cores.fundoCard, justifyContent: 'center', alignItems: 'center', ...sombras.pequena },
  contador: { fontSize: tipografia.normal, fontWeight: tipografia.semibold, color: cores.cinzaEscuro },
  totalMes: { backgroundColor: cores.primarioFundo, paddingHorizontal: espacamento.sm, paddingVertical: 5, borderRadius: bordas.pill },
  totalMesTexto: { fontSize: tipografia.pequeno, fontWeight: tipografia.bold, color: cores.primario },
  instrucoes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: espacamento.xl, marginBottom: espacamento.sm },
  instrucaoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: bordas.pill, paddingHorizontal: 10, paddingVertical: 4 },
  instrucaoTexto: { fontSize: tipografia.micro, fontWeight: tipografia.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  instrucaoCentro: { fontSize: tipografia.micro, color: cores.cinzaTexto },
  pilhaCards: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -espacamento.sm },
  card: { width: LARGURA_TELA - espacamento.md * 2, backgroundColor: cores.fundoCard, borderRadius: bordas.xl, overflow: 'hidden', position: 'absolute', borderWidth: 1, borderColor: cores.cinzaMedio },
  cardAtras: { top: 16, transform: [{ scale: 0.95 }], justifyContent: 'center', alignItems: 'center', paddingVertical: espacamento.xl, backgroundColor: cores.cinzaClaro },
  cardAtrasTexto: { color: cores.cinzaTexto, fontSize: tipografia.pequeno },
  overlayTrabalho: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(52,168,83,0.1)', zIndex: 10, justifyContent: 'flex-start', alignItems: 'flex-end', padding: espacamento.lg, borderRadius: bordas.xl, borderWidth: 3, borderColor: cores.sucesso },
  overlayPessoal: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(158,158,158,0.1)', zIndex: 10, justifyContent: 'flex-start', alignItems: 'flex-start', padding: espacamento.lg, borderRadius: bordas.xl, borderWidth: 3, borderColor: cores.swipeEsquerda },
  overlayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.fundoCard, paddingHorizontal: 10, paddingVertical: 6, borderRadius: bordas.pill },
  overlayTexto: { fontSize: tipografia.pequeno, fontWeight: tipografia.bold, letterSpacing: 1 },
  cardConteudo: { padding: 0 },
  badgeAutoClassificado: { position: 'absolute', top: espacamento.sm, left: espacamento.sm, flexDirection: 'row', alignItems: 'center', backgroundColor: cores.primarioFundo, paddingHorizontal: 8, paddingVertical: 4, borderRadius: bordas.pill, gap: 4, zIndex: 5 },
  badgeAutoTexto: { fontSize: tipografia.micro, color: cores.primario, fontWeight: tipografia.semibold },
  mapaContainer: { height: 160, backgroundColor: cores.cinzaClaro, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mapaPlaceholder: { alignItems: 'center', gap: 8 },
  mapaTexto: { fontSize: tipografia.pequeno, color: cores.cinzaTexto },
  cardDetalhes: { padding: espacamento.md },
  localRow: { flexDirection: 'row', alignItems: 'center', gap: espacamento.sm },
  localIcone: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  localLabel: { fontSize: tipografia.micro, color: cores.cinzaTexto, textTransform: 'uppercase', letterSpacing: 0.5 },
  localNome: { fontSize: tipografia.normal, fontWeight: tipografia.semibold, color: cores.texto },
  horario: { fontSize: tipografia.pequeno, color: cores.cinzaTexto, fontWeight: tipografia.medio },
  localLinhaConect: { width: 2, height: 16, backgroundColor: cores.cinzaMedio, marginLeft: 13, marginVertical: 2 },
  descricaoContainer: { marginTop: espacamento.md, paddingTop: espacamento.md, borderTopWidth: 1, borderTopColor: cores.cinzaClaro },
  descricaoLabel: { fontSize: tipografia.micro, color: cores.cinzaTexto, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  descricaoInput: { backgroundColor: cores.cinzaFundo, borderRadius: bordas.md, padding: espacamento.sm, fontSize: tipografia.pequeno, color: cores.texto, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: cores.cinzaClaro },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: cores.cinzaClaro, paddingVertical: espacamento.md, paddingHorizontal: espacamento.lg },
  cardStat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardStatValor: { fontSize: tipografia.medio, fontWeight: tipografia.bold, color: cores.texto },
  cardFooterDivisor: { width: 1, backgroundColor: cores.cinzaClaro, marginVertical: -espacamento.md },
  botoes: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, paddingTop: espacamento.sm, paddingBottom: espacamento.lg },
  botaoWrapper: { alignItems: 'center', gap: 8 },
  botaoLabel: { fontSize: 10, fontWeight: '700', color: cores.cinzaTexto, textTransform: 'uppercase', letterSpacing: 0.5 },
  botao: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: cores.cinzaMedio },
  botaoPessoal: { backgroundColor: cores.fundoCard, borderWidth: 2, borderColor: cores.cinzaMedio },
  botaoTrabalho: { backgroundColor: cores.fundoCard, borderWidth: 2, borderColor: cores.sucesso },
  concluido: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacamento.xl },
  concluidoImagem: { width: LARGURA_TELA * 0.8, height: LARGURA_TELA * 0.8, marginBottom: espacamento.lg },
  concluidoTitulo: { fontSize: 28, fontWeight: tipografia.bold, color: cores.texto, marginBottom: espacamento.sm, textAlign: 'center' },
  concluidoSub: { fontSize: 16, color: cores.cinzaTexto, textAlign: 'center', lineHeight: 24, marginBottom: espacamento.xxl, paddingHorizontal: espacamento.md },
  botaoVoltar: { backgroundColor: cores.primario, paddingHorizontal: espacamento.xl, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', ...sombras.grande },
  botaoVoltarTexto: { color: '#0F172A', fontWeight: '700', fontSize: 16 },
});
