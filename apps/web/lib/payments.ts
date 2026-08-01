// Server-only module: imported exclusively by app/api/* route handlers.
// Never import this from a client component.
import { Aptos, AptosConfig, Network, Ed25519Account, Ed25519PrivateKey, AccountAddress } from '@aptos-labs/ts-sdk';
import { ShelbyMicropaymentChannelClient } from '@shelby-protocol/sdk/node';
import { getShelbyClientConfig, getShelbyNetworkName } from './shelby-config';
import {
  addPendingChannelKey,
  getPendingChannelKey,
  removePendingChannelKey,
  addConfirmedChannelKey,
} from './channel-keys';
import { storeMicropaymentApproval, getMicropaymentApprovals } from './micropayments';

/** ShelbyUSD FA metadata address (verified live on Aptos testnet). */
export const SHELBYUSD_METADATA = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1';

/** shelby_usd token module (verified live on Aptos testnet). */
export const SHELBYUSD_MODULE =
  '0x249f5c642a63885ff88a5113b3ba0079840af5a1357706f8c7f3bfc5dd12511f::shelby_usd';

/** ShelbyUSD decimals — standard token decimals unless overridden. */
function shelbyDecimals(): number {
  const n = Number(process.env.SHELBYUSD_DECIMALS ?? 8);
  return Number.isFinite(n) && n >= 0 ? n : 8;
}

/**
 * Map the SHELBY_NETWORK env (shelbynet | testnet | local) to the Aptos
 * Network used for chain RPC, blob operations, and micropayments.
 */
export function getShelbyNetwork(): Network.TESTNET | Network.SHELBYNET | Network.LOCAL {
  switch (process.env.SHELBY_NETWORK?.trim()) {
    case 'testnet':
      return Network.TESTNET;
    case 'local':
      return Network.LOCAL;
    default:
      return Network.SHELBYNET;
  }
}

let aptos: Aptos | null = null;

export function getShelbyAptos(): Aptos | null {
  const apiKey = process.env.SHELBY_API_KEY?.trim();
  if (!apiKey) return null;
  if (aptos) return aptos;
  const config = getShelbyClientConfig({ network: getShelbyNetworkName(), apiKey });
  aptos = new Aptos(new AptosConfig({ network: getShelbyNetwork(), ...config.aptos }));
  return aptos;
}

let micropayment: ShelbyMicropaymentChannelClient | null = null;

/** Shelby micropayment channel client (server-side). */
export function getMicropaymentClient(): ShelbyMicropaymentChannelClient | null {
  const apiKey = process.env.SHELBY_API_KEY?.trim();
  if (!apiKey) return null;
  if (micropayment) return micropayment;
  const aptosClient = getShelbyAptos();
  if (!aptosClient) return null;
  micropayment = new ShelbyMicropaymentChannelClient(getShelbyClientConfig({
    network: getShelbyNetworkName(),
    apiKey,
  }));
  return micropayment;
}

/**
 * Resolve the buyer's primary fungible-store address for ShelbyUSD.
 * Verified on testnet: `primary_store_address<Metadata>(owner, hex(metadata))`.
 */
export async function getShelbyStoreAddress(owner: string): Promise<string> {
  const client = getShelbyAptos();
  if (!client) throw new Error('Shelby is not configured. Add SHELBY_API_KEY to the server environment.');
  const view = await client.view({
    payload: {
      function: '0x1::primary_fungible_store::primary_store_address',
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [owner, SHELBYUSD_METADATA.replace('0x', '')],
    },
  });
  const store = String(view[0]);
  if (!store.startsWith('0x')) throw new Error('Could not resolve the buyer primary fungible store.');
  return store;
}

export type TransferQuote = {
  amountShelbyUSD: number;
  amountOnChain: string;
  receiver: string;
  sender: string;
  fungibleAssetAddress: string;
  expirationMicros: number;
  /** Input payload the buyer wallet signs & submits (buyer pays gas). */
  payload: {
    function: string;
    typeArguments: string[];
    functionArguments: unknown[];
  };
  /** Key into the pending channel-key store; must be confirmed after create. */
  pendingKeyId: string;
};

const CHANNEL_TTL_MICROS = 7 * 24 * 60 * 60 * 1_000_000; // 7 days

/**
 * Prepare a micropayment-channel creation for a paid listing. The server mints
 * an ephemeral Ed25519 keypair for the channel; its public key is embedded in
 * the create_channel payload so the buyer (who signs the deposit transaction)
 * never handles channel signing keys. The server keeps the private key to
 * produce WithdrawApproval signatures for the publisher's withdrawal.
 */
