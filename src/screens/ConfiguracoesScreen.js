/**
 * ConfiguracoesScreen.js — Tela de Configurações (Tela 4)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Switch, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import * as Database from '../services/database';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';

export default function ConfiguracoesScreen() {
  const { config, salvarConfig, carregarViagens } = useApp();
  const [form, setForm] = useState({
    modoCalculo: config.modoCalculo,
    consumoMedio: String(config.consumoMedio).replace('.', ','),
    precoCombustivel: String(config.precoCombustivel).replace('.', ','),
    valorPorKm: String(config.valorPorKm).replace('.', ','),
    raioGeofence: String(config.raioGeofence),
    distanciaMinima: String(config.distanciaMinima || 500),
    notificacaoHora: String(config.notificacaoHora),
  });

  // Sincroniza formulário se o config mudar (ex: após carregar do banco)
  useEffect(() => {
    setForm({
      modoCalculo: config.modoCalculo,
      consumoMedio: String(config.consumoMedio).replace('.', ','),
      precoCombustivel: String(config.precoCombustivel).replace('.', ','),
      valorPorKm: String(config.valorPorKm).replace('.', ','),
      raioGeofence: String(config.raioGeofence),
      distanciaMinima: String(config.distanciaMinima || 500),
      notificacaoHora: String(config.notificacaoHora),
    });
  }, [config]);

  const atualizar = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const gerarDadosTeste = async () => {
    const mock = [
      {
        inicio: new Date().toISOString(),
        fim: new Date(Date.now() + 3600000).toISOString(),
        distanciaMetros: 15400,
        distanciaKm: 15.4,
        valor: 15.4 * 0.85,
        localInicio: 'Sede Safras & Cifras',
        localFim: 'Fazenda Rio Verde',
        descricao: 'Visita técnica mensal',
        coordenadas: []
      },
      {
        inicio: new Date(Date.now() - 86400000).toISOString(),
        fim: new Date(Date.now() - 86400000 + 7200000).toISOString(),
        distanciaMetros: 42100,
        distanciaKm: 42.1,
        valor: 42.1 * 0.85,
        localInicio: 'Fazenda Rio Verde',
        localFim: 'Sede Safras & Cifras',
        descricao: 'Retorno de consultoria',
        coordenadas: []
      }
    ];

    try {
      for (const v of mock) {
        const salva = await Database.salvarViagem(v);
        // Força a classificação para trabalho para aparecer no PDF/Histórico
        await Database.classificarViagem(salva.id, 'trabalho', v.descricao, v.valor);
      }
      
      // Atualiza o estado global para os dados aparecerem na hora
      await carregarViagens();
      
      Alert.alert('Sucesso', 'Viagens de teste geradas! Vá ao Histórico para ver o resultado e testar o PDF.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível gerar dados de teste. Verifique os logs.');
    }
  };

  const limparNumero = (txt) => {
    if (!txt) return 0;
    return parseFloat(txt.replace(',', '.')) || 0;
  };

  const salvar = async () => {
    const dados = {
      modoCalculo: form.modoCalculo,
      consumoMedio: limparNumero(form.consumoMedio) || 10,
      precoCombustivel: limparNumero(form.precoCombustivel) || 6.5,
      valorPorKm: limparNumero(form.valorPorKm) || 0.85,
      raioGeofence: parseInt(form.raioGeofence) || 300,
      distanciaMinima: parseInt(form.distanciaMinima) || 500,
      notificacaoHora: parseInt(form.notificacaoHora) || 17,
    };
    await salvarConfig(dados);
    Alert.alert('Sucesso', 'Configurações salvas e aplicadas ao rastreador.');
  };

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>

        <Text style={estilos.titulo}>Configurações</Text>

        {/* ─── Cálculo de Reembolso ─────────────────────────────────── */}
        <Secao titulo="Cálculo de Reembolso" icone="calculator-outline">
          <Text style={estilos.campoLabel}>Modo de cálculo</Text>
          <View style={estilos.modoContainer}>
            <TouchableOpacity
              style={[estilos.botaoModo, form.modoCalculo === 'consumo' && estilos.botaoModoAtivo]}
              onPress={() => atualizar('modoCalculo', 'consumo')}
              activeOpacity={0.7}
            >
              <Text style={[estilos.botaoModoTexto, form.modoCalculo === 'consumo' && estilos.botaoModoTextoAtivo]}>
                Por consumo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.botaoModo, form.modoCalculo === 'km' && estilos.botaoModoAtivo]}
              onPress={() => atualizar('modoCalculo', 'km')}
              activeOpacity={0.7}
            >
              <Text style={[estilos.botaoModoTexto, form.modoCalculo === 'km' && estilos.botaoModoTextoAtivo]}>
                Por R$/km
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />

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

        {/* ─── Localização e Geofence ────────────────────────────────── */}
        <Secao titulo="Localização" icone="location-outline">
          <View style={estilos.baseEndereco}>
            <Text style={{ color: cores.texto, fontWeight: 'bold' }}>Sede Safras & Cifras</Text>
            <Text style={{ color: cores.cinzaEscuro, fontSize: 12 }}>📍 Av. Olinda, 960 — Park Lozandes, Goiânia-GO</Text>
          </View>
          
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

          <View style={{ height: 20 }} />

          <CampoNumerico
            label="Distância mínima para salvar"
            valor={form.distanciaMinima}
            onChange={(v) => atualizar('distanciaMinima', v)}
            placeholder="500"
            sufixo="m"
          />
          <Text style={estilos.dica}>
            Viagens menores que isso serão descartadas automaticamente.
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

        {/* ─── Sobre o Rastreamento (DINÂMICO) ──────────────────────── */}
        <Secao titulo="Resumo das Regras" icone="radio-outline">
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Detectar início acima de 12 km/h</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Salvar viagens maiores que {form.distanciaMinima || '500'}m</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Raio de detecção na Sede: {form.raioGeofence || '300'}m</Text>
          </View>
          <View style={estilos.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
            <Text style={estilos.infoTexto}>Lembrete semanal: Sextas às {form.notificacaoHora || '17'}h</Text>
          </View>
        </Secao>

        {/* ─── Botão Salvar ─────────────────────────────────────────── */}
        <TouchableOpacity style={estilos.botaoSalvar} onPress={salvar} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={20} color={cores.branco} />
          <Text style={estilos.botaoSalvarTexto}>Salvar configurações</Text>
        </TouchableOpacity>

        {/* ─── Botão Teste ─────────────────────────────────────────── */}
        <TouchableOpacity 
          style={{ marginTop: 10, marginBottom: 30, padding: 10, alignItems: 'center' }}
          onPress={gerarDadosTeste}
        >
          <Text style={{ color: cores.cinzaTexto, fontSize: 12, textDecorationLine: 'underline' }}>
            Gerar 3 viagens de teste (para validar banco)
          </Text>
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
      <View style={estilos.inputGroup}>
        {prefixo && <Text style={estilos.inputPrefixo}>{prefixo}</Text>}
        <TextInput
          style={estilos.input}
          value={valor}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
        {sufixo && <Text style={estilos.inputSufixo}>{sufixo}</Text>}
        <Ionicons name="pencil-outline" size={14} color="#94A3B8" style={{ marginLeft: 8 }} />
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
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    marginBottom: espacamento.md,
    paddingBottom: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.cinzaMedio,
  },
  secaoTitulo: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.texto,
  },

  campo: {
    marginBottom: espacamento.md,
  },
  campoLabel: {
    fontSize: 14,
    color: cores.cinzaEscuro,
    marginBottom: 8,
    fontWeight: '600',
  },
  descricao: {
    fontSize: 14,
    color: cores.cinzaTexto,
    marginBottom: 16,
    lineHeight: 20,
  },
  dica: {
    fontSize: 12,
    color: cores.cinzaTexto,
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.8,
  },

  modoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  botaoModo: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  botaoModoAtivo: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderColor: '#00D1FF',
  },
  botaoModoTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.cinzaTexto,
  },
  botaoModoTextoAtivo: {
    color: '#00D1FF',
  },

  inputGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    color: cores.branco,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
    paddingVertical: 0,
  },
  inputPrefixo: {
    color: cores.cinzaTexto,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  inputSufixo: {
    color: cores.cinzaTexto,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  baseEndereco: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: espacamento.md,
    borderRadius: bordas.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingVertical: 6,
  },
  infoTexto: {
    fontSize: 14,
    color: cores.cinzaTexto,
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
