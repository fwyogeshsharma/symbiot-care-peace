// Installs the debug build on a connected Android device and launches it.
// Resolves the Android SDK and JDK from the usual install locations so the
// script works without JAVA_HOME / ANDROID_HOME being on PATH.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_ID = 'com.symbiot.care'; // must match appId in capacitor.config.ts
const isWindows = process.platform === 'win32';

const firstExisting = (...candidates) => candidates.filter(Boolean).find((p) => existsSync(p));

const androidHome = firstExisting(
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  isWindows ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : null,
  process.platform === 'darwin' ? join(homedir(), 'Library', 'Android', 'sdk') : null,
  join(homedir(), 'Android', 'Sdk')
);

if (!androidHome) {
  console.error('Android SDK not found. Set ANDROID_HOME and try again.');
  process.exit(1);
}

const javaHome = firstExisting(
  process.env.JAVA_HOME,
  isWindows ? 'C:\\Program Files\\Android\\Android Studio\\jbr' : null,
  process.platform === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : null,
  '/opt/android-studio/jbr'
);

if (!javaHome) {
  console.error('No JDK found. Set JAVA_HOME to a JDK 17+ install and try again.');
  process.exit(1);
}

const adb = join(androidHome, 'platform-tools', isWindows ? 'adb.exe' : 'adb');
const gradlew = join('android', isWindows ? 'gradlew.bat' : 'gradlew');
const env = { ...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome, JAVA_HOME: javaHome };

// Node refuses to spawn .bat/.cmd without a shell, so Windows needs shell: true.
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: isWindows });
  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  return result;
};

const install = run(gradlew, ['-p', 'android', 'installDebug']);
if (install.status !== 0) {
  // MIUI and other skinned ROMs reject adb installs until "Install via USB" is
  // enabled in Developer options, which surfaces as INSTALL_FAILED_USER_RESTRICTED.
  console.error('\nInstall failed. If the cause was INSTALL_FAILED_USER_RESTRICTED, enable');
  console.error('"Install via USB" in the phone\'s Developer options and re-run.');
  process.exit(install.status ?? 1);
}

run(adb, ['shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1']);
