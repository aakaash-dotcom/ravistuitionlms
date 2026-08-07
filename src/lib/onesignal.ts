import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || 'YOUR_ONESIGNAL_APP_ID';
  if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID') {
    console.warn('OneSignal App ID missing');
    return;
  }
  try {
    await OneSignal.init({
      appId,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      allowLocalhostAsSecureOrigin: true,
    });
  } catch (e) {
    console.warn('OneSignal init error:', e);
    initialized = false;
  }
}

export function isIosNonStandalone(): boolean {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isIosNonStandalone()) {
    alert(
      "On iPhone, tap Share then 'Add to Home Screen', then open the app from your home screen icon to enable notifications.",
    );
    return false;
  }
  try {
    await OneSignal.Notifications.requestPermission();
    const granted = OneSignal.Notifications.permission;
    return granted;
  } catch (e) {
    console.error('Permission error:', e);
    return false;
  }
}

export function getNotificationPermission(): boolean {
  try {
    return !!(OneSignal.Notifications && OneSignal.Notifications.permission);
  } catch {
    return false;
  }
}

export async function sendPushAlert(
  title: string,
  message: string,
  targetIds?: string[],
) {
  try {
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, targetIds }),
    });

    const json = await res.json();
    console.log('OneSignal push response:', res.status, json);

    if (!res.ok) {
      console.warn('Push alert warning:', json);
    } else if (json.recipients === 0) {
      console.warn('Push accepted by OneSignal, but matched 0 recipients.');
    }
  } catch (e) {
    console.error('Error sending push alert via /api/push:', e);
  }
}

export async function linkUserToNotification(phoneOrRoll: string) {
  try {
    if (OneSignal.login && phoneOrRoll) {
      await OneSignal.login(phoneOrRoll);
    }
  } catch (e) {
    console.warn('OneSignal login error:', e);
  }
}
