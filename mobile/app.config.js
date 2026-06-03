const appJson = require("./app.json");

// Sufixa applicationId (e nome visível) por ambiente para casar com os clientes
// registrados no google-services.json (HML/DEV têm Firebase apps separados).
// Perfis EAS preview-hml/preview-dev injetam EXPO_PUBLIC_APP_ENV.
const env = process.env.EXPO_PUBLIC_APP_ENV;
const suffix = env === "hml" || env === "dev" ? `.${env}` : "";
const nameSuffix = suffix ? ` (${env.toUpperCase()})` : "";

module.exports = {
  expo: {
    ...appJson.expo,
    name: `${appJson.expo.name}${nameSuffix}`,
    android: {
      ...appJson.expo.android,
      package: `${appJson.expo.android.package}${suffix}`,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
  },
};
