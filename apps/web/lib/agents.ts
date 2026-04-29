import { createPublicClient, http, parseAbiItem, zeroAddress } from "viem";
import { ogTestnet } from "./chain";
import { CONTRACT_ADDRESSES, INFTRegistryABI } from "./contracts";
import type { AgentListing } from "@kingsvarmo/shared";

const publicClient = createPublicClient({
  chain: ogTestnet,
  transport: http(),
});

export async function getMintedAgents(): Promise<AgentListing[]> {
  const address = CONTRACT_ADDRESSES.INFTRegistry;
  if (!address || address === zeroAddress) {
    return [];
  }

  try {
    const logs = await publicClient.getLogs({
      address,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      args: {
        from: zeroAddress,
      },
      fromBlock: "earliest",
    });

    const tokenIds = logs.map((log) => log.args.tokenId!).filter(Boolean);

    const agents: AgentListing[] = [];

    for (const tokenId of tokenIds) {
      try {
        const metadata = await publicClient.readContract({
          address,
          abi: INFTRegistryABI,
          functionName: "getAgentMetadata",
          args: [tokenId],
        });
        
        const owner = await publicClient.readContract({
          address,
          abi: INFTRegistryABI,
          functionName: "ownerOf",
          args: [tokenId],
        });

        const slug = metadata[0].toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

        agents.push({
          id: tokenId.toString(),
          onchainTokenId: tokenId.toString(),
          contractAddress: address,
          name: metadata[0] || "Unnamed Agent",
          slug: slug || `agent-${tokenId}`,
          creatorName: metadata[3] || "Unknown Creator",
          creatorWallet: owner,
          description: metadata[1] || "No description provided.",
          domain: metadata[2] || "research-ops",
          supportedFormats: ["csv", "json"], // Default formats
          priceIn0G: "0.01", // USAGE_FEE from contract
          runtimeEstimateSeconds: 90,
          status: "published",
          previewOutput: metadata[4] || "A deterministic report with confidence and key findings.",
          expectedOutput: "A deterministic report with confidence, key findings, and structured JSON.",
          privacyNotes: "Secure execution using 0G Compute.",
          intelligenceReference: metadata[5],
          storageReference: metadata[6],
          createdAt: new Date().toISOString(), // Fallback
        });
      } catch (err) {
        console.warn(`Failed to fetch metadata for token ${tokenId}`, err);
      }
    }

    return agents.reverse(); // Newest first
  } catch (err) {
    console.error("Failed to fetch minted agents from contract:", err);
    return [];
  }
}
