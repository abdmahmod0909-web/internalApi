import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import { fetch } from 'undici';

/**
 * Returns the persistent cross-platform user-data directory where
 * Over-The-Air (OTA) UI bundles are installed.
 */
export function getOtaDistPath(): string {
  if (process.env.APPDATA) {
    // Windows: %APPDATA%/InternalAPI/ota_client_dist
    return path.join(process.env.APPDATA, 'InternalAPI', 'ota_client_dist');
  } else if (process.platform === 'darwin' && process.env.HOME) {
    // macOS: ~/Library/Application Support/InternalAPI/ota_client_dist
    return path.join(process.env.HOME, 'Library', 'Application Support', 'InternalAPI', 'ota_client_dist');
  } else if (process.env.HOME) {
    // Linux: ~/.config/InternalAPI/ota_client_dist
    return path.join(process.env.HOME, '.config', 'InternalAPI', 'ota_client_dist');
  }
  return path.resolve(process.cwd(), '.data/ota_client_dist');
}

/**
 * Reads the application version from a static folder's version.json.
 */
export function getCurrentVersion(staticPath?: string | null): string {
  try {
    if (staticPath) {
      const vFile = path.join(staticPath, 'version.json');
      if (fs.existsSync(vFile)) {
        const data = JSON.parse(fs.readFileSync(vFile, 'utf8'));
        if (data.version) return data.version;
      }
    }
  } catch (_) {}
  return '1.0.0';
}

/**
 * Returns current OTA status (active version, installation timestamp).
 */
export function getOtaStatus(baseStaticPath?: string | null) {
  const otaPath = getOtaDistPath();
  const isOtaActive = fs.existsSync(path.join(otaPath, 'index.html'));
  let otaVersion: string | null = null;
  let otaInstalledAt: string | null = null;

  if (isOtaActive) {
    try {
      const vFile = path.join(otaPath, 'version.json');
      if (fs.existsSync(vFile)) {
        const v = JSON.parse(fs.readFileSync(vFile, 'utf8'));
        otaVersion = v.version || null;
        otaInstalledAt = v.installedAt || null;
      }
    } catch (_) {}
  }

  const currentVersion = isOtaActive && otaVersion ? otaVersion : getCurrentVersion(baseStaticPath);

  return {
    isOtaActive,
    otaPath,
    currentVersion,
    otaVersion,
    otaInstalledAt,
  };
}

/**
 * Compare two semantic versions (e.g. "1.0.3" vs "1.0.2").
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Checks GitHub Releases for a newer UI bundle asset.
 * Includes rate-limit-proof redirect fallback if GitHub REST API returns 403.
 */
export async function checkForUpdates(baseStaticPath?: string | null, repo = 'abdmahmod0909-web/internalApi') {
  const status = getOtaStatus(baseStaticPath);
  const currentVersion = status.currentVersion;

  try {
    let tagName = '';
    let latestVersion = '';
    let releaseName = '';
    let releaseNotes = '';
    let publishedAt: string | null = null;
    let assetName: string | null = null;
    let assetUrl: string | null = null;
    let assetSize = 0;
    let hasAsset = false;

    // 1. Try standard GitHub REST API
    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'InternalAPI-OTA/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (res.ok) {
        const release = (await res.json()) as any;
        tagName = release.tag_name || '';
        latestVersion = tagName.replace(/^v/, '');
        const assets = release.assets || [];
        const uiBundleAsset = assets.find(
          (a: any) => a.name === 'ui-bundle.tar.gz' || a.name === 'ui-bundle.zip'
        );
        if (uiBundleAsset) {
          hasAsset = true;
          assetName = uiBundleAsset.name;
          assetUrl = uiBundleAsset.browser_download_url;
          assetSize = uiBundleAsset.size;
        }
        releaseName = release.name || tagName;
        releaseNotes = release.body || '';
        publishedAt = release.published_at || null;
      }
    } catch (_) {}

    // 2. If REST API was rate-limited (403) or failed, fallback to zero-rate-limit GitHub redirect
    if (!latestVersion) {
      try {
        const redirectRes = await fetch(`https://github.com/${repo}/releases/latest`, {
          redirect: 'manual',
          headers: { 'User-Agent': 'InternalAPI-OTA/1.0' },
        });
        const location = redirectRes.headers.get('location') || '';
        const tagMatch = location.match(/\/releases\/tag\/([^/?#]+)/);
        if (tagMatch && tagMatch[1]) {
          tagName = tagMatch[1];
          latestVersion = tagName.replace(/^v/, '');
          assetName = 'ui-bundle.tar.gz';
          assetUrl = `https://github.com/${repo}/releases/download/${tagName}/ui-bundle.tar.gz`;
          hasAsset = true;
          releaseName = tagName;
          releaseNotes = `OTA Hot Update release ${tagName}`;
        }
      } catch (_) {}
    }

    if (!latestVersion) {
      return {
        hasUpdate: false,
        currentVersion,
        isOtaActive: status.isOtaActive,
        message: 'Could not resolve latest release from GitHub',
      };
    }

    const isNewer = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate: isNewer && hasAsset,
      currentVersion,
      latestVersion,
      isOtaActive: status.isOtaActive,
      releaseName: releaseName || tagName,
      releaseNotes: releaseNotes || '',
      publishedAt: publishedAt || new Date().toISOString(),
      assetName,
      assetUrl,
      assetSize,
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      isOtaActive: status.isOtaActive,
      message: err.message || 'Failed to check for updates',
    };
  }
}

