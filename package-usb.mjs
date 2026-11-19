import {
  chmodSync,
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'HoopIO-Portable');
const cacheDir = path.join(root, '.node-runtime-cache');
const nodeVer = process.version;

mkdirSync(cacheDir, { recursive: true });

async function downloadFile(url, dest) {
  if (existsSync(dest)) return;
  console.log(`   Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status} ${res.statusText})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function ensureRuntimes(runtimeDir) {
  // 1. Windows x64 runtime
  const winDest = path.join(runtimeDir, 'node.exe');
  if (process.platform === 'win32' && process.arch === 'x64' && existsSync(process.execPath)) {
    cpSync(process.execPath, winDest);
  } else {
    const winZip = path.join(cacheDir, `node-${nodeVer}-win-x64.zip`);
    const winExtract = path.join(cacheDir, `node-${nodeVer}-win-x64`);
    await downloadFile(`https://nodejs.org/dist/${nodeVer}/node-${nodeVer}-win-x64.zip`, winZip);
    if (!existsSync(winExtract)) {
      if (process.platform === 'win32') {
        execSync(
          `powershell -NoProfile -Command "Expand-Archive -Path '${winZip}' -DestinationPath '${cacheDir}' -Force"`,
          { stdio: 'inherit' },
        );
      } else {
        execSync(`unzip -q -o "${winZip}" -d "${cacheDir}"`, { stdio: 'inherit' });
      }
    }
    cpSync(path.join(winExtract, 'node.exe'), winDest);
  }
  console.log(`   Ready: runtime/node.exe (${nodeVer} win32-x64)`);

  // 2. macOS runtimes (arm64 Apple Silicon + x64 Intel)
  // Extract ONLY `bin/node` to avoid POSIX symlink errors (`bin/npm`, `bin/npx`) on Windows
  for (const arch of ['arm64', 'x64']) {
    const macDest = path.join(runtimeDir, `node-mac-${arch}`);
    if (process.platform === 'darwin' && process.arch === arch && existsSync(process.execPath)) {
      cpSync(process.execPath, macDest);
    } else {
      const tarName = `node-${nodeVer}-darwin-${arch}.tar.gz`;
      const tarPath = path.join(cacheDir, tarName);
      const innerNodeRel = `node-${nodeVer}-darwin-${arch}/bin/node`;
      const extractedNode = path.join(cacheDir, `node-${nodeVer}-darwin-${arch}`, 'bin', 'node');

      await downloadFile(`https://nodejs.org/dist/${nodeVer}/${tarName}`, tarPath);
      if (!existsSync(extractedNode)) {
        execSync(`tar -xzf "${tarPath}" -C "${cacheDir}" "${innerNodeRel}"`, { stdio: 'inherit' });
      }
      cpSync(extractedNode, macDest);
    }
    chmodSync(macDest, 0o755);
    console.log(`   Ready: runtime/node-mac-${arch} (${nodeVer} darwin-${arch})`);
  }
}

function prebuildSqlite(modulesDir, platform, arch) {
  const sqliteDir = path.join(modulesDir, 'better-sqlite3');
  if (!existsSync(sqliteDir)) return;
  try {
    execSync(`npx --yes prebuild-install --platform=${platform} --arch=${arch} --force`, {
      cwd: sqliteDir,
      stdio: 'inherit',
    });
  } catch {
    console.warn(`   Warning: Could not pre-fetch ${platform}-${arch} binary for better-sqlite3.`);
  }
}

