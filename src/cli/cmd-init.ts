import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { Command } from 'commander';
import yaml from 'js-yaml';
import { autoDetect } from '../config/auto-detect.js';
import { validateRawConfig, hasErrors } from '../config/validate.js';

const CONFIG_FILE = '.ainonymous.yml';
const SKIP_DEPS = new Set([
  'typescript',
  'vitest',
  'eslint',
  'prettier',
  '@types/node',
  '@types/js-yaml',
]);

interface ProjectInfo {
  language: string;
  frameworks: string[];
  hasEnvFile: boolean;
  name: string;
  company: string;
  domains: string[];
  people: string[];
  domainTerms: string[];
}

export function registerInitCmd(program: Command): void {
  program
    .command('init')
    .description('Scan project and generate .ainonymous.yml')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .option('--from <url>', 'download config template from URL')
    .option('--show', 'print the generated YAML to stdout without writing it')
    .action(async (opts: { dir: string; from?: string; show?: boolean }) => {
      const configPath = join(opts.dir, CONFIG_FILE);

      if (!opts.show && existsSync(configPath)) {
        console.log(`${CONFIG_FILE} already exists in ${opts.dir}`);
        console.log('Remove it first if you want to regenerate.');
        return;
      }

      if (opts.from) {
        if (!opts.from.startsWith('https://')) {
          console.error('Refusing to download config over plain HTTP. Use an https:// URL.');
          process.exit(1);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(opts.from, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const content = await res.text();
          const parsed = yaml.load(content);
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('downloaded config is not a YAML object');
          }
          const issues = validateRawConfig(parsed as Record<string, unknown>);
          if (hasErrors(issues)) {
            const lines = issues
              .filter((i) => i.severity === 'error')
              .map((i) => `  - ${i.path}: ${i.message}`)
              .join('\n');
            throw new Error(`downloaded config failed validation:\n${lines}`);
          }

          const behavior = (parsed as Record<string, unknown>).behavior;
          if (behavior && typeof behavior === 'object' && !Array.isArray(behavior)) {
            const upstream = (behavior as Record<string, unknown>).upstream;
            if (upstream && typeof upstream === 'object' && !Array.isArray(upstream)) {
              const u = upstream as Record<string, unknown>;
              const expectedHosts: Record<string, string> = {
                anthropic: 'api.anthropic.com',
                openai: 'api.openai.com',
              };
              for (const [key, expectedHost] of Object.entries(expectedHosts)) {
                const v = u[key];
                if (typeof v !== 'string') continue;
                let host: string;
                try {
                  host = new URL(v).host;
                } catch {
                  throw new Error(
                    `downloaded config has unparseable behavior.upstream.${key}: ${v}`,
                  );
                }
                if (host !== expectedHost) {
                  throw new Error(
                    `downloaded config redirects behavior.upstream.${key} to ${host} (expected ${expectedHost}). ` +
                      `Refusing to write. start the proxy only after reviewing the source.`,
                  );
                }
              }
            }
          }
          writeFileSync(configPath, content, 'utf-8');
          console.log(`Downloaded ${CONFIG_FILE} from ${opts.from}`);
          console.log(
            'Review the downloaded config before starting the proxy. it can change upstream URLs and enable custom regex patterns.',
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown error';
          console.error(`Failed to download config: ${msg}`);
          process.exit(1);
        } finally {
          clearTimeout(timeout);
        }
        return;
      }

      const info = scanProject(opts.dir);
      const config = buildConfig(info);
      const out = yaml.dump(config, { lineWidth: 100, noRefs: true });

      if (opts.show) {
        process.stdout.write(out);
        return;
      }

      writeFileSync(configPath, out, 'utf-8');

      console.log(`Created ${CONFIG_FILE} in ${opts.dir}`);
      console.log(`  Language: ${info.language}`);
      if (info.frameworks.length) {
        console.log(`  Frameworks: ${info.frameworks.join(', ')}`);
      }
      if (info.company) {
        console.log(`  Company: ${info.company} (from git config)`);
      } else {
        console.log('  Company: (empty. set identity.company manually, see WARN below)');
      }
      if (info.domains.length) {
        console.log(`  Domains: ${info.domains.join(', ')}`);
      }
      if (info.people.length) {
        console.log(`  People: ${info.people.length} contributors (from git log)`);
      }
      if (info.hasEnvFile) {
        console.log('  Detected .env file - sensitive paths pre-configured');
      }

      if (!info.company && info.domains.length === 0 && info.people.length === 0) {
        console.log('');
        console.log('WARN: auto-detect could not populate identity.company / domains / people.');
        console.log('      Likely a solo repo with a noreply git email and no pom/package.json.');
        console.log('      Open .ainonymous.yml and fill these fields. Layer 2 otherwise runs');
        console.log('      idle for person/company tokens and genuine PII will leak upstream.');
      }

      console.log('');
      console.log('Next: `ainonymous scan` to tune, then `ainonymous start` to begin proxying.');
    });
}

function scanProject(dir: string): ProjectInfo {
  const detected = autoDetect(dir);

  const info: ProjectInfo = {
    language: detected.code.language,
    frameworks: [],
    hasEnvFile: false,
    name: basename(dir),
    company: detected.identity.company,
    domains: detected.identity.domains,
    people: detected.identity.people,
    domainTerms: detected.code.domainTerms,
  };

  // framework detection (auto-detect handles language/company/people)
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if (typeof pkg.name === 'string') info.name = pkg.name;

      const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };

      const depNames = Object.keys(allDeps).filter((d) => !SKIP_DEPS.has(d));

      if (depNames.some((d) => d.includes('react'))) info.frameworks.push('react');
      if (depNames.some((d) => d.includes('vue'))) info.frameworks.push('vue');
      if (depNames.some((d) => d.includes('angular'))) info.frameworks.push('angular');
      if (depNames.some((d) => d.includes('express'))) info.frameworks.push('express');
      if (depNames.some((d) => d.includes('fastify'))) info.frameworks.push('fastify');
      if (depNames.some((d) => d.includes('nest'))) info.frameworks.push('nestjs');
      if (depNames.some((d) => d.includes('next'))) info.frameworks.push('nextjs');
    } catch {
      // malformed package.json, use defaults
    }
  }

  const pomPath = join(dir, 'pom.xml');
  if (existsSync(pomPath)) {
    try {
      const pom = readFileSync(pomPath, 'utf8');
      if (pom.includes('spring-boot')) info.frameworks.push('SpringBoot');
      if (pom.includes('keycloak')) info.frameworks.push('Keycloak');
      if (pom.includes('vaadin')) info.frameworks.push('Vaadin');
    } catch {}
  }

  info.hasEnvFile = existsSync(join(dir, '.env'));

  return info;
}

function buildConfig(info: ProjectInfo): Record<string, unknown> {
  const sensitivePaths = ['.env', '.env.*', '**/*.pem', '**/*.key'];
  if (info.hasEnvFile) {
    sensitivePaths.push('.env.local', '.env.production');
  }

  return {
    version: 1,
    secrets: {
      patterns: [],
    },
    identity: {
      company: info.company,
      domains: info.domains,
      people: info.people,
    },
    code: {
      language: info.language,
      domain_terms: info.domainTerms,
      preserve: [],
      sensitive_paths: sensitivePaths,
      redact_bodies: [],
    },
    behavior: {
      interactive: true,
      audit_log: true,
      dashboard: true,
      aggression: 'medium',
      port: 8100,
      upstream: {
        anthropic: 'https://api.anthropic.com',
        openai: 'https://api.openai.com',
      },
    },
  };
}
