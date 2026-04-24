export interface ContractDeployment {
  network: string;
  chainId: number;
  agentRegistryAddress: string;
  usageAuthorizationAddress?: string;
  deployedAt: string;
}
