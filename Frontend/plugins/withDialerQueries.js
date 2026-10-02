const { withAndroidManifest } = require('expo/config-plugins');

function withDialerQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [];
    const serialized = JSON.stringify(manifest.queries);
    if (!serialized.includes('android.intent.action.DIAL')) {
      manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
            data: [{ $: { 'android:scheme': 'tel' } }],
          },
        ],
      });
    }
    return config;
  });
}

module.exports = withDialerQueries;