export async function prepareChannelCreation(params: {
  sender: string;
  receiver: string;
  amountOnChain: string;
}): Promise<TransferQuote> {
  const client = getMicropaymentClient();
  if (!client) throw new Error('Shelby is not configured. Add SHELBY_API_KEY to the server environment.');

  if (!params.receiver.startsWith('0x')) {
    throw new Error('Publisher wallet address is missing on this listing.');
  }

  const channelKey = Ed25519PrivateKey.generate();
  const amountOnChainNum = Number(params.amountOnChain);

  const pendingKeyId = addPendingChannelKey({
    sender: params.sender,
    receiver: params.receiver,
    privateKeyHex: channelKey.toString(),
    deposit: params.amountOnChain,
    createdAt: Date.now(),
  });

  const payload = ShelbyMicropaymentChannelClient.makeCreateMicropaymentChannelPayload({
    receiver: AccountAddress.fromString(params.receiver),
    expirationMicros: Date.now() * 1000 + CHANNEL_TTL_MICROS,
    depositAmount: amountOnChainNum,
    fungibleAssetAddress: AccountAddress.fromString(SHELBYUSD_METADATA),
    publicKey: channelKey.publicKey().toUint8Array(),
  });

  return {
    amountShelbyUSD: Number(params.amountOnChain) / 10 ** shelbyDecimals(),
    amountOnChain: params.amountOnChain,
    receiver: params.receiver,
    sender: params.sender,
    fungibleAssetAddress: SHELBYUSD_METADATA,
    expirationMicros: Date.now() * 1000 + CHANNEL_TTL_MICROS,
    payload: normalizeChannelPayload(payload as TransferQuote['payload']),
    pendingKeyId,
  };
}

/**
 * The SDK's create_channel payload embeds BCS-wrapped values (AccountAddress
 * `{data}` objects and `{values}` u8 vectors) that ts-sdk's build.simple and
 * some wallets reject. Normalize to plain hex strings / numbers.
 */
function normalizeChannelPayload(payload: {
  function: string;
  typeArguments?: unknown[];
  functionArguments: unknown[];
}): TransferQuote['payload'] {
  function toHexBytes(arg: unknown): string {
    if (typeof arg === 'string') return arg;
    const rec = arg as { data?: Record<string, number>; values?: Array<{ value: number }> };
    if (rec?.data) {
      const bytes = Object.values(rec.data);
      return '0x' + Buffer.from(bytes).toString('hex');
    }
    if (rec?.values) {
      const bytes = rec.values.map((v) => v.value);
      return '0x' + Buffer.from(bytes).toString('hex');
    }
    return String(arg);
  }

  function toBytes(arg: unknown): number[] {
    const toArr = (bytes: ArrayLike<number>): number[] => Array.from(bytes);
    if (arg instanceof Uint8Array) return toArr(arg);
    const rec = arg as { data?: Record<string, number>; values?: Array<{ value: number }> };
    if (rec?.data) return toArr(Object.values(rec.data));
    if (rec?.values) return rec.values.map((v) => v.value);
    if (typeof arg === 'string') {
      const clean = arg.replace('0x', '');
      return toArr(Buffer.from(clean, 'hex'));
    }
    return [];
  }

  const [receiver, expiration, deposit, metadata, publicKey] = payload.functionArguments;
  return {
    function: payload.function,
    typeArguments: [],
    functionArguments: [
      toHexBytes(receiver),
      String(expiration),
      String(deposit),
      toHexBytes(metadata),
      toBytes(publicKey),
    ],
  };
}

export type ConfirmedChannel = {
  funded: boolean;
  channelId: string;
  balance: string;
  /** BCS withdrawal-approval message the buyer's channel key signs. */
  approvalMessageHex: string;
};

/**
 * Confirm a created channel on-chain and, when funded, produce the signed
 * WithdrawApproval the publisher needs. Uses the server-held channel key.
 */
