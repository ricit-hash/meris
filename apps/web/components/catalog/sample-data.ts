export type SampleDataset = {
  id: string;
  title: string;
  publisher: string;
  updated: string;
  description: string;
  tags: string[];
  format: string;
  size: string;
  license: string;
  range: string;
  requests: number;
  /** ShelbyUSD per range request. 0 = free listing. */
  priceShelbyUSD: number;
  /** Shelby blob pointer. */
  blobPath: string;
  /** Total data records in the dataset. */
  records: number;
  /** Days since last update — used for Newest sorting. */
  updatedDays: number;
  /** 'range' = sliceable dataset, 'file' = full-file config/prompt. */
  kind: 'range' | 'file';
};

/**
 * SAMPLE data — layout review only. Live listings: 0.
 * Replace with real manifest data once publishers submit.
 */
export const sampleDatasets: SampleDataset[] = [
  {
    id: 'agent-benchmark-traces',
    title: 'Agent Benchmark Traces',
    publisher: 'eval-studio',
    updated: '1 week ago',
    description: 'Labeled agent execution traces with task, tool calls, and outcome fields.',
    tags: ['AI-ready', 'eval'],
    format: 'JSONL',
    size: '86 MB',
    license: 'Research only',
    range: 'Range-ready',
    requests: 31,
    priceShelbyUSD: 0,
    blobPath: 'shelby://eval-studio/datasets/agent-benchmark-traces.jsonl',
    records: 150000,
    updatedDays: 7,
    kind: 'range',
  },
  {
    id: 'aptos-transfer-events',
    title: 'Aptos Transfer Events',
    publisher: 'chain-index',
    updated: '6 hours ago',
    description: 'On-chain transfer event tables per epoch. Request the byte range you need; blob stays on Shelby.',
    tags: ['Web3', 'events'],
    format: 'Parquet',
    size: '480 MB',
    license: 'ODbL',
    range: 'Range-ready',
    requests: 64,
    priceShelbyUSD: 4.5,
    blobPath: 'shelby://chain-index/datasets/aptos-transfer-events.parquet',
    records: 4200000,
    updatedDays: 0,
    kind: 'range',
  },
  {
    id: 'weather-observations',
    title: 'Weather Observations',
    publisher: 'meteo-labs',
    updated: '2 days ago',
    description: 'Hourly weather station readings with explicit schema. Slice by time window or station id.',
    tags: ['AI-ready', 'time-series'],
    format: 'CSV',
    size: '1.2 GB',
    license: 'CC BY 4.0',
    range: 'Range-ready',
    requests: 128,
    priceShelbyUSD: 0,
    blobPath: 'shelby://meteo-labs/datasets/weather-observations.csv',
    records: 8000000,
    updatedDays: 2,
    kind: 'range',
  },
  {
    id: 'token-holder-snapshots',
    title: 'Token Holder Snapshots',
    publisher: 'nansen-arc',
    updated: '3 days ago',
    description: 'Wallet-level token holdings snapshots with cohort labels. Slice by supply percentile.',
    tags: ['Web3', 'cohort'],
    format: 'Parquet',
    size: '2.1 GB',
    license: 'ODbL',
    range: 'Range-ready',
    requests: 47,
    priceShelbyUSD: 12,
    blobPath: 'shelby://nansen-arc/datasets/token-holder-snapshots.parquet',
    records: 12000000,
    updatedDays: 3,
    kind: 'range',
  },
  {
    id: 'gov-proposal-votes',
    title: 'Governance Proposal Votes',
    publisher: 'governance-watch',
    updated: '5 hours ago',
    description: 'On-chain DAO proposal votes with voter, weight, and delegation trail.',
    tags: ['Web3', 'governance'],
    format: 'CSV',
    size: '212 MB',
    license: 'CC BY 4.0',
    range: 'Range-ready',
    requests: 19,
    priceShelbyUSD: 2.25,
    blobPath: 'shelby://governance-watch/datasets/gov-proposal-votes.csv',
    records: 890000,
    updatedDays: 0,
    kind: 'range',
  },
  {
    id: 'rpg-llm-prompt-set',
    title: 'RPG LLM Prompt Set',
    publisher: 'prompt-forge',
    updated: '2 weeks ago',
    description: 'Curated prompt-response pairs across 40 task types with difficulty labels.',
    tags: ['AI-ready', 'prompts'],
    format: 'JSONL',
    size: '34 MB',
    license: 'Research only',
    range: 'Range-ready',
    requests: 88,
    priceShelbyUSD: 0,
    blobPath: 'shelby://prompt-forge/datasets/rpg-llm-prompt-set.jsonl',
    records: 120000,
    updatedDays: 14,
    kind: 'range',
  },
  {
    id: 'defi-liquidity-events',
    title: 'DeFi Liquidity Events',
    publisher: 'liquidity-lens',
    updated: '1 day ago',
    description: 'Add/remove liquidity events with pool, token amounts, and tx hash references.',
    tags: ['Web3', 'defi'],
    format: 'Parquet',
    size: '640 MB',
    license: 'ODbL',
    range: 'Range-ready',
    requests: 22,
    priceShelbyUSD: 8,
    blobPath: 'shelby://liquidity-lens/datasets/defi-liquidity-events.parquet',
    records: 2100000,
    updatedDays: 1,
    kind: 'range',
  },
  {
    id: 'census-block-tables',
    title: 'Census Block Tables',
    publisher: 'statistical-core',
    updated: '1 month ago',
    description: 'Normalized census tables with geography keys and null-rate columns documented.',
    tags: ['Research', 'tabular'],
    format: 'CSV',
    size: '3.4 GB',
    license: 'CC BY 4.0',
    range: 'Range-ready',
    requests: 15,
    priceShelbyUSD: 0,
    blobPath: 'shelby://statistical-core/datasets/census-block-tables.csv',
    records: 25000000,
    updatedDays: 30,
    kind: 'range',
  },
  {
    id: 'agent-safety-reports',
    title: 'Agent Safety Reports',
    publisher: 'eval-studio',
    updated: '4 days ago',
    description: 'Structured incident reports from red-team runs with severity and mitigations.',
    tags: ['AI-ready', 'safety'],
    format: 'JSONL',
    size: '58 MB',
    license: 'Research only',
    range: 'Range-ready',
    requests: 40,
    priceShelbyUSD: 6,
    blobPath: 'shelby://eval-studio/datasets/agent-safety-reports.jsonl',
    records: 45000,
    updatedDays: 4,
    kind: 'range',
  },
  {
    id: 'soul-md-executive',
    title: 'SOUL.md — Executive Agent',
    publisher: 'prompt-forge',
    updated: '3 days ago',
    description: 'A production SOUL.md persona config: identity, principles, tool discipline, and refusal rules for an executive agent.',
    tags: ['Agent', 'config'],
    format: 'Markdown',
    size: '4.8 KB',
    license: 'CC BY 4.0',
    range: 'Full file',
    requests: 214,
    priceShelbyUSD: 9,
    blobPath: 'shelby://prompt-forge/agents/soul-executive.md',
    records: 0,
    updatedDays: 3,
    kind: 'file',
  },
  {
    id: 'agent-tool-guardrails',
    title: 'Agent Tool Guardrails Pack',
    publisher: 'eval-studio',
    updated: '1 day ago',
    description: 'Curated prompt snippets and refusal rules for tool calls, permission boundaries, and escalation paths.',
    tags: ['Agent', 'prompts'],
    format: 'Markdown',
    size: '12 KB',
    license: 'Research only',
    range: 'Full file',
    requests: 96,
    priceShelbyUSD: 0,
    blobPath: 'shelby://eval-studio/agents/tool-guardrails.md',
    records: 0,
    updatedDays: 1,
    kind: 'file',
  },
];

export function getSampleDataset(id: string): SampleDataset | undefined {
  return sampleDatasets.find((d) => d.id === id);
}

export function formatShelbyPrice(priceShelbyUSD: number): string {
  return priceShelbyUSD === 0 ? 'Free' : `${priceShelbyUSD.toFixed(2)} sUSD`;
}

export const filterGroups = [
  {
    label: 'Category',
    options: ['AI-ready', 'Web3', 'Research', 'Agent'],
    counts: [4, 4, 1, 2],
  },
  {
    label: 'Delivery',
    options: ['Range-ready', 'Full file'],
    counts: [9, 2],
  },
  {
    label: 'Price',
    options: ['Free', 'Paid'],
    counts: [4, 7],
  },
  {
    label: 'License',
    options: ['CC BY 4.0', 'ODbL', 'Research only'],
    counts: [4, 3, 4],
  },
] as const;

export const sortOptions = ['Most requested', 'Newest', 'Price: low to high', 'Alphabetical'] as const;
