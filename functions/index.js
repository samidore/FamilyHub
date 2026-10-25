'use strict';

const { createHash } = require('node:crypto');
const { onValueWritten } = require('firebase-functions/v2/database');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const webPush = require('web-push');

setGlobalOptions({ region: process.env.FAMILYHUB_FUNCTIONS_REGION || 'us-central1', maxInstances: 3 });
admin.initializeApp();

const privateKey = defineSecret('WEB_PUSH_PRIVATE_KEY');
const publicKey = defineString('WEB_PUSH_PUBLIC_KEY');
const householdId = defineString('FAMILYHUB_HOUSEHOLD_ID', { default: 'family-household' });
const siteUrl = defineString('FAMILYHUB_SITE_URL', { default: 'https://samidore.github.io/FamilyHub/' });

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const object = (value) => isObject(value) ? value : {};
const baseUrl = () => new URL(siteUrl.value().endsWith('/') ? siteUrl.value() : siteUrl.value() + '/');
const urlFor = (path) => new URL(path, baseUrl()).href;

function trustedEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && (
      host === 'web.push.apple.com'
      || host.endsWith('.push.apple.com')
      || host === 'fcm.googleapis.com'
      || host === 'android.googleapis.com'
      || host === 'updates.push.services.mozilla.com'
      || host.endsWith('.notify.windows.com')
    );
  } catch {
    return false;
  }
}

async function sendToHousehold(hid, message, omitUid = '') {
  const database = admin.database();
  const [membersSnapshot, devicesSnapshot] = await Promise.all([
    database.ref(`households/${hid}/members`).get(),
    database.ref(`households/${hid}/notificationDevices`).get(),
  ]);
  const members = object(membersSnapshot.val());
  const devices = object(devicesSnapshot.val());
  webPush.setVapidDetails(baseUrl().origin, publicKey.value(), privateKey.value());
  const sends = [];
  for (const [uid, ownedDevices] of Object.entries(devices)) {
    if (uid === omitUid || !isObject(members[uid]) || !members[uid].email) continue;
    for (const [deviceId, device] of Object.entries(object(ownedDevices))) {
      if (!isObject(device) || !trustedEndpoint(device.endpoint) || typeof device.p256dh !== 'string' || typeof device.auth !== 'string') continue;
      sends.push(webPush.sendNotification({
        endpoint: device.endpoint,
        keys: { p256dh: device.p256dh, auth: device.auth },
      }, JSON.stringify(message), { TTL: 7200 }).catch(async (error) => {
        // Only permanent expired subscriptions are removed; never log private endpoints.
        if (error.statusCode === 404 || error.statusCode === 410) {
          await database.ref(`households/${hid}/notificationDevices/${uid}/${deviceId}`).remove();
        } else {
          console.error('FamilyHub push request failed', { status: error.statusCode || 'unknown' });
        }
      }));
    }
  }
  await Promise.all(sends);
}

// Firebase may retry database and schedule events; reserve one key per logical notification.
async function claim(hid, category, eventId) {
  const id = createHash('sha256').update(String(eventId)).digest('hex');
  const location = admin.database().ref(`households/${hid}/notificationDispatch/${category}/${id}`);
  const result = await location.transaction((value) => value ? undefined : Date.now());
  return result.committed;
}

function dateParts(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (kind) => Number(parts.find((part) => part.type === kind)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}
function tomorrowInNewYork(now = new Date()) {
  const { year, month, day } = dateParts('America/New_York', now);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}
const active = (item) => isObject(item) && item.status === 'active';

exports.onMealPlanChanged = onValueWritten({
  ref: '/households/{hid}/state', secrets: [privateKey],
}, async (event) => {
  const before = object(event.data.before.val()).currentMeal;
  const after = object(event.data.after.val()).currentMeal;
  if (!isObject(after) || !Array.isArray(after.selectedRecipeIds) || !after.selectedRecipeIds.length) return;
  const oldSelection = Array.isArray(before?.selectedRecipeIds) ? before.selectedRecipeIds : [];
  if (before?.mealId === after.mealId && JSON.stringify(oldSelection) === JSON.stringify(after.selectedRecipeIds)) return;
  const hid = event.params.hid;
  if (!await claim(hid, 'meal', event.id)) return;
  const count = after.selectedRecipeIds.length;
  await sendToHousehold(hid, {
    title: 'FamilyHub · 点菜更新',
    body: `家庭菜单已更新：当前选了 ${count} 道菜。`,
    url: urlFor('today/'),
    tag: `familyhub-meal-${after.mealId}`,
  }, event.authType === 'app_user' ? event.authId : '');
});

exports.onNotebookUrgentChanged = onValueWritten({
  ref: '/households/{hid}/notebook', secrets: [privateKey],
}, async (event) => {
  const before = object(object(event.data.before.val()).items);
  const after = object(object(event.data.after.val()).items);
  const tomorrow = tomorrowInNewYork();
  const entered = Object.entries(after).filter(([id, item]) => {
    if (!active(item)) return false;
    const nowRelevant = item.priority === 'urgent' || item.dueDate === tomorrow;
    if (!nowRelevant) return false;
    const old = before[id];
    return !active(old) || (old.priority !== 'urgent' && old.dueDate !== tomorrow);
  });
  if (!entered.length) return;
  const hid = event.params.hid;
  if (!await claim(hid, 'urgent', event.id)) return;
  await sendToHousehold(hid, {
    title: 'FamilyHub · 新提醒',
    body: entered.length === 1 ? `需要留意：${String(entered[0][1].title).slice(0, 75)}` : `有 ${entered.length} 项新紧急或明日到期任务。`,
    url: urlFor('today/'),
    tag: 'familyhub-urgent',
  }, event.authType === 'app_user' ? event.authId : '');
});

// Runs each evening regardless of whether either person's phone has FamilyHub open.
exports.eveningHouseholdReminder = onSchedule({
  schedule: '0 19 * * *', timeZone: 'America/New_York', secrets: [privateKey],
}, async () => {
  const hid = householdId.value();
  const due = tomorrowInNewYork();
  const items = object((await admin.database().ref(`households/${hid}/notebook/items`).get()).val());
  const dueItems = Object.values(items).filter((item) => active(item) && item.dueDate === due);
  if (!dueItems.length || !await claim(hid, 'evening', due)) return;
  await sendToHousehold(hid, {
    title: 'FamilyHub · 明天要做',
    body: dueItems.length === 1 ? `明天：${String(dueItems[0].title).slice(0, 75)}` : `明天有 ${dueItems.length} 项到期事项。`,
    url: urlFor('today/'),
    tag: `familyhub-due-${due}`,
  });
});
