export type DatasetCategory = 'AI-ready' | 'Web3' | 'Research' | 'Agent';

/** 'range' = sliceable dataset (Shelby range access). 'file' = small config/prompt, full-file only. */
export type DeliveryKind = 'range' | 'file';

export type DatasetDraft = {
  id: string;
  name: string;
  description: string;
  category: DatasetCategory;
  format: string;
  license: string;
  /** ShelbyUSD. 0 = free listing. */
  priceShelbyUSD: number;
  /** Shelby blob pointer, e.g. shelby://account/datasets/weather.parquet */
  blobPath: string;
  fileSize: string;
  /** Total data records — only for range-delivery listings. */
  records: number;
  kind: DeliveryKind;
  createdAt: number;
};

const KEY = 'meris_datasets';
const LEGACY_KEY = 'aletheia_datasets';

export function getDatasets(): DatasetDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = window.localStorage.getItem(KEY);
    const legacy = current ? null : window.localStorage.getItem(LEGACY_KEY);
    if (legacy) window.localStorage.setItem(KEY, legacy);
    const raw = current ?? legacy;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DatasetDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDataset(draft: DatasetDraft): void {
  if (typeof window === 'undefined') return;
  const list = getDatasets();
  list.unshift(draft);
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

/** Shape a publisher draft so the catalog card and range request can render it. */
export type CatalogListing = {
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
  priceShelbyUSD: number;
  blobPath: string;
  records: number;
  updatedDays: number;
  /** Epoch ms when the blob was uploaded (manifest listings). */
  uploadedAt?: number;
  isMine: boolean;
  kind: DeliveryKind;
};

export function draftToListing(draft: DatasetDraft, username: string): CatalogListing {
  const days = Math.max(0, Math.floor((Date.now() - draft.createdAt) / 86_400_000));
  // Drafts saved before the USD -> ShelbyUSD rename may still carry priceUsd.
  const price = draft.priceShelbyUSD ?? (draft as DatasetDraft & { priceUsd?: number }).priceUsd ?? 0;
  const kind = draft.kind ?? 'range';
  const records = draft.records ?? 0;
  return {
    id: draft.id,
    title: draft.name,
    publisher: username,
    updated: days === 0 ? 'Just now' : days === 1 ? '1 day ago' : `${days} days ago`,
    description: draft.description || 'No description provided yet.',
    tags: [draft.category],
    format: draft.format,
    size: draft.fileSize,
    license: draft.license,
    range: kind === 'file' ? 'Full file' : 'Range-ready',
    requests: 0,
    priceShelbyUSD: price,
    blobPath: draft.blobPath,
    records,
    updatedDays: days,
    isMine: true,
    kind,
  };
}
