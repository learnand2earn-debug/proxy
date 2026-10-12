import { repo, DEFAULT_OWNER_ID } from '../db/repository';
import { maskEndpoint } from '../validation/parser';
import { checkProxyEndpoint } from '../checker/engine';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result?: any;
  }>;
}

export interface AIResponse {
  answer: string;
  toolsUsed: string[];
  dataPayload?: any;
}

/**
 * Handles user query via intelligent tool selection against real database state.
 */
export async function processAIChat(
  query: string,
  owner_id: string = DEFAULT_OWNER_ID
): Promise<AIResponse> {
  const q = query.toLowerCase().trim();
  const toolsUsed: string[] = [];

  // 1. Tool: List active proxies
  if (q.includes('active') && (q.includes('show') || q.includes('list') || q.includes('find') || q.includes('what'))) {
    toolsUsed.push('list_active_proxies');
    const { data } = repo.getProxies({ owner_id, status: 'ACTIVE' });
    const count = data.length;

    let answer = `### Active Proxies Report\n\n`;
    answer += `I found **${count}** currently active proxy endpoint${count === 1 ? '' : 's'}:\n\n`;

    if (count > 0) {
      answer += `| Protocol | Endpoint | Latency | Country | Anonymity |\n`;
      answer += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const p of data.slice(0, 10)) {
        answer += `| \`${p.protocol.toUpperCase()}\` | \`${maskEndpoint(p.normalized_endpoint)}\` | **${p.last_latency_ms || 0}ms** | ${p.country_code || 'XX'} | ${p.anonymity || 'unknown'} |\n`;
      }
      if (count > 10) {
        answer += `\n*Showing top 10 of ${count} active records. View the All Proxies page for the complete list.*`;
      }
    } else {
      answer += `No proxies are currently marked as \`ACTIVE\`. Run a health check from the Inactive or All Proxies tab to test connectivity.`;
    }

    return { answer, toolsUsed, dataPayload: data };
  }

  // 2. Tool: Which inactive proxies recovered today?
  if (q.includes('recover') || (q.includes('inactive') && q.includes('today'))) {
    toolsUsed.push('list_recovered_today');
    const transitions = repo.getTransitions(owner_id).filter(t => t.from_status === 'INACTIVE' && t.to_status === 'ACTIVE');
    const count = transitions.length;

    let answer = `### Proxy Recovery Report\n\n`;
    answer += `**${count}** proxy transition${count === 1 ? '' : 's'} from \`INACTIVE\` to \`ACTIVE\` were recorded today:\n\n`;

    if (count > 0) {
      answer += `| Timestamp | Masked Endpoint | Measured Latency | Diagnostic Reason |\n`;
      answer += `| :--- | :--- | :--- | :--- |\n`;
      for (const t of transitions) {
        answer += `| ${new Date(t.transitioned_at).toLocaleTimeString()} | \`${t.endpoint_masked}\` | **${t.latency_ms || 0}ms** | ${t.reason || 'Health check passed'} |\n`;
      }
    } else {
      answer += `No inactive proxies have transitioned to active yet today. Inactive monitoring schedules will continue polling with backoff.`;
    }

    return { answer, toolsUsed, dataPayload: transitions };
  }

  // 3. Tool: Why did this endpoint fail / diagnostic explanation
  if (q.includes('why') || q.includes('fail') || q.includes('error') || q.includes('reason')) {
    toolsUsed.push('explain_endpoint_failure');
    const { data: inactiveProxies } = repo.getProxies({ owner_id, status: 'INACTIVE' });
    const { data: invalidProxies } = repo.getProxies({ owner_id, status: 'INVALID' });
    const failing = [...inactiveProxies, ...invalidProxies];

    let answer = `### Diagnostic Failure Analysis\n\n`;
    if (failing.length > 0) {
      answer += `Identified **${failing.length}** failing or invalid proxy endpoints:\n\n`;
      for (const p of failing.slice(0, 5)) {
        answer += `* **\`${maskEndpoint(p.normalized_endpoint)}\`**\n`;
        answer += `  - **Category**: \`${p.last_failure_category || 'NETWORK_FAILURE'}\`\n`;
        answer += `  - **Detailed Diagnostic**: ${p.last_failure_reason || 'No specific error message recorded'}\n`;
        answer += `  - **Consecutive Failures**: ${p.consecutive_failures}\n`;
        answer += `  - **Quarantined**: ${p.is_quarantined ? 'Yes (Protected)' : 'No'}\n\n`;
      }
      answer += `> **Technical Insight**: Timeouts usually indicate unreachable hosts, firewall drops, or dead ports. Structural failures mean the host/port was syntactically malformed upon ingest.`;
    } else {
      answer += `Good news! There are currently no failing or invalid proxies recorded in your inventory.`;
    }

    return { answer, toolsUsed, dataPayload: failing };
  }

  // 4. Tool: Find malformed entries
  if (q.includes('malform') || q.includes('syntax') || q.includes('bad') || q.includes('invalid')) {
    toolsUsed.push('find_malformed_entries');
    const { data: invalid } = repo.getProxies({ owner_id, status: 'INVALID' });

    let answer = `### Structural & Syntax Validation Audit\n\n`;
    answer += `Detected **${invalid.length}** structurally invalid or quarantined records:\n\n`;

    if (invalid.length > 0) {
      for (const item of invalid) {
        answer += `* **Endpoint**: \`${maskEndpoint(item.normalized_endpoint)}\`\n`;
        answer += `  - Reason: *${item.last_failure_reason || item.quarantine_reason || 'Syntax validation failed'}*\n`;
        answer += `  - Status: \`INVALID / QUARANTINED\` (You can restore or edit this in Quarantined Proxies tab)\n\n`;
      }
    } else {
      answer += `All proxy endpoints currently pass RFC host and port syntax validations.`;
    }

    return { answer, toolsUsed, dataPayload: invalid };
  }

  // 5. Tool: Show proxies not checked recently (stale)
  if (q.includes('not checked') || q.includes('recent') || q.includes('stale') || q.includes('schedule')) {
    toolsUsed.push('list_stale_proxies');
    const { data: proxies } = repo.getProxies({ owner_id });
    const oneHourAgo = Date.now() - 3600000;
    const stale = proxies.filter(p => !p.last_checked_at || new Date(p.last_checked_at).getTime() < oneHourAgo);

    let answer = `### Health-Check Freshness Audit\n\n`;
    answer += `Found **${stale.length}** proxies that have not been checked in the past 60 minutes:\n\n`;

    if (stale.length > 0) {
      for (const p of stale.slice(0, 8)) {
        answer += `* \`${p.protocol.toUpperCase()}\` \`${maskEndpoint(p.normalized_endpoint)}\` — Last checked: ${p.last_checked_at ? new Date(p.last_checked_at).toLocaleString() : 'Never'}\n`;
      }
    } else {
      answer += `All active inventory proxies have been checked recently within the configured schedules.`;
    }

    return { answer, toolsUsed, dataPayload: stale };
  }

  // 6. Default / Summary tool: Summarize today's discovery and health-check results
  toolsUsed.push('summarize_daily_metrics');
  const stats = repo.getDashboardStats(owner_id);

  let answer = `### AI System Intelligence Summary\n\n`;
  answer += `Here is the current state of your proxy intelligence infrastructure:\n\n`;
  answer += `* **Total Tracked Proxies**: ${stats.total_discovered}\n`;
  answer += `* **Active & Ready**: ${stats.active_count} (${stats.uptime_percentage}% uptime)\n`;
  answer += `* **Inactive (Monitoring)**: ${stats.inactive_count}\n`;
  answer += `* **Quarantined / Malformed**: ${stats.quarantined_count}\n`;
  answer += `* **Authentication Required**: ${stats.auth_required_count}\n`;
  answer += `* **Checks Executed Today**: ${stats.checks_completed_today}\n`;
  answer += `* **Recoveries Recorded**: ${stats.recovered_recently_count}\n`;
  answer += `* **Average Response Latency**: ${stats.average_latency_ms}ms\n\n`;
  answer += `> **Suggestions**:\n`;
  answer += `> 1. You can ask me: *"Show all currently active proxies"* or *"Why did this endpoint fail?"*\n`;
  answer += `> 2. Chrome Extension sync is configured to monitor your browser proxy in real time.\n`;
  answer += `> 3. Click any row in the proxy tables to trigger an instant diagnostic ping.`;

  return { answer, toolsUsed, dataPayload: stats };
}
