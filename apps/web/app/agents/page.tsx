import { AgentsMarketplaceClient } from "./AgentsMarketplaceClient";

export const metadata = {
  title: "Browse Agents — KinSvarmo",
  description: "Discover private scientific analysis agents published as iNFTs on 0G.",
};

export default function AgentsPage() {
  return <AgentsMarketplaceClient />;
}
