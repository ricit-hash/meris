import { Network, type AptosSettings } from '@aptos-labs/ts-sdk';
import type { ShelbyClientConfig } from '@shelby-protocol/sdk/node';

type ShelbyNetworkName = Network.SHELBYNET | Network.TESTNET | Network.LOCAL;

/**
 * Build one Shelby SDK config for blob and payment clients.
 *
 * Early Access testnet keys are accepted by Aptos fullnode through `x-api-key`.
 * Passing the same key as AptosSettings.API_KEY makes ts-sdk send it as
 * `Authorization: Bearer`, which testnet rejects with 401.
 */
export function getShelbyClientConfig(params: {
  network: ShelbyNetworkName;
  apiKey: string;
}): ShelbyClientConfig {
  const aptos: AptosSettings | undefined =
    params.network === 'testnet'
      ? {
          clientConfig: {
            API_KEY: undefined,
            HEADERS: { 'x-api-key': params.apiKey },
          },
        }
      : undefined;

  return {
    network: params.network,
    apiKey: params.apiKey,
    aptos,
  };
}

export function getShelbyNetworkName(): ShelbyNetworkName {
  switch (process.env.SHELBY_NETWORK?.trim()) {
    case 'testnet':
      return Network.TESTNET;
    case 'local':
      return Network.LOCAL;
    default:
      return Network.SHELBYNET;
  }
}
