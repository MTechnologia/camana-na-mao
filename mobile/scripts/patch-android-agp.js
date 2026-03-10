#!/usr/bin/env node
/**
 * Patches react-native-safe-area-context and react-native-webview for AGP 8.x
 * so EAS Build succeeds. Run in postinstall after npm install (same moment as patch-package).
 * No dependency on patch-package parse; runs on every install including EAS.
 */

const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");

function patchSafeAreaContext() {
  const file = path.join(
    root,
    "node_modules",
    "react-native-safe-area-context",
    "android",
    "build.gradle"
  );
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    'classpath("com.android.tools.build:gradle:7.3.1")',
    'classpath("com.android.tools.build:gradle:8.11.0")'
  );
  content = content.replace(
    "lintOptions{\n        abortOnError false\n    }",
    "lint {\n        abortOnError false\n    }"
  );
  content = content.replace("packagingOptions {", "packaging {");
  content = content.replace(
    '        exclude "**/libreact_render*.so"',
    '        jniLibs { excludes += "**/libreact_render*.so" }'
  );
  fs.writeFileSync(file, content);
}

function patchWebView() {
  const file = path.join(
    root,
    "node_modules",
    "react-native-webview",
    "android",
    "build.gradle"
  );
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    'classpath("com.android.tools.build:gradle:7.0.4")',
    'classpath("com.android.tools.build:gradle:8.11.0")'
  );
  fs.writeFileSync(file, content);
}

patchSafeAreaContext();
patchWebView();
