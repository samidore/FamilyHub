import { get, ref, remove, set } from 'firebase/database';
import type { FirebaseHouseholdSession } from './householdSession.ts';

const DEVICE_KEY = 'familyhub-push-device-id';
function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
function deviceRef(session: FirebaseHouseholdSession) {
  const status = session.getStatus();
  if (status.connection !== 'connected' || !status.uid) throw new Error('请先连接家庭账号。');
  return ref(session.database, `households/${session.householdId}/notificationDevices/${status.uid}/${deviceId()}`);
}
function applicationServerKey(base64url: string) {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const binary = atob((base64url + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
export function todayPushAvailable() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
    && 'PushManager' in window && window.isSecureContext;
}
export async function todayPushIsEnabled(session: FirebaseHouseholdSession) {
  if (!todayPushAvailable() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  return (await get(deviceRef(session))).exists();
}
export async function enableTodayPush(session: FirebaseHouseholdSession, key: string, base: string) {
  if (!todayPushAvailable()) throw new Error('此浏览器不支持推送。iPhone 请先将 FamilyHub 添加到主屏幕。');
  if (!key) throw new Error('推送服务还未配置完成。');
  // iOS requires a visible tap to initiate the permission request.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('没有获得通知权限，请检查手机通知设置。');
  const registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(key) });
  const data = subscription.toJSON();
  if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) throw new Error('浏览器没有返回有效的推送订阅。');
  await set(deviceRef(session), {
    endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, updatedAt: Date.now(),
  });
}
export async function disableTodayPush(session: FirebaseHouseholdSession) {
  if (!todayPushAvailable()) return;
  await remove(deviceRef(session));
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
