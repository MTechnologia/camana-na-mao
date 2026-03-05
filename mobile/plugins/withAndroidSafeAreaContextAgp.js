const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs").promises;

/**
 * Config plugin that patches react-native-safe-area-context's android/build.gradle
 * for AGP 8.x compatibility (lint/packaging DSL) so EAS Build succeeds.
 * Run during prebuild; no patch-package needed for this library.
 */
function withAndroidSafeAreaContextAgp(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const buildGradlePath = path.join(
        projectRoot,
        "node_modules",
        "react-native-safe-area-context",
        "android",
        "build.gradle"
      );

      try {
        let content = await fs.readFile(buildGradlePath, "utf8");
        content = content.replace(
          'classpath("com.android.tools.build:gradle:7.3.1")',
          'classpath("com.android.tools.build:gradle:8.11.0")'
        );
        content = content.replace(
          "lintOptions{\n        abortOnError false\n    }",
          "lint {\n        abortOnError false\n    }"
        );
        content = content.replace(
          "packagingOptions {",
          "packaging {"
        );
        content = content.replace(
          '        exclude "**/libreact_render*.so"',
          '        jniLibs { excludes += "**/libreact_render*.so" }'
        );
        await fs.writeFile(buildGradlePath, content);
      } catch (e) {
        // If the package or file is missing, skip (e.g. optional dep)
        if (e.code !== "ENOENT") throw e;
      }

      return config;
    },
  ]);
}

module.exports = withAndroidSafeAreaContextAgp;