/**
 * Downloads the lightweight UI bundle and extracts it to the OTA user directory.
 */
export async function applyOtaUpdate(assetUrl: string, latestVersion: string) {
  const otaDir = getOtaDistPath();
  const tempDir = os.tmpdir();
  const isZip = assetUrl.endsWith('.zip');
  const tempFile = path.join(tempDir, `internalapi-ui-${Date.now()}.${isZip ? 'zip' : 'tar.gz'}`);

  // 1. Download asset buffer
  const res = await fetch(assetUrl, {
    headers: {
      'User-Agent': 'InternalAPI-OTA/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download UI bundle: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

  // 2. Prepare destination directory
  if (!fs.existsSync(otaDir)) {
    fs.mkdirSync(otaDir, { recursive: true });
  }

  // 3. Extract using native tar (universal across Windows 10/11, macOS, and Linux)
  try {
    if (isZip) {
      if (process.platform === 'win32') {
        cp.execSync(`tar -xf "${tempFile}" -C "${otaDir}"`);
      } else {
        cp.execSync(`unzip -o "${tempFile}" -d "${otaDir}"`);
      }
    } else {
      cp.execSync(`tar -xzf "${tempFile}" -C "${otaDir}"`);
    }
  } catch (err: any) {
    throw new Error(`Failed to extract update package: ${err.message}`);
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch (_) {}
  }

  // 4. Verify index.html exists, or un-nest if archived with a wrapper directory
  if (!fs.existsSync(path.join(otaDir, 'index.html'))) {
    const subdirs = fs.readdirSync(otaDir).filter((f) => {
      try {
        return fs.statSync(path.join(otaDir, f)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const sub of subdirs) {
      const nestedIndex = path.join(otaDir, sub, 'index.html');
      if (fs.existsSync(nestedIndex)) {
        const files = fs.readdirSync(path.join(otaDir, sub));
        for (const file of files) {
          const src = path.join(otaDir, sub, file);
          const dest = path.join(otaDir, file);
          if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
          fs.renameSync(src, dest);
        }
        break;
      }
    }
  }

  if (!fs.existsSync(path.join(otaDir, 'index.html'))) {
    throw new Error('Update bundle corrupted: index.html not found after extraction');
  }

  // 5. Save version metadata
  fs.writeFileSync(
    path.join(otaDir, 'version.json'),
    JSON.stringify({ version: latestVersion, installedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );

  return {
    success: true,
    version: latestVersion,
    path: otaDir,
  };
}

/**
 * Reverts to the bundled version that came with the desktop app installer.
 */
export function revertOtaUpdate() {
  const otaDir = getOtaDistPath();
  if (fs.existsSync(otaDir)) {
    fs.rmSync(otaDir, { recursive: true, force: true });
  }
  return { success: true };
}

