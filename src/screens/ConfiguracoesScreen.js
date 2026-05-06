/**
 * ConfiguracoesScreen.js — Tela de Configurações (Tela 4)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Switch, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';

export default function ConfiguracoesScreen() {
  const { config, salvarConfig } = useApp();
  const [form, setForm] = useState({
    modoCalculo: config.modoCalculo,
    consumoMedio: String(config.consumoMedio),
    precoCombustivel: String(config.precoCombustivel),
    valorPorKm: String(config.valorPorKm),
    raioGeofence: String(config.raioGeofence),
    notificacaoHora: String(config.notificacaoHora),
  });

  const atualizar = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const salvar = async () => {
    const dados = {
      modoCalculo: form.modoCalculo,
      consumoMedio: parseFloat(form.consumoMedio) || 10,
      precoCombustivel: parseFloat(form.precoCombustivel) || 6.5,
      valorPorKm: parseFloat(form.valorPorKm) || 0.6,
      raioGeofence: parseInt(form.raioGeofence) || 300,
      notificacaoHora: parseInt(form.notificacaoHora) || 17,
    };
    await salvarConfig(dados);
    Alert.alert('Salvo!', 'Configurações atualizadas com sucesso.');
  };

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>

        <Text style={estilos.titulo}>Configurações</Text>

        {/* ─── Cálculo de Reembolso ─────────────────────────────────── */}
        <Secao titulo="Cálculo de Reembolso" icone="calculator-outline">
          <Text style={estilos.label}>Modo de cálculo</Text>
          <View style={estilos.modoContainer}>
            {['consumo', 'valor_km'].map((modo) => (
              <TouchableOpacity
                key={modo}
                style={[estilos.modoChip, form.modoCalculo === modo && estilos.modoChipAtivo]}
                onPress={() => atualizar('modoCalculo', modo)}
              >
                <Text style={[estilos.modoChipTexto, form.modoCalculo === modo && estilos.modoChipTextoAtivo]}>
                  {modo === 'consumo' ? 'Por consumo' : 'Por R$/km'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.modoCalculo === 'consumo' ? (
            <>
              <CampoNumerico
                label="Consumo médio (km/L)"
                valor={form.consumoMedio}
                onChange={(v) => atualizar('consumoMedio', v)}
                placeholder="Ex: 10"
                sufixo="km/L"
              />
              <CampoNumerico
                label="Preço do combustível (R$/L)"
                valor={form.precoCombustivel}
                onChange={(v) => atualizar('precoCombustivel', v)}
                placeholder="Ex: 6,50"
                prefixo="R$"
              />
            </>
          ) : (
            <CampoNumerico
              label="Valor por quilômetro"
              valor={form.valorPorKm}
              onChange={(v) => atualizar('valorPorKm', v)}
              placeholder="Ex: 0,60"
              prefixo="R$"
              sufixo="/km"
            />
          )}
        </Secao>

        {/* ─── Geofence da Base ─────────────────────────────────────── */}
        <Secao titulo="Base Safras & Cifras" icone="location-outline">
          <Text style={estilos.baseEndereco}>
            📍 Av. Olinda, 960 — Park Lozandes, Goiânia-GO
          </Text>
          <CampoNumerico
            label="Raio de detecção (metros)"
            valor={form.raioGeofence}
            onChange={(v) => atualizar('raioGeofence', v)}
            placeholder="300"
            sufixo="m"
          />
          <Text style={estilos.dica}>
            Viagens que partem ou chegam neste raio são marcadas como "provável trabalho"
          </Text>
        </Secao>

        {/* ─── Notificações ─────────────────────────────────────────── */}
        <Secao titulo="Notificação Semanal" icone="notifications-outline">
          <Text style={estilos.descricao}>
            Toda sexta-feira, você receberá um lembrete para classificar os trajetos pendentes.
          </Text>
          <CampoNumerico
            label="Horário da notificação"
            valor={form.notificacaoHora}
            onChange={(v) => atualizar('notificacaoHora', v)}
            placeholder="17"
            sufixo="h"
          />
        </Secao>

        {/* ─── Sobre o Rastreamento ─────────────────────────────────── */}
        <Secao titulo="Rastreamento" icone="radio-outline">
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Velocidade mínima para detectar viagem: 20 km/h</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Distância mínima gravada: 500m</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Fim de viagem: parado por 2 minutos</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Funciona com o app fechado (iOS)</Text>
          </View>
        </Secao>

        {/* ─── Botão Salvar ─────────────────────────────────────────── */}
        <TouchableOpacity style={estilos.botaoSalvar} onPress={salvar} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={20} color={cores.branco} />
          <Text style={estilos.botaoSalvarTexto}>Salvar configurações</Text>
        </TouchableOpacity>

        <Text style={estilos.versao}>Safras Milhas v1.0 — Desenvolvido para Safras & Cifras</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function Secao({ titulo, icone, children }) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.secaoHeader}>
        <Ionicons name={icone} size={18} color={cores.primario} />
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function CampoNumerico({ label, valor, onChange, placeholder, prefixo, sufixo }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.campoLabel}>{label}</Text>
      <View style={estilos.campoInput}>
        {prefixo && <Text style={estilos.campoPrefixo}>{prefixo}</Text>}
        <TextInput
          style={estilos.input}
          value={valor}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={cores.cinzaTexto}
        />
        {sufixo && <Text style={estilos.campoSufixo}>{sufixo}</Text>}
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  scroll: { padding: espacamento.md, paddingBottom: espacamento.xxl },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: tipografia.bold,
    color: cores.texto,
    marginBottom: espacamento.md,
  },

  secao: {
    backgroundColor: cores.branco,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    ...sombras.pequena,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    marginBottom: espacamento.md,
    paddingBottom: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.cinzaClaro,
  },
  secaoTitulo: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.texto,
  },

  label: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
    marginBottom: espacamento.xs,
    fontWeight: tipografia.medio,
  },

  modoContainer: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginBottom: espacamento.md,
  },
  modoChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: bordas.md,
    backgroundColor: cores.cinzaClaro,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modoChipAtivo: {
    backgroundColor: cores.primarioFundo,
    borderColor: cores.primario,
  },
  modoChipTexto: {
    fontSize: tipografia.pequeno,
    fontWeight: tipografia.semibold,
    color: cores.cinzaEscuro,
  },
  modoChipTextoAtivo: { color: cores.primario },

  campo: { marginBottom: espacamento.md },
  campoLabel: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
    marginBottom: 6,
    fontWeight: tipografia.medio,
  },
  campoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cinzaFundo,
    borderRadius: bordas.md,
    borderWidth: 1,
    borderColor: cores.cinzaMedio,
    paddingHorizontal: espacamento.sm,
  },
  campoPrefixo: {
    fontSize: tipografia.normal,
    color: cores.cinzaEscuro,
    marginRight: 4,
  },
  campoSufixo: {
    fontSize: tipografia.normal,
    color: cores.cinzaEscuro,
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: tipografia.normal,
    color: cores.texto,
    paddingVertical: 12,
  },

  baseEndereco: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
    backgroundColor: cores.cinzaFundo,
    padding: espacamento.sm,
    borderRadius: bordas.sm,
    marginBottom: espacamento.md,
  },
  dica: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    marginTop: -8,
    lineHeight: 16,
  },
  descricao: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
    lineHeight: 20,
    marginBottom: espacamento.md,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingVertical: 6,
  },
  infoTexto: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaEscuro,
  },

  botaoSalvar: {
    backgroundColor: cores.primario,
    borderRadius: bordas.lg,
    paddingVertical: espacamento.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacamento.sm,
    marginBottom: espacamento.md,
    ...sombras.grande,
  },
  botaoSalvarTexto: {
    color: cores.branco,
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
  },

  versao: {
    textAlign: 'center',
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
    marginTop: espacamento.sm,
  },
});
