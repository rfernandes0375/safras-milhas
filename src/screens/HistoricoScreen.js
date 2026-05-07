/**
 * HistoricoScreen.js — Tela de Histórico (Tela 3)
 * Lista mensal de viagens confirmadas como trabalho
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView, StatusBar, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useApp } from '../context/AppContext';
import * as Database from '../services/database';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora, formatarMes } from '../utils/calculos';

export default function HistoricoScreen({ navigation }) {
  const { 
    mesAtual, setMesAtual, viagensConfirmadas, totalKmMes, totalReembolsoMes,
    editarViagem, excluirViagem 
  } = useApp();
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  
  // Estados para edição
  const [modalVisivel, setModalVisivel] = useState(false);
  const [viagemEdicao, setViagemEdicao] = useState(null);
  const [novaDescricao, setNovaDescricao] = useState('');

  // Estados para seleção múltipla
  const [selecaoAtiva, setSelecaoAtiva] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
 
  useEffect(() => {
    carregarMeses();
    setSelecaoAtiva(false);
    setSelecionados(new Set());
  }, [mesAtual]);

  const toggleSelecao = (id) => {
    const novos = new Set(selecionados);
    if (novos.has(id)) novos.delete(id);
    else novos.add(id);
    setSelecionados(novos);
  };

  const handleExportar = () => {
    const viagensParaExportar = selecaoAtiva && selecionados.size > 0
      ? viagensConfirmadas.filter(v => selecionados.has(v.id))
      : viagensConfirmadas;

    navigation.navigate('Relatorio', { viagensCustom: viagensParaExportar });

    // Reset automático do modo de seleção após exportar
    if (selecaoAtiva) {
      setSelecaoAtiva(false);
      setSelecionados(new Set());
    }
  };

  const carregarMeses = async () => {
    const meses = await Database.buscarMesesDisponiveis();
    const mesAtu = new Date().toISOString().slice(0, 7);
    if (!meses.includes(mesAtu)) meses.unshift(mesAtu);
    setMesesDisponiveis(meses);
  };

  const abrirEdicao = (viagem) => {
    setViagemEdicao(viagem);
    setNovaDescricao(viagem.descricao || '');
    setModalVisivel(true);
  };

  const salvarEdicao = async () => {
    if (!viagemEdicao) return;
    await Database.atualizarViagem(viagemEdicao.id, {
      descricao: novaDescricao,
      valor: viagemEdicao.valor,
      classificacao: 'trabalho',
    });
    editarViagem(viagemEdicao.id, { descricao: novaDescricao });
    setModalVisivel(false);
  };

  const handleExcluir = (viagem) => {
    const v = viagem || viagemEdicao;
    if (!v) return;

    Alert.alert(
      'Excluir Viagem',
      'Tem certeza que deseja remover esta viagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            await Database.excluirViagem(v.id);
            excluirViagem(v.id);
            setModalVisivel(false);
          }
        },
      ]
    );
  };

  const renderLeftActions = (viagem) => (
    <TouchableOpacity 
      style={estilos.swipeBotaoEditar} 
      onPress={() => abrirEdicao(viagem)}
    >
      <Ionicons name="create" size={24} color={cores.branco} />
      <Text style={estilos.swipeBotaoTexto}>Editar</Text>
    </TouchableOpacity>
  );

  const renderRightActions = (viagem) => (
    <TouchableOpacity 
      style={estilos.swipeBotaoExcluir} 
      onPress={() => handleExcluir(viagem)}
    >
      <Ionicons name="trash" size={24} color={cores.branco} />
      <Text style={estilos.swipeBotaoTexto}>Excluir</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item: viagem, index }) => {
    const selecionado = selecionados.has(viagem.id);
    
    return (
      <Swipeable
        renderLeftActions={() => renderLeftActions(viagem)}
        renderRightActions={() => renderRightActions(viagem)}
        overshootLeft={false}
        overshootRight={false}
        enabled={!selecaoAtiva} // Desativa swipe durante seleção para evitar conflito
      >
        <TouchableOpacity 
          activeOpacity={selecaoAtiva ? 0.7 : 1}
          onPress={() => selecaoAtiva ? toggleSelecao(viagem.id) : null}
          style={[
            estilos.itemViagem, 
            index === 0 && { marginTop: 0 },
            selecionado && estilos.itemViagemSelecionado
          ]}
        >
          {selecaoAtiva && (
            <View style={estilos.checkboxContainer}>
              <Ionicons 
                name={selecionado ? "checkbox" : "square-outline"} 
                size={22} 
                color={selecionado ? cores.primario : cores.cinzaTexto} 
              />
            </View>
          )}

          <View style={estilos.itemData}>
            <Text style={estilos.itemSemana}>
              {new Date(viagem.inicio).toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={estilos.itemDia}>
              {new Date(viagem.inicio).getDate().toString().padStart(2, '0')}
            </Text>
            <Text style={estilos.itemMes}>
              {new Date(viagem.inicio).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
            </Text>
          </View>

          <View style={estilos.itemInfo}>
            <Text style={estilos.itemRota} numberOfLines={1}>
              {viagem.localInicio || '—'} → {viagem.localFim || '—'}
            </Text>
            <Text style={estilos.itemHorario}>
              {formatarHora(viagem.inicio)} às {formatarHora(viagem.fim)}
            </Text>
            {viagem.descricao && (
              <Text style={estilos.itemDescricao} numberOfLines={2}>
                {viagem.descricao}
              </Text>
            )}
          </View>

          <View style={estilos.itemValores}>
            <Text style={estilos.itemKm}>{formatarKm(viagem.distanciaKm)}</Text>
            <Text style={estilos.itemReais}>{formatarMoeda(viagem.valor)}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />

      {/* Header */}
      <View style={estilos.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={estilos.headerTitulo}>Histórico</Text>
          <TouchableOpacity 
            style={estilos.botaoModoSelecao} 
            onPress={() => {
              setSelecaoAtiva(!selecaoAtiva);
              setSelecionados(new Set());
            }}
          >
            <Text style={[estilos.botaoModoSelecaoTexto, selecaoAtiva && { color: cores.primario }]}>
              {selecaoAtiva ? 'Cancelar' : 'Selecionar'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[estilos.botaoRelatorio, selecaoAtiva && selecionados.size === 0 && { opacity: 0.5 }]}
          onPress={handleExportar}
          disabled={selecaoAtiva && selecionados.size === 0}
        >
          <Ionicons name="document-text-outline" size={18} color={cores.primario} />
          <Text style={estilos.botaoRelatorioTexto}>
            {selecaoAtiva && selecionados.size > 0 ? `Exportar (${selecionados.size})` : 'Exportar'}
          </Text>
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

      {/* Modal de Edição */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContainer}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Editar Viagem</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close" size={24} color={cores.texto} />
              </TouchableOpacity>
            </View>

            <View style={estilos.modalCorpo}>
              <Text style={estilos.labelInput}>Descrição do motivo</Text>
              <TextInput
                style={estilos.input}
                placeholder="Ex: Visita ao cliente X..."
                placeholderTextColor={cores.cinzaMedio}
                value={novaDescricao}
                onChangeText={setNovaDescricao}
                multiline
              />
              
              <View style={estilos.infoViagemCurta}>
                <Text style={estilos.infoTextoCurto}>
                  {viagemEdicao ? `${formatarData(viagemEdicao.inicio)} • ${formatarKm(viagemEdicao.distanciaKm)}` : ''}
                </Text>
              </View>
            </View>

            <View style={estilos.modalFooter}>
              <TouchableOpacity 
                style={estilos.botaoExcluir}
                onPress={handleExcluir}
              >
                <Ionicons name="trash-outline" size={20} color={cores.erro} />
                <Text style={estilos.botaoExcluirTexto}>Excluir</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={estilos.botaoSalvarEdicao}
                onPress={salvarEdicao}
              >
                <Text style={estilos.botaoSalvarTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: tipografia.semi,
  },

  seletorMes: {
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    height: 60,
  },
  chipMes: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.fundoCard,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipMesSelecionado: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderColor: '#00D1FF',
  },
  chipMesTexto: {
    fontSize: 13,
    color: cores.cinzaTexto,
    fontWeight: '600',
  },
  chipMesTextoSelecionado: {
    color: '#00D1FF',
    fontWeight: '700',
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
    width: 42,
    marginRight: espacamento.sm,
  },
  itemSemana: {
    fontSize: 9,
    color: cores.cinzaTexto,
    fontWeight: tipografia.bold,
    marginBottom: -2,
  },
  itemDia: {
    fontSize: tipografia.grande,
    fontWeight: tipografia.bold,
    color: cores.primario,
    lineHeight: 24,
  },
  itemMes: {
    fontSize: 9,
    color: cores.cinzaTexto,
    fontWeight: tipografia.bold,
    marginTop: -2,
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
    marginBottom: 4,
  },
  itemDescricao: {
    fontSize: tipografia.micro,
    color: cores.textoSecundario,
    fontStyle: 'italic',
    lineHeight: 14,
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
    fontWeight: tipografia.semi,
    color: cores.texto,
  },
  vazioSub: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    textAlign: 'center',
  },

  swipeBotaoEditar: {
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 76,
    borderRadius: bordas.md,
    marginBottom: espacamento.sm,
    marginRight: -10, // Para encaixar melhor
    paddingRight: 10,
  },
  swipeBotaoExcluir: {
    backgroundColor: cores.erro,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 76,
    borderRadius: bordas.md,
    marginBottom: espacamento.sm,
    marginLeft: -10,
    paddingLeft: 10,
  },
  swipeBotaoTexto: {
    color: cores.branco,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: espacamento.lg,
  },
  modalContainer: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    overflow: 'hidden',
    ...sombras.grande,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: espacamento.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.cinzaClaro,
  },
  modalTitulo: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },
  modalCorpo: {
    padding: espacamento.md,
  },
  labelInput: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: tipografia.bold,
  },
  input: {
    backgroundColor: cores.cinzaFundo,
    borderRadius: bordas.md,
    padding: espacamento.md,
    color: cores.texto,
    fontSize: tipografia.normal,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  infoViagemCurta: {
    marginTop: 12,
    alignItems: 'center',
  },
  infoTextoCurto: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: espacamento.md,
    gap: espacamento.sm,
    borderTopWidth: 1,
    borderTopColor: cores.cinzaClaro,
  },
  botaoExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacamento.md,
  },
  botaoExcluirTexto: {
    color: cores.erro,
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.semi,
  },
  botaoSalvarEdicao: {
    flex: 1,
    backgroundColor: cores.primario,
    borderRadius: bordas.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoSalvarTexto: {
    color: '#0F172A',
    fontSize: tipografia.normal,
    fontWeight: tipografia.bold,
  },
  botaoModoSelecao: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  botaoModoSelecaoTexto: {
    fontSize: 12,
    color: cores.cinzaTexto,
    fontWeight: '600',
  },
  itemViagemSelecionado: {
    borderColor: cores.primario,
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
  },
  checkboxContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
