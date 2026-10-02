// ==========================================================
// services/api/src/engineering/execution/antigravity-discovery.service.ts
// Phase 15.4: Antigravity Capability & Environment Discovery (§2)
// ==========================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StructuredLogger } from '@kdi/shared';
import type { AntigravityDiscoveryResult } from './engineering-execution.types.js';

const execAsync = promisify(exec);

export class AntigravityDiscoveryService {
  private readonly logger = new StructuredLogger('AntigravityDiscoveryService');
  private cachedDiscovery?: AntigravityDiscoveryResult;

  /**
   * Perform comprehensive environment and capability discovery (§2)
   */
  public async discover(forceRefresh = false): Promise<AntigravityDiscoveryResult> {
    if (this.cachedDiscovery && !forceRefresh) {
      return this.cachedDiscovery;
    }

    const platform = process.platform; // 'win32' | 'linux' | 'darwin'
    const isWin = platform === 'win32';

    // 1. Resolve actual executable path (§2.3)
    const executablePath = await this.resolveExecutablePath();

    if (!executablePath) {
      const result: AntigravityDiscoveryResult = {
        available: false,
        os: platform,
        authenticated: false,
        headlessCapable: false,
        structuredOutputSupported: false,
        supportedOutputFormats: [],
        scopedPermissionsSupported: false,
        projectContextSupported: false,
        status: 'ANTIGRAVITY_UNAVAILABLE',
        diagnostics: `Antigravity executable ('agy' or configured binary) not found in system PATH or standard install locations on ${platform}.`,
      };
      this.cachedDiscovery = result;
      return result;
    }

    // 2. Execute harmless version check (§2.4 & §2.11)
    let version = 'unknown';
    try {
      const verCmd = isWin ? `"${executablePath}" --version` : `"${executablePath}" --version`;
      const { stdout } = await execAsync(verCmd, { timeout: 5000 });
      const trimmed = stdout.trim();
      if (trimmed) {
        version = trimmed.split('\n')[0].trim();
      }
    } catch {
      try {
        const verCmdAlt = isWin ? `"${executablePath}" -v` : `"${executablePath}" -v`;
        const { stdout } = await execAsync(verCmdAlt, { timeout: 5000 });
        const trimmed = stdout.trim();
        if (trimmed) {
          version = trimmed.split('\n')[0].trim();
        }
      } catch (err: any) {
        this.logger.debug('discover', `Version check note: ${err.message}`);
      }
    }

    // 3. Inspect capabilities & flags from help output (§2.8, §2.9, §2.10)
    let helpOutput = '';
    try {
      const helpCmd = isWin ? `"${executablePath}" --help` : `"${executablePath}" --help`;
      const { stdout, stderr } = await execAsync(helpCmd, { timeout: 6000 });
      helpOutput = (stdout || '') + '\n' + (stderr || '');
    } catch (err: any) {
      helpOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    }

    const headlessCapable =
      helpOutput.includes('-p') ||
      helpOutput.includes('--prompt') ||
      helpOutput.includes('chat') ||
      helpOutput.includes('headless');

    const structuredOutputSupported =
      helpOutput.includes('--output-format') ||
      helpOutput.includes('json') ||
      helpOutput.includes('--json');

    const supportedOutputFormats: string[] = [];
    if (helpOutput.includes('stream-json')) supportedOutputFormats.push('stream-json');
    if (helpOutput.includes('json')) supportedOutputFormats.push('json');
    if (helpOutput.includes('text') || supportedOutputFormats.length === 0) supportedOutputFormats.push('text');

    const projectContextSupported =
      helpOutput.includes('--project') ||
      helpOutput.includes('-project') ||
      helpOutput.includes('project');

    const scopedPermissionsSupported =
      helpOutput.includes('permission') ||
      helpOutput.includes('profile') ||
      helpOutput.includes('allow');

    // 4. Determine authentication status (§2.6)
    const authStatus = await this.checkAuthenticationStatus(executablePath);

    // 5. Final capability status (§2)
    let status: AntigravityDiscoveryResult['status'] = 'READY';
    let diagnostics = `Antigravity CLI verified at ${executablePath} (v${version}, OS: ${platform}). Headless: ${headlessCapable}, Structured: ${structuredOutputSupported}.`;

    if (!authStatus.authenticated) {
      status = 'ANTIGRAVITY_AUTH_REQUIRED';
      diagnostics = `Antigravity executable found at ${executablePath} (v${version}), but active authentication is required: ${authStatus.reason}`;
    } else if (authStatus.permissionBlocked) {
      status = 'ANTIGRAVITY_PERMISSION_BLOCKED';
      diagnostics = `Antigravity executable found at ${executablePath}, but execution permissions are blocked: ${authStatus.reason}`;
    }

    const result: AntigravityDiscoveryResult = {
      available: status === 'READY',
      executablePath,
      version,
      os: platform,
      authenticated: authStatus.authenticated,
      authMethod: authStatus.method,
      headlessCapable,
      structuredOutputSupported,
      supportedOutputFormats,
      scopedPermissionsSupported,
      projectContextSupported,
      status,
      diagnostics,
    };

    this.cachedDiscovery = result;
    return result;
  }