export async function confirmChannelAndBuildApproval(params: {
  sender: string;
  receiver: string;
  minAmountOnChain: string;
  pendingKeyId?: string;
}): Promise<ConfirmedChannel> {
  const client = getMicropaymentClient();
  if (!client) throw new Error('Shelby is not configured. Add SHELBY_API_KEY to the server environment.');

  const pending = params.pendingKeyId ? getPendingChannelKey(params.pendingKeyId) : null;
  if (!pending) throw new Error('No pending channel key for this request.');

  const channels = await client.getChannelInfo({
    sender: AccountAddress.fromString(params.sender),
    receiver: AccountAddress.fromString(params.receiver),
  });
  const channel = channels.find((c) => c.fungibleAssetAddress.toString() === SHELBYUSD_METADATA);
  if (!channel) throw new Error('Channel not found on-chain after create.');

  const min = BigInt(params.minAmountOnChain);
  if (channel.balance < min) {
    return {
      funded: false,
      channelId: channel.paymentChannelId.toString(),
      balance: channel.balance.toString(),
      approvalMessageHex: '',
    };
  }

  // Server signs the WithdrawApproval with the channel keypair.
  const channelAccount = new Ed25519Account({
    privateKey: new Ed25519PrivateKey(pending.privateKeyHex),
  });
  const micropayment = client.createMicropayment({
    sender: channelAccount,
    receiver: AccountAddress.fromString(params.receiver),
    fungibleAssetAddress: AccountAddress.fromString(SHELBYUSD_METADATA),
    amount: BigInt(pending.deposit),
    paymentChannelId: channel.paymentChannelId,
    sequenceNumber: channel.nextWithdrawnSequenceNumber,
  });

  // Keep the key + approval so the publisher can withdraw later.
  addConfirmedChannelKey({
    ...pending,
    channelId: channel.paymentChannelId.toString(),
  });
  storeMicropaymentApproval({
    sender: params.sender,
    receiver: params.receiver,
    channelId: channel.paymentChannelId.toString(),
    amount: pending.deposit,
    sequenceNumber: channel.nextWithdrawnSequenceNumber.toString(),
    publicKeyHex: Buffer.from(channelAccount.publicKey.toUint8Array()).toString('hex'),
    signatureHex: Buffer.from(micropayment.signature).toString('hex'),
    status: 'pending',
  });
  if (params.pendingKeyId) removePendingChannelKey(params.pendingKeyId);

  return {
    funded: true,
    channelId: channel.paymentChannelId.toString(),
    balance: channel.balance.toString(),
    approvalMessageHex: Buffer.from(micropayment.getSignedMessage()).toString('hex'),
  };
}

/** Build the receiver_withdraw payload for the publisher's wallet. */
export function buildWithdrawPayload(params: {
  sender: string;
  receiver: string;
  channelId: string;
}): { payload: TransferQuote['payload']; micropaymentId: string } {
  const approval = getMicropaymentApprovals().find(
    (m) => m.channelId === params.channelId && m.receiver === params.receiver && m.status === 'pending',
  );
  if (!approval) throw new Error('No pending micropayment approval for this channel.');

  const payload = ShelbyMicropaymentChannelClient.createMicropaymentTransactionPayload({
    sender: AccountAddress.fromString(params.sender),
    fungibleAssetAddress: AccountAddress.fromString(SHELBYUSD_METADATA),
    amount: BigInt(approval.amount),
    paymentChannelId: BigInt(approval.channelId),
    sequenceNumber: BigInt(approval.sequenceNumber),
    signature: Buffer.from(approval.signatureHex, 'hex'),
  });

  return {
    payload: normalizeWithdrawPayload(payload as TransferQuote['payload']),
    micropaymentId: approval.id,
  };
}

/** Normalize receiver_withdraw payload args to JSON-safe strings/arrays. */
function normalizeWithdrawPayload(payload: {
  function: string;
  functionArguments: unknown[];
}): TransferQuote['payload'] {
  function toHexBytes(arg: unknown): string {
    if (typeof arg === 'string') return arg;
    const rec = arg as { data?: Record<string, number>; values?: Array<{ value: number }> };
    if (rec?.data) return '0x' + Buffer.from(Object.values(rec.data)).toString('hex');
    if (rec?.values) return '0x' + Buffer.from(rec.values.map((v) => v.value)).toString('hex');
    return String(arg);
  }
  function toBytes(arg: unknown): number[] {
    const rec = arg as { data?: Record<string, number>; values?: Array<{ value: number }> };
    if (rec?.data) return Array.from(Object.values(rec.data));
    if (rec?.values) return rec.values.map((v) => v.value);
    if (typeof arg === 'string') return Array.from(Buffer.from(arg.replace('0x', ''), 'hex'));
    return [];
  }
  const [sender, metadata, amount, channelId, sequenceNumber, signature] = payload.functionArguments;
  return {
    function: payload.function,
    typeArguments: [],
    functionArguments: [
      toHexBytes(sender),
      toHexBytes(metadata),
      String(amount),
      String(channelId),
      String(sequenceNumber),
      toBytes(signature),
    ],
  };
}

/** Wait for an on-chain transaction and throw unless it succeeded. */
export async function verifyTransaction(hash: string): Promise<void> {
  const client = getShelbyAptos();
  if (!client) throw new Error('Shelby is not configured. Add SHELBY_API_KEY to the server environment.');
  if (!/^0x[0-9a-fA-F]{1,}$/.test(hash)) throw new Error('Invalid transaction hash.');
  await client.waitForTransaction({
    transactionHash: hash,
    options: { checkSuccess: true, timeoutSecs: 60 },
  });
}
