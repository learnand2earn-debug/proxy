import { ParsedProxyEndpoint } from '@/lib/validation/parser';
import { ProxySource } from '@/types';

export interface DiscoveryResult {
  source_id: string;
  source_name: string;
  endpoints: ParsedProxyEndpoint[];
  total_discovered: number;
  valid_count: number;
  invalid_count: number;
  sync_error?: string;
}

export interface SourceAdapter {
  type: string;
  name: string;
  description: string;
  supportsAutoSync: boolean;
  requiresCredentials: boolean;
  validateConfig(config: Record<string, any>): { valid: boolean; error?: string };
  discover(source: ProxySource, rawPayload?: string): Promise<DiscoveryResult>;
}
