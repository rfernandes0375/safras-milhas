/**
 * theme.js — Design system do app
 * Paleta azul + cinza, tipografia e espaçamentos
 */

export const cores = {
  // Tema Dark Neon (Baseado no Print de Análise de Vendas)
  primario: '#00D2FF', // Cyan brilhante (títulos e destaques)
  primarioClaro: 'rgba(0, 210, 255, 0.15)',
  primarioEscuro: '#0097B8',
  primarioFundo: '#1A212E', // Fundo de ícones

  sucesso: '#10B981', // Verde brilhante (valores positivos)
  sucessoClaro: 'rgba(16, 185, 129, 0.15)',
  erro: '#F43F5E', // Rosa/Vermelho brilhante
  erroClaro: 'rgba(244, 63, 94, 0.15)',
  aviso: '#F59E0B',

  cinzaFundo: '#0B0F19', // Fundo bem escuro (fundo da tela principal)
  fundoCard: '#141B2D', // Fundo dos cards (substitui o antigo branco)
  cinzaClaro: '#1E293B', // Bordas e elementos inativos
  cinzaMedio: '#334155', // Divisores
  cinzaTexto: '#8C9BB3', // Texto secundário
  cinzaEscuro: '#64748B',

  texto: '#FFFFFF', // Texto principal
  textoSecundario: '#8C9BB3',
  branco: '#FFFFFF', // Restaurado para branco
  preto: '#000000',

  // Swipe colors
  swipeDireita: '#10B981',
  swipeEsquerda: '#334155',
};

export const tipografia = {
  // Família
  familia: 'System',

  // Tamanhos
  micro: 11,
  pequeno: 13,
  normal: 15,
  medio: 17,
  grande: 20,
  titulo: 24,
  display: 32,
  hero: 42,

  // Pesos
  regular: '400',
  medio: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export const espacamento = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const bordas = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 100,
};

export const sombras = {
  pequena: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  media: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  grande: {
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 10,
  },
};