async function main() {
  console.log('1. Building client and server...');
  execSync('npm run build', { cwd: path.join(root, 'client'), stdio: 'inherit' });
  execSync('npm run build', { cwd: path.join(root, 'server'), stdio: 'inherit' });

  console.log('2. Preparing cross-platform HoopIO-Portable folder...');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(path.join(outDir, 'runtime'), { recursive: true });
  mkdirSync(path.join(outDir, 'client'), { recursive: true });
  mkdirSync(path.join(outDir, 'server', 'uploads'), { recursive: true });

  cpSync(path.join(root, 'client', 'dist'), path.join(outDir, 'client', 'dist'), { recursive: true });
  cpSync(path.join(root, 'server', 'dist'), path.join(outDir, 'server', 'dist'), { recursive: true });
  cpSync(path.join(root, 'server', 'package.json'), path.join(outDir, 'server', 'package.json'));
  if (existsSync(path.join(root, 'server', 'package-lock.json'))) {
    cpSync(path.join(root, 'server', 'package-lock.json'), path.join(outDir, 'server', 'package-lock.json'));
  }

  // Copy existing uploads & SQLite database if present
  if (existsSync(path.join(root, 'server', 'uploads'))) {
    cpSync(path.join(root, 'server', 'uploads'), path.join(outDir, 'server', 'uploads'), { recursive: true });
  }
  for (const file of ['hoopio.db', 'database.sqlite', 'db.sqlite']) {
    const dbFile = path.join(root, 'server', file);
    if (existsSync(dbFile)) {
      cpSync(dbFile, path.join(outDir, 'server', file));
    }
  }

  console.log('3. Bundling Windows & macOS Node.js runtimes...');
  await ensureRuntimes(path.join(outDir, 'runtime'));

  console.log('4. Installing production server dependencies & cross-platform SQLite binaries...');
  execSync('npm install --omit=dev', { cwd: path.join(outDir, 'server'), stdio: 'inherit' });

  const baseModules = path.join(outDir, 'server', 'node_modules');
  const winModules = path.join(outDir, 'server', 'node_modules_win');
  const macModules = path.join(outDir, 'server', 'node_modules_mac');

  cpSync(baseModules, winModules, { recursive: true });
  cpSync(baseModules, macModules, { recursive: true });

  if (process.platform !== 'win32') {
    prebuildSqlite(winModules, 'win32', 'x64');
  }
  if (process.platform !== 'darwin') {
    prebuildSqlite(macModules, 'darwin', 'arm64');
  }

  // Windows Double-Click Launcher (Start-HoopIO.bat)
  const batContent = [
    '@echo off',
    'setlocal',
    'title HoopIO Portable Server (Windows)',
    'cd /d "%~dp0"',
    '',
    'set NODE_ENV=production',
    'set PORT=3000',
    'set "NODE_BIN=%~dp0runtime\\node.exe"',
    '',
    'cd /d "%~dp0server"',
    '',
    'if not exist "node_modules\\.win_ready" (',
    '  if exist "node_modules_win" (',
    '    echo Activating Windows native modules...',
    '    if exist "node_modules" rmdir /s /q "node_modules"',
    '    xcopy /E /I /Q /Y "node_modules_win" "node_modules" >nul',
    '    type nul > "node_modules\\.win_ready"',
    '  )',
    ')',
    '',
    'echo ============================================',
    'echo   Starting HoopIO Basketball Management...',
    'echo   Keep this window open during the game.',
    'echo ============================================',
    '',
    'start "" "http://localhost:%PORT%"',
    '"%NODE_BIN%" dist\\index.js',
    'pause',
    '',
  ].join('\r\n');

  writeFileSync(path.join(outDir, 'Start-HoopIO.bat'), batContent, 'utf8');

  // macOS Double-Click Launcher (Start-HoopIO.command)
  const commandContent = [
    '#!/bin/bash',
    'set -e',
    'cd "$(dirname "$0")"',
    '',
    'export NODE_ENV=production',
    'export PORT=3000',
    '',
    'ARCH="$(uname -m)"',
    'if [ "$ARCH" = "arm64" ] && [ -x "./runtime/node-mac-arm64" ]; then',
    '  NODE_BIN="$(pwd)/runtime/node-mac-arm64"',
    'elif [ -x "./runtime/node-mac-x64" ]; then',
    '  NODE_BIN="$(pwd)/runtime/node-mac-x64"',
    'elif command -v node >/dev/null 2>&1; then',
    '  NODE_BIN="$(command -v node)"',
    'else',
    '  echo "Error: Portable macOS Node.js runtime not found."',
    '  read -p "Press Enter to close..."',
    '  exit 1',
    'fi',
    '',
    'cd server',
    '',
    'if [ ! -f "node_modules/.mac_ready" ]; then',
    '  if [ -d "node_modules_mac" ]; then',
    '    echo "Activating macOS native modules..."',
    '    rm -rf node_modules',
    '    cp -R node_modules_mac node_modules',
    '  else',
    '    echo "Rebuilding SQLite native module for macOS..."',
    '    npm rebuild better-sqlite3',
    '  fi',
    '  touch node_modules/.mac_ready',
    'fi',
    '',
    'echo "============================================"',
    'echo "  Starting HoopIO Basketball Management..."',
    'echo "  Keep this window open during the game."',
    'echo "============================================"',
    '',
    'open "http://localhost:$PORT"',
    '"$NODE_BIN" dist/index.js',
    '',
  ].join('\n');

  const macLauncherPath = path.join(outDir, 'Start-HoopIO.command');
  writeFileSync(macLauncherPath, commandContent, 'utf8');
  chmodSync(macLauncherPath, 0o755);

  console.log('\nDone! HoopIO-Portable now includes bundled Windows + macOS runtimes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});