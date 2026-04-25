import { parseRealPortOffset, prepareRealAxlFiles } from "./real-network";

const portOffset = parseRealPortOffset();
const nodes = prepareRealAxlFiles(undefined, portOffset);

console.log("Generated real AXL config files:");

for (const node of nodes) {
  console.log(`${node.participant}: ${node.configPath}`);
}

console.log("\nNext:");
console.log("pnpm axl:real:nodes");
console.log("");
console.log("If local AXL ports are already busy, use the same offset for every command:");
console.log("AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:nodes");
