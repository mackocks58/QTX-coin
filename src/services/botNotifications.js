import { LocalNotifications } from '@capacitor/local-notifications';

export const scheduleBotNotifications = async (bot) => {
  try {
    // Ensure permissions
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        console.log('Notification permissions denied.');
        return;
      }
    }

    // bot.activationId can serve as the base numeric ID
    const baseId = parseInt(bot.activationId.slice(-6), 10) || Math.floor(Math.random() * 100000);
    const id13 = baseId + 1; // ID for 13 hours remaining
    const id2 = baseId + 2; // ID for 2 hours remaining

    // Cancel existing ones if re-scheduling
    await LocalNotifications.cancel({ notifications: [{ id: id13 }, { id: id2 }] });

    const now = new Date();
    // 13 hours remaining means 11 hours after activation cycle
    const alert13 = new Date(now.getTime() + 11 * 60 * 60 * 1000);
    // 2 hours remaining means 22 hours after activation cycle
    const alert2 = new Date(now.getTime() + 22 * 60 * 60 * 1000);

    const amountInvested = parseFloat(bot.userAmount || 0);
    const dailyProfit = ((amountInvested * bot.dailyPercent) / 100).toFixed(2);
    
    // Resolve full URL for the attachment if it's a relative path
    // In production, the bot.image might be something like "/images/bot1.png"
    // Capacitor local notifications sometimes require full URLs or file URIs.
    // We will pass the image directly.
    const imageUri = bot.image.startsWith('http') 
      ? bot.image 
      : window.location.origin + bot.image;

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "AI Mining Update ⚡",
          body: `13 hours remaining to mine $${dailyProfit} from your $${amountInvested.toLocaleString()} ${bot.name} session.`,
          id: id13,
          schedule: { at: alert13, every: 'day' },
          smallIcon: "ic_stat_icon_config_sample", // Standard Capacitor fallback
          iconColor: "#d4af37",
          largeIcon: imageUri,
          attachments: [
            { id: `img_${id13}`, url: imageUri }
          ]
        },
        {
          title: "AI Mining Almost Complete! 🚀",
          body: `Only 2 hours remaining to mine $${dailyProfit} from your $${amountInvested.toLocaleString()} ${bot.name} session!`,
          id: id2,
          schedule: { at: alert2, every: 'day' },
          smallIcon: "ic_stat_icon_config_sample",
          iconColor: "#10b981",
          largeIcon: imageUri,
          attachments: [
            { id: `img_${id2}`, url: imageUri }
          ]
        }
      ]
    });
    
    console.log(`Scheduled notifications for bot: ${bot.name}`);
  } catch (err) {
    console.error('Failed to schedule bot notifications:', err);
  }
};
