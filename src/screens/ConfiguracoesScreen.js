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
import * as Tracking from '../services/tracking';
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

        {/* ─── Perfil / Header Premium ────────────────────────────────── */}
        <View style={estilos.perfilHeader}>
          <View style={estilos.avatarContainer}>
            <Ionicons name="car-sport" size={32} color={cores.primario} />
          </View>
          <View style={estilos.perfilInfo}>
            <Text style={estilos.perfilNome}>Configurações</Text>
          </View>
        </View>

        {/* ─── Resumo Rápido (Cards Horizontais) ───────────────────────── */}
        <View style={estilos.resumoHorizontal}>
          <View style={estilos.cardMini}>
            <Text style={estilos.cardMiniValor}>{form.distanciaMinima}m</Text>
            <Text style={estilos.cardMiniLabel}>Dist. Mínima</Text>
          </View>
          <View style={estilos.cardMini}>
            <Text style={estilos.cardMiniValor}>R$ {form.valorPorKm}</Text>
            <Text style={estilos.cardMiniLabel}>Taxa/KM</Text>
          </View>
          <View style={estilos.cardMini}>
            <Text style={estilos.cardMiniValor}>{form.notificacaoHora}h</Text>
            <Text style={estilos.cardMiniLabel}>Lembrete</Text>
          </View>
        </View>

        {/* ─── Cálculo de Reembolso ─────────────────────────────────── */}
        <Secao titulo="Cálculo de Reembolso" icone="calculator-outline" corIcone="#00D1FF">
          <Text style={estilos.campoLabel}>Método Preferencial</Text>
          <View style={estilos.modoContainer}>
            <TouchableOpacity
              style={[estilos.botaoModo, form.modoCalculo === 'consumo' && estilos.botaoModoAtivo]}
              onPress={() => atualizar('modoCalculo', 'consumo')}
              activeOpacity={0.7}
            >
              <Ionicons name="funnel-outline" size={16} color={form.modoCalculo === 'consumo' ? cores.primario : cores.cinzaTexto} />
              <Text style={[estilos.botaoModoTexto, form.modoCalculo === 'consumo' && estilos.botaoModoTextoAtivo]}>
                Consumo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.botaoModo, form.modoCalculo === 'km' && estilos.botaoModoAtivo]}
              onPress={() => atualizar('modoCalculo', 'km')}
              activeOpacity={0.7}
            >
              <Ionicons name="speedometer-outline" size={16} color={form.modoCalculo === 'km' ? cores.primario : cores.cinzaTexto} />
              <Text style={[estilos.botaoModoTexto, form.modoCalculo === 'km' && estilos.botaoModoTextoAtivo]}>
                Taxa Fixa
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />

          {form.modoCalculo === 'consumo' ? (
            <View style={estilos.gridInputs}>
              <CampoNumerico
                label="Média (km/L)"
                valor={form.consumoMedio}
                onChange={(v) => atualizar('consumoMedio', v)}
                placeholder="10"
                sufixo="km/L"
                style={{ flex: 1 }}
              />
              <View style={{ width: 12 }} />
              <CampoNumerico
                label="Preço (R$/L)"
                valor={form.precoCombustivel}
                onChange={(v) => atualizar('precoCombustivel', v)}
                placeholder="6,50"
                prefixo="R$"
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <CampoNumerico
              label="Valor por quilômetro rodado"
              valor={form.valorPorKm}
              onChange={(v) => atualizar('valorPorKm', v)}
              placeholder="Ex: 0,85"
              prefixo="R$"
              sufixo="/km"
            />
          )}
        </Secao>

        {/* ─── Localização ───────────────────────────────────────────── */}
        <Secao titulo="Rastreamento" icone="map-outline" corIcone="#10B981">
          <View style={estilos.baseEndereco}>
            <View style={estilos.baseIcone}>
              <Ionicons name="business" size={20} color={cores.primario} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.baseTitulo}>Sede Safras & Cifras</Text>
              <Text style={estilos.baseSub}>Park Lozandes, Goiânia-GO</Text>
            </View>
          </View>
          
          <View style={estilos.gridInputs}>
            <CampoNumerico
              label="Raio Detecção"
              valor={form.raioGeofence}
              onChange={(v) => atualizar('raioGeofence', v)}
              sufixo="m"
              style={{ flex: 1 }}
            />
            <View style={{ width: 12 }} />
            <CampoNumerico
              label="Dist. Mínima"
              valor={form.distanciaMinima}
              onChange={(v) => atualizar('distanciaMinima', v)}
              sufixo="m"
              style={{ flex: 1 }}
            />
          </View>
          <Text style={estilos.dica}>
            <Ionicons name="information-circle-outline" size={12} /> Ajustes finos para a precisão do GPS.
          </Text>
        </Secao>

        {/* ─── Agendamento ─────────────────────────────────────────── */}
        <Secao titulo="Lembretes" icone="time-outline" corIcone="#F59E0B">
          <View style={estilos.linhaNotif}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.campoLabel}>Alerta de Triagem</Text>
              <Text style={estilos.descricao}>Notificação toda sexta-feira</Text>
            </View>
            <CampoNumerico
              valor={form.notificacaoHora}
              onChange={(v) => atualizar('notificacaoHora', v)}
              sufixo="h"
              style={{ width: 80, marginBottom: 0 }}
            />
          </View>
        </Secao>

        {/* ─── Diagnóstico ─────────────────────────────────────────── */}
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Diagnóstico do Sistema</Text>
          <View style={estilos.cardInfo}>
            <View style={estilos.infoRow}>
              <Text style={estilos.infoLabel}>Status GPS:</Text>
              <Text style={[estilos.infoValor, { color: Tracking.getUltimaLocalizacao() ? cores.sucesso : cores.erro }]}>
                {Tracking.getUltimaLocalizacao() ? 'RECEBENDO DADOS' : 'AGUARDANDO SINAL...'}
              </Text>
            </View>
            {Tracking.getUltimaLocalizacao() && (
              <>
                <View style={estilos.infoRow}>
                  <Text style={estilos.infoLabel}>Latitude:</Text>
                  <Text style={estilos.infoValor}>{Tracking.getUltimaLocalizacao().latitude.toFixed(6)}</Text>
                </View>
                <View style={estilos.infoRow}>
                  <Text style={estilos.infoLabel}>Longitude:</Text>
                  <Text style={estilos.infoValor}>{Tracking.getUltimaLocalizacao().longitude.toFixed(6)}</Text>
                </View>
              </>
            )}
            <Text style={estilos.infoDica}>
              Se os números acima mudarem ou aparecerem, o GPS está funcionando corretamente.
            </Text>
          </View>
        </View>

        {/* ─── Botões de Ação ───────────────────────────────────────── */}
        <View style={estilos.footerAcoes}>
          <TouchableOpacity style={estilos.botaoSalvar} onPress={salvar} activeOpacity={0.8}>
            <Ionicons name="cloud-upload" size={20} color={cores.branco} />
            <Text style={estilos.botaoSalvarTexto}>Salvar Ajustes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={estilos.botaoTesteDiscreto}
            onPress={gerarDadosTeste}
          >
            <Ionicons name="flask-outline" size={14} color={cores.cinzaTexto} />
            <Text style={estilos.botaoTesteTexto}>Gerar Massa de Teste</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.espacamentoFinal} />
        <Text style={estilos.versao}>Safras Milhas v1.0.8 • Safras & Cifras</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Secao({ titulo, icone, corIcone, children }) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.secaoHeader}>
        <View style={[estilos.secaoIconeContainer, { backgroundColor: (corIcone || cores.primario) + '15' }]}>
          <Ionicons name={icone} size={18} color={corIcone || cores.primario} />
        </View>
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function CampoNumerico({ label, valor, onChange, placeholder, prefixo, sufixo, style }) {
  return (
    <View style={[estilos.campo, style]}>
      {label && <Text style={estilos.campoLabel}>{label}</Text>}
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
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  scroll: { padding: espacamento.md, paddingBottom: espacamento.xxl },

  // Perfil Header
  perfilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacamento.lg,
    paddingTop: espacamento.sm,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
    marginRight: espacamento.md,
  },
  perfilInfo: { flex: 1 },
  perfilNome: {
    fontSize: 24,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },
  perfilSub: {
    fontSize: 14,
    color: cores.cinzaTexto,
  },

  // Resumo Horizontal
  resumoHorizontal: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: espacamento.xl,
  },
  cardMini: {
    flex: 1,
    backgroundColor: cores.fundoCard,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  cardMiniValor: {
    fontSize: 16,
    fontWeight: tipografia.bold,
    color: cores.primario,
    marginBottom: 2,
  },
  cardMiniLabel: {
    fontSize: 10,
    color: cores.cinzaTexto,
    textTransform: 'uppercase',
    fontWeight: '700',
  },

  secao: {
    backgroundColor: cores.fundoCard,
    borderRadius: 20,
    padding: espacamento.lg,
    marginBottom: espacamento.lg,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
    ...sombras.pequena,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacamento.lg,
  },
  secaoIconeContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },

  gridInputs: { flexDirection: 'row' },
  campo: { marginBottom: espacamento.md },
  campoLabel: {
    fontSize: 13,
    color: cores.cinzaTexto,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  botaoModo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  botaoModoAtivo: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderColor: cores.primario,
  },
  botaoModoTexto: {
    color: cores.cinzaTexto,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoModoTextoAtivo: {
    color: cores.primario,
  },
  inputGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    flex: 1,
    color: cores.branco,
    fontSize: 16,
    fontWeight: '600',
  },
  inputPrefixo: { color: cores.cinzaTexto, marginRight: 4, fontWeight: '600' },
  inputSufixo: { color: cores.cinzaTexto, marginLeft: 4, fontWeight: '600' },

  baseEndereco: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  baseIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  baseTitulo: { color: cores.texto, fontWeight: 'bold', fontSize: 14 },
  baseSub: { color: cores.cinzaTexto, fontSize: 12 },

  linhaNotif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  descricao: { fontSize: 13, color: cores.cinzaTexto, lineHeight: 18 },
  dica: {
    fontSize: 11,
    color: cores.cinzaTexto,
    marginTop: 4,
    opacity: 0.6,
  },

  footerAcoes: { marginTop: espacamento.md, marginBottom: espacamento.xl },
  botaoSalvar: {
    backgroundColor: cores.primario,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    ...sombras.grande,
  },
  botaoSalvarTexto: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  botaoTesteDiscreto: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.4,
  },
  botaoTesteTexto: { color: cores.cinzaTexto, fontSize: 12 },
  versao: { textAlign: 'center', fontSize: 10, color: cores.cinzaTexto, opacity: 0.5 },
});
