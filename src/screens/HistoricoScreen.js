/**
 * HistoricoScreen.js — Tela de Histórico (Tela 3)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView, StatusBar, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback
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
  
  const [modalVisivel, setModalVisivel] = useState(false);
  const [viagemEdicao, setViagemEdicao] = useState(null);
  const [novaDescricao, setNovaDescricao] = useState('');

  const [selecaoAtiva, setSelecaoAtiva] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  
  useEffect(() => {
    carregarMeses();
    setSelecaoAtiva(false);
    setSelecionados(new Set());
  }, [mesAtual]);

  const carregarMeses = async () => {
    const meses = await Database.buscarMesesDisponiveis();
    const mesAtu = new Date().toISOString().slice(0, 7);
    if (!meses.includes(mesAtu)) meses.unshift(mesAtu);
    setMesesDisponiveis(meses);
  };

  const toggleSelecao = (id) => {
    const novos = new Set(selecionados);
    if (novos.has(id)) novos.delete(id);
    else novos.add(id);
    setSelecionados(novos);
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
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          await Database.excluirViagem(v.id);
          excluirViagem(v.id);
          setModalVisivel(false);
        }},
      ]
    );
  };

  const handleExportar = () => {
    const viagensParaExportar = selecaoAtiva && selecionados.size > 0
      ? viagensConfirmadas.filter(v => selecionados.has(v.id))
      : viagensConfirmadas;
    navigation.navigate('Relatorio', { viagensCustom: viagensParaExportar });
    if (selecaoAtiva) { setSelecaoAtiva(false); setSelecionados(new Set()); }
  };

  const renderItem = ({ item: viagem, index }) => {
    const selecionado = selecionados.has(viagem.id);
    
    return (
      <Swipeable
        renderLeftActions={() => (
          <TouchableOpacity style={estilos.swipeBotaoEditar} onPress={() => abrirEdicao(viagem)}>
            <Ionicons name="create" size={24} color={cores.branco} />
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity style={estilos.swipeBotaoExcluir} onPress={() => handleExcluir(viagem)}>
            <Ionicons name="trash" size={24} color={cores.branco} />
          </TouchableOpacity>
        )}
        enabled={!selecaoAtiva}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => selecaoAtiva ? toggleSelecao(viagem.id) : navigation.navigate('DetalhesViagem', { viagem })}
          style={[
            estilos.itemViagem, 
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

          <View style={estilos.itemDataCol}>
            <Text style={estilos.itemSemana}>{new Date(viagem.inicio).toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}</Text>
            <Text style={estilos.itemDia}>{new Date(viagem.inicio).getDate().toString().padStart(2, '0')}</Text>
          </View>

          <View style={estilos.itemInfo}>
            <Text style={estilos.itemRota} numberOfLines={1}>{viagem.localInicio || '—'} → {viagem.localFim || '—'}</Text>
            <Text style={estilos.itemHorario}>{formatarHora(viagem.inicio)} às {formatarHora(viagem.fim)}</Text>
            {viagem.descricao && <Text style={estilos.itemDescricao} numberOfLines={1}>{viagem.descricao}</Text>}
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

      <View style={estilos.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={estilos.headerTitulo}>Histórico</Text>
          <TouchableOpacity onPress={() => { setSelecaoAtiva(!selecaoAtiva); setSelecionados(new Set()); }}>
            <Text style={[estilos.botaoModoSelecaoTexto, selecaoAtiva && { color: cores.primario }]}>
              {selecaoAtiva ? 'Cancelar' : 'Selecionar'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={estilos.botaoRelatorio} onPress={handleExportar}>
          <Ionicons name="document-text-outline" size={18} color={cores.primario} />
          <Text style={estilos.botaoRelatorioTexto}>Exportar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.seletorMes}>
        {mesesDisponiveis.map((mes) => (
          <TouchableOpacity
            key={mes}
            style={[estilos.chipMes, mes === mesAtual && estilos.chipMesSelecionado]}
            onPress={() => setMesAtual(mes)}
          >
            <Text style={[estilos.chipMesTexto, mes === mesAtual && estilos.chipMesTextoSelecionado]}>{formatarMes(mes)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={estilos.cardTotais}>
        <View style={estilos.totalItem}><Text style={estilos.totalLabel}>Km</Text><Text style={estilos.totalValor}>{formatarKm(totalKmMes)}</Text></View>
        <View style={estilos.totalDivisor} />
        <View style={estilos.totalItem}><Text style={estilos.totalLabel}>Reembolso</Text><Text style={[estilos.totalValor, { color: cores.primario }]}>{formatarMoeda(totalReembolsoMes)}</Text></View>
        <View style={estilos.totalDivisor} />
        <View style={estilos.totalItem}><Text style={estilos.totalLabel}>Viagens</Text><Text style={estilos.totalValor}>{viagensConfirmadas.length}</Text></View>
      </View>

      {viagensConfirmadas.length === 0 ? (
        <View style={estilos.vazio}>
          <Ionicons name="calendar-outline" size={48} color={cores.cinzaMedio} />
          <Text style={estilos.vazioTitulo}>Nenhuma viagem</Text>
        </View>
      ) : (
        <FlatList
          data={viagensConfirmadas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
        />
      )}

      {/* Modal de Edição */}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={estilos.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={estilos.modalContainer}>
                <View style={estilos.modalHeader}>
                  <Text style={estilos.modalTitulo}>Editar Descrição</Text>
                  <TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close" size={24} color={cores.texto} /></TouchableOpacity>
                </View>
                <View style={estilos.modalCorpo}>
                  <TextInput
                    style={estilos.input}
                    value={novaDescricao}
                    onChangeText={setNovaDescricao}
                    multiline
                    placeholder="Descrição..."
                    placeholderTextColor={cores.cinzaMedio}
                  />
                </View>
                <View style={estilos.modalFooter}>
                  <TouchableOpacity style={estilos.botaoExcluir} onPress={() => handleExcluir()}><Text style={{ color: cores.erro }}>Excluir</Text></TouchableOpacity>
                  <TouchableOpacity style={estilos.botaoSalvarEdicao} onPress={salvarEdicao}><Text style={estilos.botaoSalvarTexto}>Salvar</Text></TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: espacamento.md },
  headerTitulo: { fontSize: 24, fontWeight: 'bold', color: cores.texto },
  botaoRelatorio: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.primarioFundo, padding: 8, borderRadius: 12 },
  botaoRelatorioTexto: { color: cores.primario, fontWeight: 'bold' },
  seletorMes: { paddingHorizontal: espacamento.md, paddingVertical: 16, marginBottom: 4 },
  chipMes: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: cores.fundoCard, marginRight: 8, justifyContent: 'center', borderWidth: 1, borderColor: cores.cinzaClaro },
  chipMesSelecionado: { backgroundColor: 'rgba(0, 209, 255, 0.1)', borderColor: cores.primario },
  chipMesTexto: { color: cores.cinzaTexto, fontWeight: '600' },
  chipMesTextoSelecionado: { color: cores.primario },
  cardTotais: { flexDirection: 'row', margin: espacamento.md, backgroundColor: cores.fundoCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: cores.cinzaClaro },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { fontSize: 10, color: cores.cinzaTexto, marginBottom: 4 },
  totalValor: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  totalDivisor: { width: 1, backgroundColor: cores.cinzaClaro, marginVertical: 4 },
  lista: { paddingHorizontal: espacamento.md, paddingBottom: 40 },
  itemViagem: { flexDirection: 'row', backgroundColor: cores.fundoCard, borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: cores.cinzaClaro },
  itemViagemSelecionado: { borderColor: cores.primario, backgroundColor: 'rgba(0, 209, 255, 0.05)' },
  itemDataCol: { alignItems: 'center', width: 40, marginRight: 12 },
  itemSemana: { fontSize: 10, color: cores.cinzaTexto, fontWeight: 'bold' },
  itemDia: { fontSize: 20, fontWeight: 'bold', color: cores.primario },
  itemInfo: { flex: 1 },
  itemRota: { fontSize: 14, fontWeight: 'bold', color: cores.texto, marginBottom: 2 },
  itemHorario: { fontSize: 12, color: cores.cinzaTexto, marginBottom: 2 },
  itemDescricao: { fontSize: 12, color: cores.cinzaTexto, fontStyle: 'italic' },
  itemValores: { alignItems: 'flex-end' },
  itemKm: { fontSize: 12, color: cores.cinzaTexto },
  itemReais: { fontSize: 14, fontWeight: 'bold', color: cores.primario },
  checkboxContainer: { marginRight: 12 },
  swipeBotaoEditar: { backgroundColor: cores.primario, justifyContent: 'center', alignItems: 'center', width: 70, height: '88%', borderRadius: 16, marginLeft: 5 },
  swipeBotaoExcluir: { backgroundColor: cores.erro, justifyContent: 'center', alignItems: 'center', width: 70, height: '88%', borderRadius: 16, marginRight: 5 },
  vazio: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  vazioTitulo: { color: cores.cinzaTexto, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: cores.fundoCard, borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: cores.cinzaClaro },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: cores.texto },
  modalCorpo: { padding: 20 },
  input: { backgroundColor: cores.cinzaFundo, borderRadius: 12, padding: 16, color: cores.texto, minHeight: 100, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 10, borderTopWidth: 1, borderTopColor: cores.cinzaClaro },
  botaoExcluir: { padding: 12 },
  botaoSalvarEdicao: { flex: 1, backgroundColor: cores.primario, padding: 12, borderRadius: 12, alignItems: 'center' },
  botaoSalvarTexto: { color: '#0F172A', fontWeight: 'bold' },
  botaoModoSelecaoTexto: { fontSize: 12, color: cores.cinzaTexto, fontWeight: 'bold' },
});
