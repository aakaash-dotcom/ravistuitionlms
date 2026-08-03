import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || initialized) return;
  initialized = true;
  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
        position: 'bottom-right',
        displayPredicate: () => true,
        prenotify: true,
        showCredit: false,
        text: {
          'tip.state.unsubscribed': 'Subscribe to notifications',
          'tip.state.subscribed': "You're subscribed to notifications",
          'tip.state.blocked': "You've blocked notifications",
          'message.prenotify': 'Click to subscribe to notifications',
          'message.action.subscribed': 'Thanks for subscribing!',
          'message.action.subscribing': 'Subscribing...',
          'message.action.resubscribed': "You're subscribed to notifications",
          'message.action.unsubscribed': "You won't receive notifications again",
          'dialog.main.title': 'Manage Notifications',
          'dialog.main.button.subscribe': 'SUBSCRIBE',
          'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
          'dialog.blocked.title': 'Unblock Notifications',
          'dialog.blocked.message': 'Follow these instructions to allow notifications:',
        },
      },
    });
  } catch (e) {
    console.warn('OneSignal init error:', e);
  }
}

export async function linkUserToNotification(id: string) {
  try {
    await OneSignal.login(id);
  } catch (e) {
    console.warn('OneSignal login error:', e);
  }
}

export async function promptNotificationPermission() {
  try {
    await OneSignal.Notifications.requestPermission();
  } catch (e) {
    console.warn('OneSignal permission error:', e);
  }
}
