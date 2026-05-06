/**
 * RelatorioScreen.js — Tela de Relatório e Exportação PDF (Tela 5)
 * Gera PDF com lista de viagens do mês e opção de compartilhamento
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora, formatarMes } from '../utils/calculos';

export default function RelatorioScreen({ navigation }) {
  const { viagensConfirmadas, mesAtual, totalKmMes, totalReembolsoMes, config } = useApp();
  const [gerando, setGerando] = useState(false);

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const html = gerarHTML(viagensConfirmadas, mesAtual, totalKmMes, totalReembolsoMes, config);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const podeCompartilhar = await Sharing.isAvailableAsync();
      if (podeCompartilhar) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Relatório ${formatarMes(mesAtual)}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF gerado!', `Arquivo salvo em: ${uri}`);
      }
    } catch (error) {
      console.error('[Relatorio] Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const mesFormatado = formatarMes(mesAtual);

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.cinzaFundo} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>

        {/* Header */}
        <View style={estilos.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoVoltar}>
            <Ionicons name="arrow-back" size={22} color={cores.texto} />
          </TouchableOpacity>
          <Text style={estilos.headerTitulo}>Relatório</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Card de prévia */}
        <View style={estilos.cardPrevia}>
          <View style={estilos.cardPreviaIcone}>
            <Ionicons name="document-text" size={32} color={cores.primario} />
          </View>
          <Text style={estilos.cardPreviaTitulo}>Relatório de {mesFormatado}</Text>
          <Text style={estilos.cardPreviaSub}>Safras & Cifras — Reembolso de Combustível</Text>

          <View style={estilos.cardPreviaDivisor} />

          <View style={estilos.cardPreviaStats}>
            <View style={estilos.stat}>
              <Text style={estilos.statValor}>{viagensConfirmadas.length}</Text>
              <Text style={estilos.statLabel}>viagens</Text>
            </View>
            <View style={estilos.statDivisor} />
            <View style={estilos.stat}>
              <Text style={estilos.statValor}>{formatarKm(totalKmMes)}</Text>
              <Text style={estilos.statLabel}>percorridos</Text>
            </View>
            <View style={estilos.statDivisor} />
            <View style={estilos.stat}>
              <Text style={[estilos.statValor, { color: cores.primario }]}>
                {formatarMoeda(totalReembolsoMes)}
              </Text>
              <Text style={estilos.statLabel}>a reembolsar</Text>
            </View>
          </View>
        </View>

        {/* O que será incluído */}
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Conteúdo do relatório</Text>
          {[
            'Cabeçalho com nome e período',
            'Lista completa de viagens de trabalho',
            'Origem, destino, horário e km por viagem',
            'Valor de reembolso por viagem',
            'Total de km e valor do mês',
            'Configuração usada no cálculo',
          ].map((item, i) => (
            <View key={i} style={estilos.checkItem}>
              <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
              <Text style={estilos.checkTexto}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Aviso se não tiver viagens */}
        {viagensConfirmadas.length === 0 && (
          <View style={estilos.aviso}>
            <Ionicons name="information-circle-outline" size={20} color={cores.aviso} />
            <Text style={estilos.avisoTexto}>
              Não há viagens confirmadas em {mesFormatado}. Classifique os trajetos pendentes antes de exportar.
            </Text>
          </View>
        )}

        {/* Botão de exportar */}
        <TouchableOpacity
          style={[estilos.botaoExportar, (gerando || viagensConfirmadas.length === 0) && estilos.botaoDesabilitado]}
          onPress={gerarPDF}
          disabled={gerando || viagensConfirmadas.length === 0}
          activeOpacity={0.8}
        >
          {gerando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <>
              <Ionicons name="share-outline" size={22} color={cores.branco} />
              <Text style={estilos.botaoExportarTexto}>Exportar PDF</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Geração do HTML do PDF ───────────────────────────────────────────────────
const gerarHTML = (viagens, mes, totalKm, totalValor, config) => {
  const mesFormatado = formatarMes(mes);
  const modoCalculo = config?.modoCalculo === 'valor_km'
    ? `R$ ${config.valorPorKm}/km`
    : `${config?.consumoMedio} km/L × R$ ${config?.precoCombustivel}/L`;

  const linhasViagens = viagens.map((v, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : '#fff'}">
      <td>${formatarData(v.inicio)}</td>
      <td>${formatarHora(v.inicio)} – ${formatarHora(v.fim)}</td>
      <td>${v.localInicio || '—'}</td>
      <td>${v.localFim || '—'}</td>
      <td style="text-align:center">${formatarKm(v.distanciaKm)}</td>
      <td style="text-align:right;color:#1A73E8;font-weight:600">${formatarMoeda(v.valor)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Quilometragem — ${mesFormatado}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, Arial, sans-serif; color: #202124; padding: 40px; }
        .header { border-bottom: 3px solid #1A73E8; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; color: #1A73E8; margin-bottom: 4px; }
        .header p { color: #5F6368; font-size: 14px; }
        .totais { display: flex; gap: 20px; margin-bottom: 30px; }
        .total-card { flex: 1; background: #f8f9fa; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e0e0e0; }
        .total-card .valor { font-size: 22px; font-weight: 700; color: #1A73E8; }
        .total-card .label { font-size: 12px; color: #5F6368; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        th { background: #1A73E8; color: white; padding: 10px 12px; text-align: left; }
        td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
        .footer { font-size: 12px; color: #9E9E9E; border-top: 1px solid #e0e0e0; padding-top: 16px; }
        .modo { font-size: 12px; color: #5F6368; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatório de Quilometragem</h1>
        <p>Safras &amp; Cifras Goiânia · ${mesFormatado}</p>
      </div>

      <div class="totais">
        <div class="total-card">
          <div class="valor">${viagens.length}</div>
          <div class="label">Viagens de trabalho</div>
        </div>
        <div class="total-card">
          <div class="valor">${formatarKm(totalKm)}</div>
          <div class="label">Total percorrido</div>
        </div>
        <div class="total-card">
          <div class="valor" style="color:#34A853">${formatarMoeda(totalValor)}</div>
          <div class="label">Total a reembolsar</div>
        </div>
      </div>

      <p class="modo">Cálculo: ${modoCalculo}</p>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Horário</th>
            <th>Origem</th>
            <th>Destino</th>
            <th style="text-align:center">Km</th>
            <th style="text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>${linhasViagens}</tbody>
      </table>

      <div class="footer">
        Gerado pelo app Safras Milhas · ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
      </div>
    </body>
    </html>
  `;
};

// ─── Estilos ─────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.cinzaFundo },
  scroll: { paddingBottom: espacamento.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espacamento.md,
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.fundoCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  headerTitulo: {
    fontSize: tipografia.titulo,
    fontWeight: tipografia.bold,
    color: cores.texto,
  },

  cardPrevia: {
    marginHorizontal: espacamento.md,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.xl,
    padding: espacamento.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
    marginBottom: espacamento.md,
  },
  cardPreviaIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: cores.primarioFundo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacamento.sm,
  },
  cardPreviaTitulo: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.bold,
    color: cores.texto,
    marginBottom: 4,
  },
  cardPreviaSub: {
    fontSize: tipografia.pequeno,
    color: cores.cinzaTexto,
    textAlign: 'center',
  },
  cardPreviaDivisor: {
    width: '100%',
    height: 1,
    backgroundColor: cores.cinzaClaro,
    marginVertical: espacamento.md,
  },
  cardPreviaStats: {
    flexDirection: 'row',
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValor: {
    fontSize: tipografia.medio,
    fontWeight: tipografia.bold,
    color: cores.texto,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: tipografia.micro,
    color: cores.cinzaTexto,
  },
  statDivisor: {
    width: 1,
    backgroundColor: cores.cinzaClaro,
  },

  secao: {
    marginHorizontal: espacamento.md,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.lg,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: cores.cinzaClaro,
  },
  secaoTitulo: {
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingVertical: 5,
  },
  checkTexto: {
    fontSize: tipografia.pequeno,
    color: cores.textoSecundario,
  },

  aviso: {
    marginHorizontal: espacamento.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: bordas.md,
    padding: espacamento.md,
    flexDirection: 'row',
    gap: espacamento.sm,
    alignItems: 'flex-start',
    marginBottom: espacamento.md,
    borderLeftWidth: 3,
    borderLeftColor: cores.aviso,
  },
  avisoTexto: {
    flex: 1,
    fontSize: tipografia.pequeno,
    color: '#FCD34D',
    lineHeight: 20,
  },

  botaoExportar: {
    marginHorizontal: espacamento.md,
    backgroundColor: cores.primario,
    borderRadius: bordas.lg,
    paddingVertical: espacamento.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacamento.sm,
    ...sombras.grande,
  },
  botaoDesabilitado: {
    backgroundColor: cores.cinzaTexto,
    ...sombras.pequena,
  },
  botaoExportarTexto: {
    color: cores.branco,
    fontSize: tipografia.normal,
    fontWeight: tipografia.semibold,
  },
});
