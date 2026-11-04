'use strict';
// Runs every 15 minutes (schedule is set in netlify.toml). Sends at most one morning
// and one evening notification per device per day, then records that it did.
const { init } = require('./_lib/init');
const { decide } = require('./_lib/logic');

exports.handler = async function () {
  const { admin, webpush } = init();
  const db = admin.firestore();
  const devices = await db.collection('devices').get();
  const states = {};
  const now = new Date();
  let sent = 0;

  for (const doc of devices.docs) {
    const d = doc.data();
    try {
      if (!(d.uid in states)) {
        const u = await db.collection('users').doc(d.uid).get();
        states[d.uid] = u.exists ? JSON.parse(u.data().json) : null;
      }
      const state = states[d.uid];
      if (!state) continue;

      const msg = decide({ state, now, tz: d.tz || 'UTC', lastSent: d.lastSent || {} });
      if (!msg) continue;

      await webpush.sendNotification(
        JSON.parse(d.sub),
        JSON.stringify({ title: msg.title, body: msg.body, tag: msg.kind, open: msg.open }),
        { TTL: 3600 } // drop it if the phone has been offline for an hour, so nothing arrives late
      );
      await doc.ref.update({ ['lastSent.' + msg.kind]: msg.date });
      sent++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        await doc.ref.delete(); // the phone unsubscribed or the subscription expired
      } else {
        console.error('notify failed for device', doc.id, e && e.message);
      }
    }
  }
  return { statusCode: 200, body: 'sent ' + sent };
};