  /**
   * Resolve path to Antigravity CLI binary without assuming PATH
   */
  public async resolveExecutablePath(): Promise<string | undefined> {
    const isWin = process.platform === 'win32';

    // Priority 1: Explicit environment variable configuration
    const envPath = process.env.ANTIGRAVITY_CLI_PATH || process.env.ANTIGRAVITY_BIN;
    if (envPath === 'NONE' || envPath === '__UNAVAILABLE__') {
      return undefined;
    }
    if (envPath && fs.existsSync(envPath)) {
      return path.resolve(envPath);
    }

    // Priority 2: System PATH query via where.exe / which
    const binaryNames = isWin ? ['agy.cmd', 'agy.exe', 'agy'] : ['agy'];
    for (const bin of binaryNames) {
      try {
        const checkCmd = isWin ? `where.exe "${bin}"` : `which "${bin}"`;
        const { stdout } = await execAsync(checkCmd, { timeout: 3000 });
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          const candidate = line.trim();
          if (candidate && fs.existsSync(candidate)) {
            return candidate;
          }
        }
      } catch {}
    }

    // Priority 3: Common standard install locations for agy CLI (§3 & §4)
    const candidatePaths: string[] = [];
    const home = os.homedir();

    if (isWin) {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');

      candidatePaths.push(
        path.join(localAppData, 'agy', 'bin', 'agy.exe'),
        path.join(localAppData, 'agy', 'bin', 'agy.cmd'),
        path.join(appData, 'npm', 'agy.cmd'),
        path.join(appData, 'Antigravity', 'bin', 'agy.cmd'),
        path.join(localAppData, 'Programs', 'Antigravity', 'bin', 'agy.cmd'),
        path.join(localAppData, 'Programs', 'Antigravity', 'bin', 'agy.exe'),
        path.join(home, 'bin', 'agy.cmd'),
        path.join(home, 'bin', 'agy.exe')
      );
    } else {
      candidatePaths.push(
        path.join(home, '.local', 'bin', 'agy'),
        path.join(home, 'bin', 'agy'),
        '/usr/local/bin/agy',
        '/usr/bin/agy',
        '/opt/antigravity/bin/agy'
      );
    }

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return path.resolve(p);
      }
    }

    return undefined;
  }

  /**
   * Check whether Antigravity is currently authenticated (§2.6 & §5)
   */
  private async checkAuthenticationStatus(
    executablePath: string
  ): Promise<{ authenticated: boolean; method?: string; reason?: string; permissionBlocked?: boolean }> {
    const home = os.homedir();

    // Check Gemini/Antigravity configuration directories
    const geminiDir = path.join(home, '.gemini');
    const settingsPath = path.join(geminiDir, 'settings.json');
    const statePath = path.join(geminiDir, 'antigravity', 'antigravity_state.pbtxt');
    const userSettingsPath = path.join(geminiDir, 'antigravity', 'user_settings.pb');

    const hasState = fs.existsSync(statePath) || fs.existsSync(userSettingsPath);
    const hasSettings = fs.existsSync(settingsPath);

    // If explicit API keys or OAuth credentials are set in environment
    if (process.env.GEMINI_API_KEY || process.env.ANTIGRAVITY_API_KEY) {
      return {
        authenticated: true,
        method: 'API_KEY_ENV',
      };
    }

    // Check if configuration files indicate authenticated session
    if (hasState || hasSettings) {
      return {
        authenticated: true,
        method: 'LOCAL_SESSION_STORE',
      };
    }

    // If no credentials or session files are detected, flag authentication requirement
    return {
      authenticated: false,
      reason: 'No session credentials or API keys found in ~/.gemini or environment variables',
    };
  }
}
