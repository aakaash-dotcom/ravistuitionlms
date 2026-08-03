import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || appId.trim() === '') {
    console.warn('OneSignal: VITE_ONESIGNAL_APP_ID is not set in .env');
    return;
  }
  if (initialized) return;
  initialized = true;
  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
        position: 'bottom-right',
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
    initialized = false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || appId.trim() === '') {
    alert('Please add VITE_ONESIGNAL_APP_ID to your .env file or Vercel Environment Variables to enable push notifications.');
    return false;
  }
  try {
    if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
      const permission = await OneSignal.Notifications.requestPermission();
      return permission;
    } else if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) {
      await OneSignal.Slidedown.promptPush();
      return true;
    }
  } catch (e) {
    console.error('OneSignal permission request failed:', e);
  }
  return false;
}

export function getNotificationPermission(): boolean {
  try {
    return !!(OneSignal.Notifications && OneSignal.Notifications.permission);
  } catch {
    return false;
  }
}

export async function linkUserToNotification(phoneOrRoll: string) {
  try {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId || !phoneOrRoll) return;
    if (OneSignal.login) {
      await OneSignal.login(phoneOrRoll);
    }
  } catch (e) {
    console.warn('OneSignal login error:', e);
  }
}
