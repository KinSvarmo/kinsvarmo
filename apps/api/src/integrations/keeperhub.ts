import {
  createKeeperHubClientFromEnv,
  type KeeperHubClient
} from "@kingsvarmo/keeperhub";

export function createBackendKeeperHubClient(
  env: Record<string, string | undefined> = process.env
): KeeperHubClient {
  return createKeeperHubClientFromEnv(env);
}
