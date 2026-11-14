// Bank SMS reading is opt-in per build: only when CORPUS_SMS=1 (eas.json profile "development-sms").
// Without it the app asks for no SMS permission, so Play Protect's fraud protection doesn't block installs.
const { withAndroidManifest } = require('expo/config-plugins');

const PERMS = ['android.permission.RECEIVE_SMS', 'android.permission.READ_SMS'];

module.exports = function withBankSms(config) {
  if (process.env.CORPUS_SMS !== '1') return config;
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults.manifest;
    m['uses-permission'] = m['uses-permission'] ?? [];
    for (const p of PERMS) {
      if (!m['uses-permission'].some((u) => u.$['android:name'] === p)) m['uses-permission'].push({ $: { 'android:name': p } });
    }
    const app = m.application[0];
    app.receiver = app.receiver ?? [];
    if (!app.receiver.some((r) => r.$['android:name'] === 'expo.modules.corpussms.SmsReceiver')) {
      app.receiver.push({
        $: { 'android:name': 'expo.modules.corpussms.SmsReceiver', 'android:exported': 'true', 'android:permission': 'android.permission.BROADCAST_SMS' },
        'intent-filter': [{ $: { 'android:priority': '999' }, action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }] }],
      });
    }
    return cfg;
  });
};
