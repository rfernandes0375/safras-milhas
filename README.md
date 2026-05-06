# Safras Milhas 🚗

App de rastreamento passivo de quilometragem para reembolso corporativo.  
Desenvolvido para **Safras & Cifras Goiânia** · iPhone (iOS) · React Native + Expo

---

## 🏗 Estrutura do Projeto

```
SafrasMilhas/
├── App.js                          # Ponto de entrada + navegação
├── app.json                        # Config Expo (permissões iOS, background location)
├── src/
│   ├── context/
│   │   └── AppContext.js           # Estado global (Context API)
│   ├── screens/
│   │   ├── DashboardScreen.js      # Tela 1: Dashboard principal
│   │   ├── TriagemScreen.js        # Tela 2: Swipe de classificação
│   │   ├── HistoricoScreen.js      # Tela 3: Histórico mensal
│   │   ├── ConfiguracoesScreen.js  # Tela 4: Configurações
│   │   └── RelatorioScreen.js      # Tela 5: Exportação PDF
│   ├── services/
│   │   ├── tracking.js             # ⚡ Rastreamento em segundo plano (GPS)
│   │   ├── database.js             # Persistência local SQLite
│   │   ├── geocoding.js            # Geocodificação reversa
│   │   └── notifications.js        # Notificações semanais
│   └── utils/
│       ├── calculos.js             # Haversine, reembolso, formatação
│       └── theme.js                # Design system (cores, tipografia)
```

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- Expo Go instalado no iPhone
- Conta Expo (para builds)

### Instalação
```bash
cd SafrasMilhas
npm install
npx expo start
```

Escaneie o QR Code com a câmera do iPhone → abre no Expo Go.

---

## ⚠️ Limitação Importante: Background Location no Expo Go

O **rastreamento em segundo plano** (GPS contínuo com app fechado) **não funciona no Expo Go**.  
Para testar o rastreamento real, é necessário um **build de desenvolvimento**:

```bash
# Instala o EAS CLI
npm install -g eas-cli

# Login na sua conta Expo
eas login

# Cria build de desenvolvimento para iOS
eas build --platform ios --profile development
```

O Dashboard, Triagem, Histórico, Configurações e PDF funcionam normalmente no Expo Go.

---

## 🧠 Lógica de Rastreamento

```
GPS em segundo plano (expo-location)
    ↓
Ponto GPS recebido a cada 50m ou 30s
    ↓
Velocidade > 20 km/h?  →  INICIA VIAGEM
    ↓
Velocidade < 2 km/h por 2 minutos?  →  FINALIZA VIAGEM
    ↓
Distância total < 500m?  →  DESCARTA
    ↓
Geocodificação reversa (início + fim)
    ↓
Pré-classifica: dia útil + 08h–18h + base Safras?  →  "Provável trabalho"
    ↓
Salva no SQLite (local, sem servidor)
```

---

## 📐 Configurações Padrão

| Parâmetro | Padrão |
|---|---|
| Velocidade mínima | 20 km/h |
| Distância mínima | 500m |
| Tempo parado p/ finalizar | 2 minutos |
| Raio do geofence | 300m |
| Consumo médio | 10 km/L |
| Preço combustível | R$ 6,50/L |
| Notificação semanal | Sexta · 17h |

**Base georreferenciada:**  
Safras & Cifras — Av. Olinda, 960 (Park Lozandes, Goiânia-GO)  
Coordenadas: -16.6704, -49.2552

---

## 📦 Dependências Principais

| Pacote | Uso |
|---|---|
| `expo-location` | GPS em segundo plano |
| `expo-sqlite` | Banco local |
| `expo-print` + `expo-sharing` | Geração e exportação de PDF |
| `expo-notifications` | Notificação semanal |
| `expo-haptics` | Feedback tátil no swipe |
| `@react-navigation/bottom-tabs` | Navegação por abas |
| `react-native-gesture-handler` | Gestos de swipe |

---

## 🔒 Permissões iOS Necessárias

- **Localização "Sempre"** — rastreamento em segundo plano
- **Notificações** — lembrete semanal
- **Movimento/Atividade** — detecção de modo de transporte

Todas configuradas em `app.json` → `ios.infoPlist`.
