import { ProxySource, ProxyRecord } from '@/types';
import { repo, DEFAULT_OWNER_ID } from '../db/repository';
import { parseProxyString, parseBulkProxyList, ParsedProxyEndpoint } from '../validation/parser';
import { SourceAdapter, DiscoveryResult } from './adapters/adapter_interface';
import { validateEndpointSecurity } from '../security/ssrf';

// Built-in Adapter implementations
export class ManualAdapter implements SourceAdapter {
  type = 'manual';
  name = 'Manual Single Entry';
  description = 'Directly add individual proxy endpoints with immediate syntax verification';
  supportsAutoSync = false;
  requiresCredentials = false;

  validateConfig() {
    return { valid: true };
  }

  async discover(source: ProxySource, rawPayload?: string): Promise<DiscoveryResult> {
    const raw = rawPayload || source.config?.endpoint || '';
    const parsed = parseProxyString(raw, source.config?.protocol || 'http');
    const endpoints = [parsed];

    return {
      source_id: source.id,
      source_name: source.name,
      endpoints,
      total_discovered: 1,
      valid_count: parsed.is_valid ? 1 : 0,
      invalid_count: parsed.is_valid ? 0 : 1
    };
  }
}

export class BulkPasteAdapter implements SourceAdapter {
  type = 'bulk_paste';
  name = 'Bulk Paste & Text Ingestion';
  description = 'Batch import proxies in multiple formats (host:port, user:pass@host:port, etc.)';
  supportsAutoSync = false;
  requiresCredentials = false;

  validateConfig() {
    return { valid: true };
  }

  async discover(source: ProxySource, rawPayload?: string): Promise<DiscoveryResult> {
    const text = rawPayload || source.config?.raw_text || '';
    const { valid, invalid } = parseBulkProxyList(text, source.config?.protocol || 'http');
    const all = [...valid, ...invalid];

    return {
      source_id: source.id,
      source_name: source.name,
      endpoints: all,
      total_discovered: all.length,
      valid_count: valid.length,
      invalid_count: invalid.length
    };
  }
}

export class FileUploadAdapter implements SourceAdapter {
  type = 'file_upload';
  name = 'CSV & JSON File Importer';
  description = 'Upload structured CSV, TXT, or JSON proxy datasets';
  supportsAutoSync = false;
  requiresCredentials = false;

  validateConfig() {
    return { valid: true };
  }

  async discover(source: ProxySource, rawPayload?: string): Promise<DiscoveryResult> {
    const text = rawPayload || '';
    const { valid, invalid } = parseBulkProxyList(text, source.config?.protocol || 'http');
    const all = [...valid, ...invalid];

    return {
      source_id: source.id,
      source_name: source.name,
      endpoints: all,
      total_discovered: all.length,
      valid_count: valid.length,
      invalid_count: invalid.length
    };
  }
}

export class PublicFeedAdapter implements SourceAdapter {
  type = 'public_feed';
  name = 'Authorized Public Proxy Feeds';
  description = 'Synchronize with authorized public proxy feeds and lists adhering to robots.txt and terms';
  supportsAutoSync = true;
  requiresCredentials = false;

  validateConfig(config: Record<string, any>) {
    if (!config?.url || !config.url.startsWith('http')) {
      return { valid: false, error: 'Feed URL must be a valid HTTP/HTTPS endpoint' };
    }
    return { valid: true };
  }

  async discover(source: ProxySource): Promise<DiscoveryResult> {
    const feedUrl = source.config?.url;
    if (!feedUrl) {
      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: [],
        total_discovered: 0,
        valid_count: 0,
        invalid_count: 0,
        sync_error: 'No feed URL configured'
      };
    }

    try {
      // Security check on feed domain
      const urlObj = new URL(feedUrl);
      const hostSecurity = await validateEndpointSecurity(urlObj.hostname, false);
      if (!hostSecurity.isSafe) {
        throw new Error(`Feed URL blocked by security policy: ${hostSecurity.error}`);
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'AI-Proxy-Intel-Sync/1.0 (Feed Consumer; +https://proxyintel.ai)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }

      const body = await resp.text();
      const { valid, invalid } = parseBulkProxyList(body, source.config?.protocol || 'socks5');
      const all = [...valid, ...invalid];

      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: all,
        total_discovered: all.length,
        valid_count: valid.length,
        invalid_count: invalid.length
      };
    } catch (err: any) {
      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: [],
        total_discovered: 0,
        valid_count: 0,
        invalid_count: 0,
        sync_error: `Feed fetch error: ${err.message}`
      };
    }
  }
}

