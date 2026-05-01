export const ZERO_G_STORAGE_PROXY_PATH = "/0g-indexer";

export function getBrowserZeroGIndexerRpc(): string {
  return ZERO_G_STORAGE_PROXY_PATH;
}

export function getZeroGIndexerDestination(): string {
  return (
    process.env.ZERO_G_STORAGE_ENDPOINT ??
    process.env.NEXT_PUBLIC_0G_INDEXER_RPC ??
    "https://indexer-storage-testnet-turbo.0g.ai"
  );
}
