/**
 * RelatorioScreen.js — Tela de Relatório e Exportação PDF (Tela 5)
 * Gera PDF com lista de viagens do mês e opção de compartilhamento
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert, Platform, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../context/AppContext';
import { cores, tipografia, espacamento, bordas, sombras } from '../utils/theme';
import { formatarMoeda, formatarKm, formatarData, formatarHora, formatarMes } from '../utils/calculos';

export default function RelatorioScreen({ navigation, route }) {
  const { 
    viagensConfirmadas: todasViagens, mesAtual, 
    totalKmMes: totalKmPadrao, totalReembolsoMes: totalReembolsoPadrao, config 
  } = useApp();
  
  const [gerando, setGerando] = useState(false);

  // Se houver viagens customizadas vindas da seleção, usa elas. Caso contrário, todas do mês.
  const viagens = route.params?.viagensCustom || todasViagens;
  
  const totalKm = route.params?.viagensCustom 
    ? viagens.reduce((sum, v) => sum + v.distanciaKm, 0)
    : totalKmPadrao;
    
  const totalReembolso = route.params?.viagensCustom
    ? viagens.reduce((sum, v) => sum + v.valor, 0)
    : totalReembolsoPadrao;

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const html = gerarHTML(viagens, mesAtual, totalKm, totalReembolso, config);

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
    const msgReembolso = formatarMoeda(totalReembolso);
    const msgKm = formatarKm(totalKm);

    let mensagem = `🏢 *SAFRAS & CIFRAS*\n`;
    mensagem += `📊 *Relatório de Quilometragem - ${mesFormatado}*\n\n`;
    mensagem += `📊 *Resumo:*\n`;
    mensagem += `• Viagens: ${viagens.length}\n`;
    mensagem += `• Distância: ${msgKm}\n`;
    const totalLitros = config?.modoCalculo === 'consumo' ? (totalKm / (config.consumoMedio || 1)).toFixed(1) : null;
    if (totalLitros) {
      mensagem += `• Consumo: ${totalLitros} Litros\n`;
    }
    mensagem += `• Reembolso: *${msgReembolso}*\n\n`;
    mensagem += `🚗 *Detalhes:*\n`;

    viagens.slice(0, 15).forEach(v => {
      const data = formatarData(v.inicio);
      const desc = v.descricao ? ` (${v.descricao})` : '';
      mensagem += `• ${data}: ${v.localInicio} → ${v.localFim}${desc} - ${formatarKm(v.distanciaKm)}\n`;
    });

    if (viagens.length > 15) {
      mensagem += `\n...e mais ${viagens.length - 15} trajetos (veja PDF completo).`;
    }

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

        {/* Card de prévia (Simulação de Documento) */}
        <View style={estilos.folhaDocumento}>
          <View style={estilos.documentoHeader}>
            <Image 
              source={{ uri: 'https://s.criacaostatic.cc/safrasecifraswng5tdg0/uploads/elementor/thumbs/Logo-Safras-Cifras_Preto-scaled-rjjysb7a3posnup5alh9kcof83jcfvb2evxnsvanbo.png' }}
              style={{ width: 140, height: 45 }}
              resizeMode="contain"
            />
          </View>

          <Text style={estilos.documentoTitulo}>Relatório Mensal</Text>
          <Text style={estilos.documentoSub}>Competência: <Text style={{ fontWeight: 'bold' }}>{mesFormatado}</Text></Text>

          <View style={estilos.documentoDivisor} />

          <View style={estilos.documentoCorpo}>
            <View style={estilos.documentoRow}>
              <Text style={estilos.documentoLabel}>Quilometragem Total</Text>
              <Text style={estilos.documentoValor}>{formatarKm(totalKm)}</Text>
            </View>
            
            {config?.modoCalculo === 'consumo' && (
              <View style={estilos.documentoRow}>
                <Text style={estilos.documentoLabel}>Consumo Estimado</Text>
                <Text style={estilos.documentoValor}>{(totalKm / (config.consumoMedio || 1)).toFixed(1)}L</Text>
              </View>
            )}

            <View style={[estilos.documentoRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEEEEE' }]}>
              <Text style={[estilos.documentoLabel, { color: cores.texto, fontWeight: 'bold' }]}>TOTAL REEMBOLSO</Text>
              <Text style={[estilos.documentoValor, { color: cores.sucesso, fontSize: 20 }]}>
                {formatarMoeda(totalReembolso)}
              </Text>
            </View>
          </View>

          <View style={estilos.documentoSelo}>
            <Ionicons name="ribbon-outline" size={24} color="rgba(0,0,0,0.1)" />
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
        {viagens.length === 0 && (
          <View style={estilos.aviso}>
            <Ionicons name="information-circle-outline" size={20} color={cores.aviso} />
            <Text style={estilos.avisoTexto}>
              Não há trajetos para exportar.
            </Text>
          </View>
        )}

        {/* Botão de exportar PDF */}
        <TouchableOpacity
          style={[estilos.botaoExportar, (gerando || viagens.length === 0) && estilos.botaoDesabilitado]}
          onPress={gerarPDF}
          disabled={gerando || viagens.length === 0}
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
          style={[estilos.botaoWhatsApp, (viagens.length === 0) && estilos.botaoDesabilitado]}
          onPress={compartilharWhatsApp}
          disabled={viagens.length === 0}
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
  const totalLitros = config?.modoCalculo === 'consumo' ? (totalKm / (config.consumoMedio || 1)).toFixed(2) : null;
  
  const modoCalculoDesc = config?.modoCalculo === 'valor_km'
    ? `<strong>R$ ${config.valorPorKm}/km</strong>`
    : `<strong>${config?.consumoMedio} km/L</strong> (R$ ${config?.precoCombustivel}/L)`;

  const resumoMetodo = config?.modoCalculo === 'consumo'
    ? `Consumo estimado de <strong>${totalLitros} litros</strong> para o período.`
    : `Cálculo baseado em valor fixo por quilômetro rodado.`;

  const linhasViagens = viagens.map((v, i) => `
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
      <td class="col-data">${formatarData(v.inicio)}</td>
      <td class="col-hora">${formatarHora(v.inicio)} - ${formatarHora(v.fim)}</td>
      <td class="col-trajeto">${v.localInicio || '—'} <strong>&rarr;</strong> ${v.localFim || '—'}</td>
      <td class="col-desc">${v.descricao || '<span class="empty">—</span>'}</td>
      <td class="col-km">${formatarKm(v.distanciaKm).replace('\n', ' ')}</td>
      <td class="col-valor">${formatarMoeda(v.valor)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 1.0cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding-top: 30px; }
        
        .debug-header { position: absolute; top: 0; left: 0; right: 0; background: #FF3B30; color: white; text-align: center; font-size: 10px; padding: 5px; font-weight: bold; }

        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0891b2; padding-bottom: 15px; margin-bottom: 25px; }
        .header-title h1 { font-size: 28px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .header-title p { font-size: 16px; color: #64748b; font-weight: 500; }
        .header-date { text-align: right; font-size: 14px; color: #64748b; }

        .totais { display: flex; gap: 20px; margin-bottom: 25px; }
        .total-card { flex: 1; background: #f1f5f9; border-radius: 12px; padding: 18px; text-align: center; border: 1px solid #e2e8f0; }
        .total-card .valor { font-size: 24px; font-weight: 800; color: #0891b2; display: block; }
        .total-card .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px; }

        .modo-box { font-size: 13px; color: #475569; background: #f8fafc; padding: 12px 18px; border-radius: 8px; border-left: 5px solid #0891b2; margin-bottom: 20px; display: inline-block; }

        .logo-pdf {
          display: block;
          margin-bottom: 8px;
        }

        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; table-layout: fixed; }
        th { background: #0891b2; color: white; padding: 12px 10px; text-align: left; text-transform: uppercase; font-weight: 700; font-size: 10px; letter-spacing: 0.5px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; word-wrap: break-word; }
        
        .col-data { width: 75px; white-space: nowrap; }
        .col-hora { width: 95px; white-space: nowrap; color: #64748b; }
        .col-trajeto { width: 40%; font-weight: 600; font-size: 8.5px; }
        .col-desc { width: 30%; font-style: italic; color: #334155; font-size: 8.5px; }
        .col-km { width: 65px; text-align: center; font-weight: 700; white-space: nowrap; }
        .col-valor { width: 90px; text-align: right; font-weight: 800; color: #0891b2; white-space: nowrap; }
        .empty { color: #cbd5e1; }

        .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 5.5px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <img 
            src="https://s.criacaostatic.cc/safrasecifraswng5tdg0/uploads/elementor/thumbs/Logo-Safras-Cifras_Preto-scaled-rjjysb7a3posnup5alh9kcof83jcfvb2evxnsvanbo.png" 
            width="110"
            class="logo-pdf" 
          />
          <p>Relatório de Reembolso de Combustível</p>
        </div>
        <div class="header-date">
          <strong>Período:</strong> ${mesFormatado}<br/>
          <strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      <div class="totais">
        <div class="total-card">
          <span class="valor">${viagens.length}</span>
          <span class="label">Viagens</span>
        </div>
        <div class="total-card">
          <span class="valor">${formatarKm(totalKm)}</span>
          <span class="label">Distância</span>
        </div>
        ${totalLitros ? `
        <div class="total-card">
          <span class="valor">${totalLitros} L</span>
          <span class="label">Combustível</span>
        </div>
        ` : ''}
        <div class="total-card">
          <span class="valor" style="color: #10b981">${formatarMoeda(totalValor)}</span>
          <span class="label">Reembolso</span>
        </div>
      </div>

      <div class="modo-box">
        Método: ${modoCalculoDesc}<br/>
        ${resumoMetodo}
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
        Este documento é um registro de deslocamentos para fins de reembolso. Gerado pelo sistema Safras Milhas v1.0.5 desenvolvido por Rodrigo Ferreira
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

  folhaDocumento: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    marginHorizontal: espacamento.md,
    marginBottom: 24,
    ...sombras.grande,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  documentoHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  documentoTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  documentoSub: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  documentoDivisor: {
    height: 2,
    backgroundColor: cores.primario,
    width: 40,
    marginBottom: 20,
  },
  documentoCorpo: {
    gap: 8,
  },
  documentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentoLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentoValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  documentoSelo: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    opacity: 0.5,
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
