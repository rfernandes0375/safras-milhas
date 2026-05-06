/**
 * notifications.js — Serviço de notificações semanais
 * Agenda lembrete toda sexta-feira às 17h para triagem
 */

import * as Notifications from 'expo-notifications';

/**
 * Agenda notificação semanal recorrente (sexta-feira)
 * @param {number} hora - hora de disparo (padrão: 17)
 * @param {number} pendentes - quantidade de trajetos pendentes (para o texto)
 */
export const agendarNotificacaoSemanal = async (hora = 17, pendentes = 0) => {
  // Cancela notificação anterior antes de reagendar
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Safras Milhas',
      body: pendentes > 0
        ? `Você tem ${pendentes} trajeto${pendentes > 1 ? 's' : ''} para classificar. Leva menos de 1 minuto!`
        : 'Hora de verificar seus trajetos da semana!',
      sound: false,
      data: { tipo: 'triagem_semanal' },
    },
    trigger: {
      // Dispara toda sexta (weekday=6 no iOS), na hora configurada
      weekday: 6, // 1=Dom, 7=Sab (iOS usa 1-indexed)
      hour: hora,
      minute: 0,
      repeats: true,
    },
  });

  console.log(`[Notifications] Notificação semanal agendada: sexta às ${hora}h`);
};
