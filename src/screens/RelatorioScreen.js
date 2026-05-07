/**
 * RelatorioScreen.js — Tela de Relatório e Exportação PDF (Tela 5)
 * Gera PDF com lista de viagens do mês e opção de compartilhamento
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert, Platform, Linking,
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

      if (Platform.OS === 'web') {
        // No navegador, criamos um Blob e abrimos em nova aba para imprimir apenas o relatório
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.onload = () => {
            win.print();
            URL.revokeObjectURL(url);
          };
        } else {
          Alert.alert('Bloqueador de Pop-ups', 'Por favor, permita pop-ups para visualizar o relatório.');
        }
      } else {
        // No celular (iOS/Android), gera o arquivo PDF real
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
      }
    } catch (error) {
      console.error('[Relatorio] Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    } finally {
      setGerando(false);
    }
  };

  const compartilharWhatsApp = async () => {
    const mesFormatado = formatarMes(mesAtual);
    const totalReembolso = formatarMoeda(totalReembolsoMes);
    const totalKm = formatarKm(totalKmMes);

    let mensagem = `*Relatório de Quilometragem - ${mesFormatado}*\n`;
    mensagem += `_Safras & Cifras_\n\n`;
    mensagem += `📊 *Resumo:*\n`;
    mensagem += `• Viagens: ${viagensConfirmadas.length}\n`;
    mensagem += `• Distância: ${totalKm}\n`;
    mensagem += `• Reembolso: *${totalReembolso}*\n\n`;
    mensagem += `🚗 *Detalhes:*\n`;

    viagensConfirmadas.forEach(v => {
      const data = formatarData(v.inicio);
      const desc = v.descricao ? ` (${v.descricao})` : '';
      mensagem += `• ${data}: ${v.localInicio} → ${v.localFim}${desc} - ${formatarKm(v.distanciaKm)}\n`;
    });

    const url = `whatsapp://send?text=${encodeURIComponent(mensagem)}`;
    const urlWeb = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    try {
      const podeAbrir = await Linking.canOpenURL(url);
      if (podeAbrir) {
        await Linking.openURL(url);
      } else {
        // Fallback para WhatsApp Web se o app não estiver instalado ou for navegador
        await Linking.openURL(urlWeb);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
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
            'Descrição detalhada da viagem',
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

        {/* Botão de exportar PDF */}
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
              <Ionicons name="document-outline" size={22} color={cores.branco} />
              <Text style={estilos.botaoExportarTexto}>Exportar PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botão de WhatsApp */}
        <TouchableOpacity
          style={[estilos.botaoWhatsApp, (viagensConfirmadas.length === 0) && estilos.botaoDesabilitado]}
          onPress={compartilharWhatsApp}
          disabled={viagensConfirmadas.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={22} color={cores.branco} />
          <Text style={estilos.botaoExportarTexto}>Enviar via WhatsApp</Text>
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
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
      <td class="col-data">${formatarData(v.inicio)}</td>
      <td class="col-hora">${formatarHora(v.inicio)} – ${formatarHora(v.fim)}</td>
      <td class="col-trajeto">${v.localInicio || '—'} <br/> <small>até</small> ${v.localFim || '—'}</td>
      <td class="col-desc">${v.descricao || '<span class="empty">—</span>'}</td>
      <td class="col-km">${formatarKm(v.distanciaKm)}</td>
      <td class="col-valor">${formatarMoeda(v.valor)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 1.0cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding-top: 50px; }
        
        .debug-header { position: absolute; top: 0; left: 0; right: 0; background: #FF3B30; color: white; text-align: center; font-size: 10px; padding: 5px; font-weight: bold; }

        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px; }
        .header-title h1 { font-size: 24px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .header-title p { font-size: 14px; color: #64748b; font-weight: 500; }
        .header-date { text-align: right; font-size: 13px; color: #64748b; }

        .totais { display: flex; gap: 16px; margin-bottom: 30px; }
        .total-card { flex: 1; background: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
        .total-card .valor { font-size: 22px; font-weight: 800; color: #0891b2; display: block; }
        .total-card .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px; }

        .modo-box { font-size: 12px; color: #475569; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border-left: 5px solid #0891b2; margin-bottom: 25px; display: inline-block; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 11px; }
        th { background: #0891b2; color: white; padding: 14px 10px; text-align: left; text-transform: uppercase; font-weight: 700; font-size: 10px; letter-spacing: 0.5px; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        
        .col-data { width: 90px; font-weight: 600; }
        .col-hora { width: 100px; color: #64748b; }
        .col-trajeto { width: 200px; font-weight: 500; }
        .col-trajeto small { color: #94a3b8; font-size: 9px; text-transform: uppercase; }
        .col-desc { font-style: italic; color: #334155; min-width: 150px; }
        .col-km { width: 60px; text-align: center; font-weight: 600; }
        .col-valor { width: 100px; text-align: right; font-weight: 700; color: #0891b2; }
        .empty { color: #cbd5e1; }

        .footer { border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
        .footer strong { color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>Relatório de Quilometragem</h1>
          <p>Safras &amp; Cifras Goiânia</p>
        </div>
        <div class="header-date">
          <strong>Período:</strong> ${mesFormatado}<br/>
          <strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      <div class="totais">
        <div class="total-card">
          <span class="valor">${viagens.length}</span>
          <span class="label">Viagens confirmadas</span>
        </div>
        <div class="total-card">
          <span class="valor">${formatarKm(totalKm)}</span>
          <span class="label">Distância total</span>
        </div>
        <div class="total-card">
          <span class="valor" style="color: #10b981">${formatarMoeda(totalValor)}</span>
          <span class="label">Valor a reembolsar</span>
        </div>
      </div>

      <div class="modo-box">
        <strong>Método de cálculo:</strong> ${modoCalculo}
      </div>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Horário</th>
            <th>Itinerário</th>
            <th>Descrição/Motivo</th>
            <th style="text-align:center">Km</th>
            <th style="text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>${linhasViagens}</tbody>
      </table>

      <div class="footer">
        Este documento é um registro oficial de deslocamentos para fins de reembolso.<br/>
        Gerado pelo sistema <strong>Safras Milhas v1.0.5</strong>
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
    marginBottom: espacamento.sm,
  },
  botaoWhatsApp: {
    marginHorizontal: espacamento.md,
    backgroundColor: '#25D366',
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
