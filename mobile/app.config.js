const appJson = require("./app.json");

// No EAS Build: use arquivo enviado pela variável GOOGLE_SERVICES_JSON (secret file).
// Local: use ./google-services.json (não commitado; ver docs/EXPO_PUSH_FIREBASE_ANDROID.md).
module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
  },
};
