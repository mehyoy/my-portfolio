'use strict';
// Called by the "Send a test" button in the app. Checks the caller is signed in,
// then sends one notification to their own device.
const { init } = require('./_lib/init');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  const { admin, webpush } = init();

  const auth = event.headers.authorization || event.headers.Authorization || '';
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(auth.replace(/^Bearer /, ''));
  } catch (e) {
    return { statusCode: 401, body: 'not signed in' };
  }

  let deviceId = '';
  try { deviceId = String(JSON.parse(event.body || '{}').deviceId || ''); } catch (e) {}
  if (!deviceId) return { statusCode: 400, body: 'missing device' };

  const ref = admin.firestore().collection('devices').doc(deviceId);
  const doc = await ref.get();
  if (!doc.exists || doc.data().uid !== decoded.uid) return { statusCode: 404, body: 'device not found' };

  try {
    await webpush.sendNotification(
      JSON.parse(doc.data().sub),
      JSON.stringify({
        title: 'Waypoints notifications are on',
        body: 'You will get a morning plan and an evening check-in. Never more than two a day.',
        tag: 'test'
      }),
      { TTL: 600 }
    );
  } catch (e) {
    if (e && (e.statusCode === 404 || e.statusCode === 410)) {
      await ref.delete();
      return { statusCode: 410, body: 'subscription expired' };
    }
    return { statusCode: 500, body: 'send failed' };
  }
  return { statusCode: 200, body: 'ok' };
};
