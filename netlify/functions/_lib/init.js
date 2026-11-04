'use strict';
const admin = require('firebase-admin');
const webpush = require('web-push');

// Reads the secrets you set in Netlify (see NETLIFY-ENV.txt). Safe to call more than once.
function init() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:you@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return { admin, webpush };
}

module.exports = { init };
