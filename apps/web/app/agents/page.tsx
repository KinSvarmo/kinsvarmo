import { AgentsMarketplaceClient } from "./AgentsMarketplaceClient";
import { getMintedAgents } from "@/lib/agents";
import { seededAgents } from "@kingsvarmo/shared";

export const metadata = {
  title: "Browse Agents — KinSvarmo",
  description: "Discover private scientific analysis agents published as iNFTs on 0G.",
};

export default async function AgentsPage() {
  const mintedAgents = await getMintedAgents();
  const agentsToShow = mintedAgents.length > 0 ? mintedAgents : seededAgents;
  return <AgentsMarketplaceClient initialAgents={agentsToShow} />;
}