export class ChromeExtensionAdapter implements SourceAdapter {
  type = 'chrome_extension';
  name = 'Chrome Browser Extension Sync';
  description = 'Imports user-consented active Chrome proxy configuration via extension';
  supportsAutoSync = true;
  requiresCredentials = true;

  validateConfig() {
    return { valid: true };
  }

  async discover(source: ProxySource, rawPayload?: string): Promise<DiscoveryResult> {
    if (!rawPayload) {
      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: [],
        total_discovered: 0,
        valid_count: 0,
        invalid_count: 0
      };
    }

    try {
      const data = JSON.parse(rawPayload);
      const parsed = parseProxyString(data.endpoint || '', data.protocol || 'http');

      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: [parsed],
        total_discovered: 1,
        valid_count: parsed.is_valid ? 1 : 0,
        invalid_count: parsed.is_valid ? 0 : 1
      };
    } catch (err: any) {
      return {
        source_id: source.id,
        source_name: source.name,
        endpoints: [],
        total_discovered: 0,
        valid_count: 0,
        invalid_count: 0,
        sync_error: `Invalid extension payload: ${err.message}`
      };
    }
  }
}

// Registry Manager
class DiscoveryEngine {
  private adapters: Map<string, SourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new ManualAdapter());
    this.registerAdapter(new BulkPasteAdapter());
    this.registerAdapter(new FileUploadAdapter());
    this.registerAdapter(new PublicFeedAdapter());
    this.registerAdapter(new ChromeExtensionAdapter());
  }

  public registerAdapter(adapter: SourceAdapter) {
    this.adapters.set(adapter.type, adapter);
  }

  public getAdapter(type: string): SourceAdapter | undefined {
    return this.adapters.get(type);
  }

  public getAllAdapters(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public async ingestSource(
    source: ProxySource, 
    rawPayload?: string,
    owner_id: string = DEFAULT_OWNER_ID
  ): Promise<{ 
    discoveryResult: DiscoveryResult; 
    insertedCount: number; 
    duplicateCount: number; 
    invalidCount: number 
  }> {
    const adapter = this.getAdapter(source.type);
    if (!adapter) {
      throw new Error(`No adapter found for source type: ${source.type}`);
    }

    const res = await adapter.discover(source, rawPayload);

    let inserted = 0;
    let duplicates = 0;
    let invalidCount = 0;

    for (const ep of res.endpoints) {
      if (!ep.is_valid) {
        invalidCount++;
        // If structurally invalid, insert as quarantined/invalid record so user can inspect and fix
        repo.insertProxy({
          owner_id,
          source_id: source.id,
          source_name: source.name,
          normalized_endpoint: ep.normalized_endpoint || 'invalid://0.0.0.0:0',
          protocol: ep.protocol,
          host: ep.host || 'unknown',
          port: ep.port || 0,
          auth_required: false,
          current_status: 'INVALID',
          last_failure_category: 'STRUCTURAL_VALIDATION_FAILURE',
          last_failure_reason: ep.validation_error || 'Malformed syntax',
          check_interval_seconds: 86400,
          tags: ['quarantined', 'malformed-import']
        });
        continue;
      }

      const { record, is_duplicate } = repo.insertProxy({
        owner_id,
        source_id: source.id,
        source_name: source.name,
        normalized_endpoint: ep.normalized_endpoint,
        protocol: ep.protocol,
        host: ep.host,
        port: ep.port,
        auth_required: !!ep.username,
        username: ep.username,
        password: ep.password,
        current_status: 'UNKNOWN',
        check_interval_seconds: 900,
        tags: [source.type]
      });

      if (is_duplicate) {
        duplicates++;
      } else {
        inserted++;
      }
    }

    return {
      discoveryResult: res,
      insertedCount: inserted,
      duplicateCount: duplicates,
      invalidCount
    };
  }
}

export const discoveryEngine = new DiscoveryEngine();
