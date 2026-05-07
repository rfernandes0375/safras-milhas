/**
 * DetalhesViagemScreen.js — Visualização de Trajeto e Detalhes
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, Modal, TextInput, KeyboardAvoidingView, 
  Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora } from '../utils/calculos';

export default function DetalhesViagemScreen({ route, navigation }) {
  const { viagem } = route.params;
  const { editarViagem, excluirViagem } = useApp();
  
  const [modalEdicao, setModalEdicao] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState(viagem.descricao || '');

  // Coordenadas para o mapa
  const coords = viagem.coordenadas || [];
  const temRota = coords.length > 0;

  // Define o centro do mapa (primeiro ponto ou 0,0)
  const initialRegion = temRota ? {
    latitude: coords[0].lat,
    longitude: coords[0].lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : null;

  const salvarDescricao = async () => {
    await editarViagem(viagem.id, { descricao: novaDescricao });
    setModalEdicao(false);
    // Atualiza o objeto local para refletir na tela imediatamente
    viagem.descricao = novaDescricao;
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir Viagem',
      'Deseja remover permanentemente este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            await excluirViagem(viagem.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <View style={estilos.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Mapa de Trajeto */}
      <View style={estilos.mapaContainer}>
        {temRota ? (
          <MapView
            style={estilos.mapa}
            initialRegion={initialRegion}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            customMapStyle={mapStyleDark} // Estética Premium
          >
            <Polyline
              coordinates={coords.map(c => ({ latitude: c.lat, longitude: c.lng }))}
              strokeColor={cores.primario}
              strokeWidth={4}
            />
            {/* Marcador de Início */}
            <Marker coordinate={{ latitude: coords[0].lat, longitude: coords[0].lng }}>
              <View style={estilos.marcadorInicio} />
            </Marker>
            {/* Marcador de Fim */}
            <Marker coordinate={{ latitude: coords[coords.length - 1].lat, longitude: coords[coords.length - 1].lng }}>
              <View style={estilos.marcadorFim} />
            </Marker>
          </MapView>
        ) : (
          <View style={estilos.mapaVazio}>
            <Ionicons name="map-outline" size={48} color={cores.cinzaMedio} />
            <Text style={estilos.mapaVazioTexto}>Trajeto não disponível</Text>
          </View>
        )}

        {/* Botão Voltar */}
        <TouchableOpacity 
          style={estilos.botaoVoltar} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={cores.branco} />
        </TouchableOpacity>
      </View>

      {/* Card de Informações */}
      <View style={estilos.infoCard}>
        <View style={estilos.alça} />
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={estilos.headerInfo}>
            <View>
              <Text style={estilos.data}>{formatarData(viagem.inicio)}</Text>
              <Text style={estilos.horario}>{formatarHora(viagem.inicio)} — {formatarHora(viagem.fim)}</Text>
            </View>
            <View style={estilos.badgeTrabalho}>
              <Text style={estilos.badgeTexto}>TRABALHO</Text>
            </View>
          </View>

          <View style={estilos.locaisContainer}>
            <View style={estilos.localRow}>
              <View style={[estilos.ponto, { backgroundColor: cores.primario }]} />
              <Text style={estilos.localTexto} numberOfLines={1}>{viagem.localInicio || 'Início'}</Text>
            </View>
            <View style={estilos.linhaConectora} />
            <View style={estilos.localRow}>
              <View style={[estilos.ponto, { backgroundColor: cores.erro }]} />
              <Text style={estilos.localTexto} numberOfLines={1}>{viagem.localFim || 'Fim'}</Text>
            </View>
          </View>

          <View style={estilos.statsContainer}>
            <View style={estilos.statItem}>
              <Text style={estilos.statLabel}>Distância</Text>
              <Text style={estilos.statValor}>{formatarKm(viagem.distanciaKm)}</Text>
            </View>
            <View style={estilos.statDivisor} />
            <View style={estilos.statItem}>
              <Text style={estilos.statLabel}>Valor</Text>
              <Text style={[estilos.statValor, { color: cores.primario }]}>{formatarMoeda(viagem.valor)}</Text>
            </View>
          </View>

          <View style={estilos.descricaoBox}>
            <View style={estilos.descricaoHeader}>
              <Text style={estilos.descricaoLabel}>DESCRIÇÃO</Text>
              <TouchableOpacity onPress={() => setModalEdicao(true)}>
                <Ionicons name="create-outline" size={18} color={cores.primario} />
              </TouchableOpacity>
            </View>
            <Text style={estilos.descricaoTexto}>
              {viagem.descricao || 'Nenhuma descrição informada.'}
            </Text>
          </View>

          <TouchableOpacity style={estilos.botaoExcluirFull} onPress={handleExcluir}>
            <Ionicons name="trash-outline" size={18} color={cores.erro} />
            <Text style={estilos.botaoExcluirTexto}>Remover esta viagem</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Modal de Edição */}
      <Modal visible={modalEdicao} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={estilos.modalOverlay}
        >
          <View style={estilos.modalContent}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Editar Descrição</Text>
              <TouchableOpacity onPress={() => setModalEdicao(false)}>
                <Ionicons name="close" size={24} color={cores.texto} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={estilos.input}
              value={novaDescricao}
              onChangeText={setNovaDescricao}
              multiline
              placeholder="Ex: Reunião com Rodrigo Ferreira..."
              placeholderTextColor={cores.cinzaTexto}
              autoFocus
            />
            <TouchableOpacity style={estilos.botaoSalvar} onPress={salvarDescricao}>
              <Text style={estilos.botaoSalvarTexto}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const mapStyleDark = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  mapaContainer: { height: '45%', width: '100%', position: 'relative' },
  mapa: { ...StyleSheet.absoluteFillObject },
  mapaVazio: { flex: 1, backgroundColor: cores.cinzaClaro, justifyContent: 'center', alignItems: 'center' },
  mapaVazioTexto: { marginTop: 12, color: cores.cinzaTexto, fontSize: 14 },
  botaoVoltar: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  marcadorInicio: { width: 14, height: 14, borderRadius: 7, backgroundColor: cores.primario, borderWidth: 3, borderColor: cores.branco },
  marcadorFim: { width: 14, height: 14, borderRadius: 7, backgroundColor: cores.erro, borderWidth: 3, borderColor: cores.branco },

  infoCard: { flex: 1, backgroundColor: cores.fundoCard, marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: espacamento.xl, ...sombras.grande },
  alça: { width: 40, height: 4, backgroundColor: cores.cinzaMedio, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  data: { fontSize: 20, fontWeight: 'bold', color: cores.texto },
  horario: { fontSize: 14, color: cores.cinzaTexto, marginTop: 4 },
  badgeTrabalho: { backgroundColor: 'rgba(0, 209, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeTexto: { color: cores.primario, fontSize: 10, fontWeight: 'bold' },

  locaisContainer: { marginBottom: 24 },
  localRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  localTexto: { flex: 1, fontSize: 15, color: cores.texto, fontWeight: '500' },
  linhaConectora: { width: 2, height: 20, backgroundColor: cores.cinzaClaro, marginLeft: 4, marginVertical: 2 },

  statsContainer: { flexDirection: 'row', backgroundColor: cores.cinzaFundo, borderRadius: 16, padding: 16, marginBottom: 24 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: cores.cinzaTexto, textTransform: 'uppercase', marginBottom: 4 },
  statValor: { fontSize: 18, fontWeight: 'bold', color: cores.texto },
  statDivisor: { width: 1, backgroundColor: cores.cinzaClaro },

  descricaoBox: { marginBottom: 24 },
  descricaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  descricaoLabel: { fontSize: 10, color: cores.cinzaTexto, fontWeight: 'bold', letterSpacing: 1 },
  descricaoTexto: { fontSize: 15, color: cores.cinzaTexto, lineHeight: 22, fontStyle: 'italic' },

  botaoExcluirFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, opacity: 0.5 },
  botaoExcluirTexto: { color: cores.erro, fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: cores.fundoCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: cores.texto },
  input: { backgroundColor: cores.cinzaFundo, borderRadius: 12, padding: 16, color: cores.texto, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  botaoSalvar: { backgroundColor: cores.primario, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  botaoSalvarTexto: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});
