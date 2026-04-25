### Assigned cards for UI person

Build Landing Page
Build Marketplace Page
Build Agent Detail Page
Build Upload and Run Page
Build Job Status Page
Build Final Result Page
AXL UI: Show Communication Log in Job Status Page
0G UI: Show Onchain Metadata in Agent Detail Page
0G UI: Show Provenance and 0G References in Result Page
KeeperHub UI: Show Execution State in Job Status Page
Build Creator Dashboard Skeleton
Build Create Agent Form
0G UI: Show Publish Fields in Create Agent Form
Add Classroom Mode Static Prototype


### Idea

INFT Scientific Swarm
A Decentralized Infrastructure for Autonomous Scientific Research Agents on 0G

1. Executive Summary
INFT Scientific Swarm is a decentralized protocol for autonomous scientific analysis agents. Researchers mint private, monetizable scientific agents as iNFTs (ERC-7857) on 0G, then allow external users to pay in 0G token to run secure, auditable analyses against uploaded datasets.
The protocol is designed as a pay-as-you-research network:
Scientists create and own the analysis logic.
Users pay only when they need an analysis.
Compute runs privately on decentralized infrastructure.
Multi-agent coordination improves quality and interpretability.
Every execution produces an auditable onchain and storage-backed provenance trail.
Our pilot use case is phytochemistry and plant metabolomics analysis, though the architecture is generalizable to many scientific domains such as materials science, genomics, environmental chemistry, and medical imaging.
The strongest hackathon positioning is:
Primary sponsor: 0G
Secondary sponsor: Gensyn
Secondary sponsor: KeeperHub
This combination creates a coherent product story: private scientific iNFTs on 0G, coordinated through peer-to-peer agent communication on Gensyn AXL, and executed reliably through KeeperHub.

2. Problem Statement
Scientific workflows remain fragmented, expensive, and difficult to monetize.
Researchers often face several structural problems:
Proprietary scripts and models are hard to share safely without giving away intellectual property.
Cloud compute is expensive and centralized.
Scientific services are difficult to price and automate for global users.
Reproducibility is weak because analysis pipelines, execution conditions, and outputs are not consistently logged.
Most research tools are not designed for autonomous agent interaction.
At the same time, many scientists do not want to manage niche application tokens, complex governance systems, or speculative tokenomics. They want a simple utility model: upload data, pay for analysis, receive results.
INFT Scientific Swarm addresses this by using 0G token as the single economic unit for storage, compute, execution, and access.

3. Vision
Our vision is a borderless scientific network where intelligent non-fungible tokens act as autonomous researchers.
Each iNFT becomes:
a piece of scientific intellectual property,
a programmable analysis service,
a monetizable agent,
and a reusable component in larger scientific agent swarms.
Rather than selling static software, researchers publish living agents that can:
analyze new data,
explain results,
collaborate with other agents,
and continuously generate value from expertise.

4. Core Product Concept
4.1 What the Protocol Does
A researcher mints an iNFT containing encrypted scientific logic and model artifacts. A user uploads a dataset and pays in 0G token for one execution. The protocol grants temporary execution rights, runs the workflow on decentralized compute, coordinates multiple specialist agents, and returns an interpretable scientific report.
4.2 What Makes It Different
The product is differentiated by five properties:
Private scientific IP
The researcher’s core logic remains encrypted and is not exposed to the user.
Single-token utility economy
All operations are paid in 0G token. No secondary token is required.
Agent-native design
The system is not just a storage layer or a notebook wrapper. It is built around autonomous agents.
Swarm-based analysis
Multiple agents can collaborate in a planner–analyzer–critic workflow to improve output quality.
Auditable science
Inputs, outputs, execution state, and provenance references can be committed to a verifiable trail.

5. Sponsor-Aligned Positioning
5.1 0G Alignment
This project directly fits the 0G autonomous agents / swarms / iNFT track because it uses:
ERC-7857 iNFTs for ownership and monetization,
0G Storage for encrypted intelligence and dataset handling,
0G Compute for analysis execution,
0G Chain for payment, authorization, and rights management.
This is the core sponsor story.
5.2 Gensyn Alignment
The protocol is stronger when the analysis is not performed by a single agent. We extend the design into a scientific swarm where different agents communicate across separate nodes using Gensyn AXL.
Example roles:
Planner Agent: interprets the task and selects the workflow.
Analyzer Agent: runs the scientific model or statistical pipeline.
Critic Agent: evaluates confidence, consistency, and possible failure modes.
This gives us genuine peer-to-peer agent coordination rather than a single monolithic script.
5.3 KeeperHub Alignment
KeeperHub becomes the execution and reliability layer for the protocol. It handles:
task triggering,
execution orchestration,
retry logic,
workflow status,
traceability,
and production-grade reliability for onchain-connected agent actions.
This makes the scientific workflow operational rather than purely conceptual.
5.4 Optional Uniswap Expansion
A future extension can allow users to pay in a common asset such as USDC and automatically settle into 0G token through Uniswap. This is not required for the MVP. It should only be included if implemented as a real, central user flow.

6. System Architecture
6.1 Main Components
Component
Role in the Protocol
0G Chain
Payment handling, authorization, access rights, iNFT ownership
ERC-7857 iNFT
Encapsulates the scientific agent and access logic
0G Storage
Stores encrypted models, scripts, memory, and datasets
0G Compute
Executes scientific inference and analysis jobs
Gensyn AXL
Enables peer-to-peer coordination across specialized agents
KeeperHub
Handles reliable execution, retries, and workflow orchestration
Web App / Dashboard
User interface for upload, payment, monitoring, and result review

6.2 Agent Topology
The recommended swarm structure for the MVP is:
Planner Agent
receives the analysis request
validates job type
selects the correct analysis workflow
Analyzer Agent
retrieves encrypted logic references
triggers compute execution
produces structured result artifacts
Critic Agent
reviews results for consistency
estimates confidence
flags possible ambiguities or low-quality inputs
Report Agent
converts technical outputs into a usable scientific report
presents explanation, confidence, and provenance summary

7. Native 0G Economic Model
The entire protocol runs on a single-token economy.
7.1 Payment Flows
Users pay in 0G token for:
minting an agent,
uploading and storing large datasets,
triggering compute-intensive analysis,
querying or chatting with the scientific agent,
optional premium review or multi-agent consensus runs.
7.2 Why a Single Native Token Model Is Better
No DEX or bridging friction for end users.
No need to create and defend a new token economy.
Easier pricing model for researchers.
Cleaner sponsor alignment.
Simpler demo and clearer market narrative.
7.3 Monetization Logic
Revenue per analysis can be split as:
Researcher / iNFT owner share
Protocol fee
Compute and storage cost reserve
This allows researchers to directly monetize expertise while the protocol remains sustainable.

8. Applied Use Case: Phytochemistry Analysis
The first demonstration vertical is phytochemical and metabolomic interpretation.
8.1 Pilot Scenario
A scientist mints an iNFT called Alkaloid Predictor v2. The iNFT contains encrypted scripts and model weights for compound classification using uploaded raw spectral data.
A user uploads data from a plant sample and requests analysis.
The protocol performs the following steps:
The user uploads raw LC-MS or related data.
The user pays the quoted 0G amount.
The iNFT grants temporary usage authorization.
The swarm coordinates workflow execution.
0G Compute runs the scientific logic.
The user receives a report summarizing:
probable compound classes,
confidence indicators,
major observed signatures,
and interpretation notes.
8.2 Example User Interaction
A user can ask:
“What compound family is most likely represented in this sample?”
“Which peaks are driving the classification?”
“How confident is this analysis?”
“Should this sample be rerun or filtered?”
The agent returns an explanation grounded in the executed analysis.

9. Technical Workflow
Step 1: iNFT Deployment
The researcher deploys or mints an ERC-7857 iNFT on 0G.
The iNFT includes:
metadata,
ownership state,
authorization logic,
encrypted intelligence references,
pricing configuration,
and optional royalty split settings.
Step 2: Secure Intelligence Storage
The scientific scripts, model weights, and other sensitive logic are encrypted and stored through 0G Storage.
Only authorized executions can reference the encrypted intelligence.
Step 3: Dataset Submission
A user uploads a dataset and initiates an analysis request.
The system generates:
a dataset reference,
a job ID,
an execution quote,
and a payment instruction.
Step 4: Authorization
After payment, the protocol grants temporary execution rights tied to the job.
This allows the compute environment to run the encrypted logic without exposing the researcher’s IP directly to the user.
Step 5: Swarm Coordination
Through Gensyn AXL, the agents coordinate across separate nodes:
Planner assigns the route.
Analyzer executes.
Critic reviews.
Report Agent formats the output.
Step 6: Reliable Execution
KeeperHub manages execution reliability, retries, state handling, and workflow traceability.
Step 7: Final Report and Provenance
The output report is returned to the user, while provenance references and execution metadata are stored for verification.

10. Smart Contract and Logic Design
10.1 Key Contracts
INFTRegistry
registers scientific iNFTs
maps metadata and intelligence references
handles discovery
UsageAuthorizationManager
verifies payment
issues temporary execution rights
binds access to a specific job
AnalysisEscrow
receives 0G token payment
routes settlement to researcher and protocol
handles refunds if a job fails under defined conditions
RoyaltySplitter
distributes revenue where multiple collaborators share ownership
10.2 Suggested State Model
Each job can move through these states:
Created
Paid
Authorized
Running
Completed
Failed
Refunded
This state machine is important for auditability and error handling.

11. Product Features
MVP Features
Mint a scientific iNFT on 0G
Upload a dataset
Pay in 0G token for one analysis
Run a planner–analyzer–critic workflow
Return a structured report
Log job provenance and execution metadata
Stretch Features
Dynamic pricing by dataset size or workflow complexity
Reputation system for iNFT researchers
Shared revenue splits for co-authored scientific agents
Persistent agent memory for longitudinal analysis
Premium human review mode
Batch analysis mode for labs
Optional settlement via external payment asset converted into 0G

12. Pricing Strategy
There are two viable approaches.
Option A: Standardized Protocol Pricing
The protocol defines fixed reference prices for common analysis classes.
Example:
Basic classification: 5 0G
Multi-agent consensus analysis: 8 0G
Premium deep interpretation: 12 0G
Benefits:
easier user experience
easier comparison
stronger marketplace standardization
Option B: Creator-Defined Native Pricing
The iNFT creator sets their own price per execution.
Benefits:
supports different expertise levels
more flexible for niche scientific agents
stronger researcher autonomy
Recommendation
For the hackathon MVP, use a hybrid model:
protocol suggests a default price tier,
creator can override it.
This gives a cleaner demo while preserving long-term flexibility.

13. Why This Matters for Science
This protocol improves science in four ways.
13.1 Direct IP Monetization
Researchers can monetize expertise without selling source code, consulting time, or closed SaaS access.
13.2 Better Reproducibility
Each job can be tied to:
dataset references,
execution versions,
workflow logic references,
and final outputs.
13.3 Global Access
Users anywhere can access specialized analysis tools without institutional gatekeeping.
13.4 Agent-Native Research Infrastructure
Scientific workflows become programmable, composable, and automatable by autonomous agents.

14. Why This Can Win at Open Agents
This concept has several strong hackathon advantages:
It has a clear sponsor fit.
It uses real infrastructure rather than vague AI wrapping.
It provides an immediate demo story.
It combines iNFT ownership, swarm coordination, and execution reliability.
It has strong technical depth and high narrative clarity.
Judges should understand it quickly:
A scientist owns a private agent.
A user uploads data.
The user pays.
The agent swarm runs analysis.
The result comes back with provenance.
That is a compact and compelling flow.

15. MVP Build Plan
Week / Sprint 1
define use case and dataset format
deploy iNFT contract skeleton
integrate 0G Storage for encrypted intelligence references
Week / Sprint 2
implement payment and authorization flow
add analysis execution pathway through 0G Compute
create initial result schema
Week / Sprint 3
integrate Gensyn AXL for inter-agent communication
implement planner and critic roles
add KeeperHub execution orchestration
Week / Sprint 4
build UI dashboard
finalize provenance reporting
record demo
prepare submission materials

16. Demo Plan
Demo Narrative
Show a scientist dashboard with a minted iNFT called Alkaloid Predictor v2.
Upload a sample dataset.
Show pricing in 0G token.
Trigger analysis and authorize usage.
Visualize swarm activity:
Planner receives the task
Analyzer runs the job
Critic validates the result
Show KeeperHub execution log / workflow status.
Present final report with confidence and provenance.
Show automatic payment settlement to the iNFT owner.
What the Demo Must Prove
The iNFT is real.
The intelligence is protected.
The payment flow works.
Agents coordinate meaningfully.
Execution is reliable.
The scientific report is understandable.

17. Submission Checklist
General
public GitHub repository
clear README
architecture diagram
working demo video
live demo link if possible
team member names and contact information
For 0G
show use of 0G Chain, Storage, and Compute
show the iNFT or swarm proof clearly
provide proof of embedded intelligence / memory references
For Gensyn
demonstrate communication across separate AXL nodes
explain how agents coordinate
include clear working examples
For KeeperHub
explain exactly how KeeperHub is used
show execution or orchestration value
include working examples and clean integration notes

18. Risks and Mitigations
Risk: The scientific use case may feel too niche
Mitigation: frame it as a general protocol for scientific analysis agents, with phytochemistry as the pilot vertical.
Risk: Judges may not understand the science
Mitigation: keep the demo focused on workflow and trust, not domain complexity.
Risk: Swarm coordination could feel superficial
Mitigation: give each agent a real differentiated role with visible outputs.
Risk: Overbuilding
Mitigation: prioritize one clean golden path over many partially working features.

19. Long-Term Expansion
After the hackathon, the protocol can expand into:
genomics analysis agents
microscopy and pathology support agents
materials characterization agents
environmental sampling agents
AI-powered scientific marketplaces
protocol-level reputation and citation systems
scientific revenue-sharing networks
This gives the project a credible post-hackathon roadmap.

20. Final Positioning Statement
INFT Scientific Swarm transforms scientific expertise into autonomous, private, monetizable research agents. Built on 0G, coordinated through Gensyn, and executed through KeeperHub, it creates a new category of decentralized scientific infrastructure where researchers publish intelligence, users pay for results, and every analysis becomes verifiable.

21. Team Ask / Optional Closing Paragraph
We are building the first decentralized protocol where scientific intellectual property becomes a living agent economy. Our initial pilot proves the model with phytochemical analysis, but the underlying architecture is designed to become a general-purpose marketplace for autonomous scientific agents.
The immediate goal is a focused MVP for Open Agents. The long-term goal is a new infrastructure layer for research itself.

22. Recommended Title Variants
INFT Scientific Swarm
0G Research Agents
Autonomous Science iNFT Protocol
Scientific Intelligence as iNFTs
Decentralized Research Agent Marketplace

23. Recommended One-Sentence Pitch
Mint private scientific agents as iNFTs, pay in 0G to run analyses, coordinate specialized research swarms over Gensyn, and execute reliably through KeeperHub.



### 0g

Building on 0G
Build AI-powered applications using 0G's modular infrastructure - with or without migrating your existing code.

Keep your current blockchain and add 0G services as needed. Our infrastructure works with:

✅ Any EVM chain (Ethereum, Polygon, BNB, Arbitrum)
✅ Non-EVM chains (Solana, Near, Cosmos)
✅ Traditional Web2 applications
Prerequisites
Before building:

Get testnet tokens from the faucet
Install relevant SDK for your language
Review service documentation for your chosen components
What's Next?
Based on your needs, dive into:

Dapp Migration? → Deploy on 0G Chain
Need Storage? → Storage SDK Guide
Need Compute? → Compute Integration
Building a Rollup? → DA Integration
Creating INFTs? → INFT Overview
💡 Pro Tip: Start with one service, prove the value, then expand. Most successful projects begin with 0G Storage or Compute before exploring other services.

Deploy Smart Contracts on 0G Chain
Deploy smart contracts on 0G Chain - an EVM-compatible blockchain with built-in AI capabilities.

Why Deploy on 0G Chain?
⚡ Performance Benefits
11,000 TPS per Shard: Higher throughput than Ethereum
Low Fees: Fraction of mainnet costs
Sub-second Finality: Near-instant transaction confirmation
🔧 Latest EVM Compatibility
Pectra & Cancun-Deneb Support: Leverage newest Ethereum capabilities
Future-Ready: Architecture designed for quick integration of upcoming EVM upgrades
Familiar Tools: Use Hardhat, Foundry, Remix
No Learning Curve: Deploy like any EVM chain
Prerequisites
Before deploying contracts on 0G Chain, ensure you have:

Node.js 16+ installed (for Hardhat/Truffle)
Rust installed (for Foundry)
A wallet with testnet 0G tokens (get from faucet)
Basic Solidity knowledge
Steps to Deploy Your Contract
Step 1: Prepare Your Smart Contract Code
Write your contract code as you would for any Ethereum-compatible blockchain, ensuring that it meets the requirements for your specific use case.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MyToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balances[msg.sender] = _initialSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
}

Step 2: Compile Your Smart Contract
Use solc or another compatible Solidity compiler to compile your smart contract.

Important: When compiling, specify --evm-version cancun to ensure compatibility with the latest EVM upgrades supported by 0G Chain.

Using solc directly:

solc --evm-version cancun --bin --abi MyToken.sol

Using Hardhat:

// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

Using Foundry:

# foundry.toml
[profile.default]
evm_version = "cancun"

This step will generate the binary and ABI (Application Binary Interface) for your contract.

Step 3: Deploy the Contract on 0G Chain
Once compiled, you can use your preferred Ethereum-compatible deployment tools, such as web3.js, ethers.js, or hardhat, to deploy the contract on 0G Chain.

Configure Network Connection:

// For Hardhat
networks: {
  "testnet": {
    url: "https://evmrpc-testnet.0g.ai",
    chainId: 16602,
    accounts: [process.env.PRIVATE_KEY]
  },
  "mainnet": {
    url: "https://evmrpc.0g.ai",
    chainId: 16661,
    accounts: [process.env.PRIVATE_KEY]
  }
}

// For Foundry
[rpc_endpoints]
0g_testnet = "https://evmrpc-testnet.0g.ai"
0g_mainnet = "https://evmrpc.0g.ai"

Deploy Using Your Preferred Tool:

Hardhat Deployment
Foundry Deployment
Truffle Deployment
Follow the same deployment steps as you would on Ethereum, using your 0G Chain node or RPC endpoint.

For complete working examples using different frameworks, check out the official deployment scripts repository: 🔗 0G Deployment Scripts

Step 4: Verify Deployment Results on 0G Chain Scan
After deployment, you can verify your contract on 0G Chain Scan, the block explorer for 0G Chain or via the provided API below:

Hardhat
Forge
Make sure you have the following plugins installed:

npm install --save-dev @nomicfoundation/hardhat-verify @nomicfoundation/viem @nomicfoundation/hardhat-toolbox-viem dotenv 


To verify your contract using Hardhat, please use the following settings in your hardhat.config.js:

solidity: {
  ...
  settings: {
    evmVersion: "cancun", // Make sure this matches your compiler setting
    optimizer: {
      enabled: true,
      runs: 200, // Adjust based on your optimization needs
    },
    viaIR: true, // Enable if your contract uses inline assembly
    metadata: {
      bytecodeHash: "none", // Optional: Set to "none" to exclude metadata hash
    },
  },
}

Add the network configuration:

networks: {
  "testnet": {
    url: "https://evmrpc-testnet.0g.ai",
    chainId: 16602,
    accounts: [process.env.PRIVATE_KEY]
  },
  "mainnet": {
    url: "https://evmrpc.0g.ai",
    chainId: 16661,
    accounts: [process.env.PRIVATE_KEY]
  }
}

and finally, add the etherscan configuration:

etherscan: {
  apiKey: {
    testnet: "YOUR_API_KEY", // Use a placeholder if you don't have one
    mainnet: "YOUR_API_KEY"  // Use a placeholder if you don't have one
  },
  customChains: [
    {
      // Testnet
      network: "testnet",
      chainId: 16602,
      urls: {
        apiURL: "https://chainscan-galileo.0g.ai/open/api",
        browserURL: "https://chainscan-galileo.0g.ai",
      },
    },
    {
      // Mainnet
      network: "mainnet",
      chainId: 16661,
      urls: {
        apiURL: "https://chainscan.0g.ai/open/api",
        browserURL: "https://chainscan.0g.ai",
      },
    },
  ],
},

To verify your contract, run the following command:

npx hardhat verify DEPLOYED_CONTRACT_ADDRESS --network <Network>

You should get a success message like this:

Successfully submitted source code for contract
contracts/Contract.sol:ContractName at DEPLOYED_CONTRACT_ADDRESS
for verification on the block explorer. Waiting for verification result...

Successfully verified contract TokenDist on the block explorer.
https://chainscan.0g.ai/address/<DEPLOYED_CONTRACT_ADDRESS>#code

Using 0G Precompiles
Available Precompiles
Precompile	Address	Purpose
DASigners	0x...1000	Data availability signatures
Wrapped0GBase	0x...1002	Wrapped 0G token operations
Troubleshooting
Transaction failing with "invalid opcode"?
Can't connect to RPC?
What's Next?
Learn Precompiles: Precompiles Overview
Storage Integration: 0G Storage SDK
Compute Integration: 0G Compute Guide
Need help? Join our Discord for developer support.

0G Compute Network
Access affordable GPU computing power for AI workloads through a decentralized marketplace.

AI Computing Costs Are Crushing Innovation
Running AI models today means choosing between:

Cloud Providers: $5,000-50,000/month for dedicated GPUs
API Services: $0.03+ per request, adding up to thousands monthly
Building Infrastructure: Millions in hardware investment
Result: Only well-funded companies can afford AI at scale.

Decentralized GPU Marketplace
0G Compute Network connects idle GPU owners with AI developers, creating a marketplace that's:

90% Cheaper: Pay only for compute used, no monthly minimums
Instantly Available: Access 1000s of GPUs globally
Verifiable: Cryptographic proofs ensure computation integrity
Think of it as "Uber for GPUs" - matching supply with demand efficiently.

Architecture Overview
0G Compute Network Architecture

The network consists of:

Smart Contracts: Handle payments and verification
Provider Network: GPU owners running compute services
Client SDKs: Easy integration for developers
Verification Layer: Ensures computation integrity
Key Components
🤖 Supported Services
Service Type	What It Does	Status
Inference	Run pre-trained models (LLMs)	✅ Live
Fine-tuning	Fine-tune models with your data	✅ Live
Training	Train models from scratch	🔜 Coming
🔐 Trust & Verification
Verifiable Computation: Proof that work was done correctly

TEE (Trusted Execution Environment) for secure processing
Cryptographic signatures on all results
Can't fake or manipulate outputs
What makes it trustworthy?
Quick Start Paths
👨‍💻 "I want to use AI services"
Build AI-powered applications without infrastructure:

Install SDK - 5 minute setup
Fund your account - Pre-pay for usage
Send requests - OpenAI SDK compatible
🖥️ "I have GPUs to monetize"
Turn idle hardware into revenue:

Check hardware requirements
Set up provider software
🎯 "I need to fine-tune AI models"
Fine-tune models with your data:

Install CLI tools
Prepare your dataset
Start fine-tuning
Frequently Asked Questions
How much can I save compared to OpenAI?
Is my data secure?
How fast is it compared to centralized services?


0G Storage SDKs
Build decentralized storage into your applications with our powerful SDKs designed for modern development workflows.

Available SDKs
Go SDK: Ideal for backend systems and applications built with Go
TypeScript SDK: Perfect for frontend development and JavaScript-based projects
Core Features
Both SDKs provide a streamlined interface to interact with the 0G Storage network:

Upload and Download Files: Securely store and retrieve data of various sizes and formats
Manage Data: List uploaded files, check their status, and control access permissions
Leverage Decentralization: Benefit from the 0G network's distributed architecture for enhanced data availability, immutability, and censorship resistance
Quick Start Resources
Starter Kits Available
Get up and running quickly with our starter kits:

TypeScript Starter Kit - CLI scripts, importable library, and browser UI with MetaMask wallet connect. Supports turbo/standard modes.
Go Starter Kit - Ready-to-use examples with Gin server and CLI tool
# TypeScript — upload a file in under 5 minutes
git clone https://github.com/0gfoundation/0g-storage-ts-starter-kit
cd 0g-storage-ts-starter-kit && npm install
cp .env.example .env   # Add your PRIVATE_KEY
npm run upload -- ./file.txt

Go SDK
TypeScript SDK
Installation
Install the 0G Storage Client library:

go get github.com/0gfoundation/0g-storage-client

Setup
Import Required Packages
import (
    "context"
    "github.com/0gfoundation/0g-storage-client/common/blockchain"
    "github.com/0gfoundation/0g-storage-client/common"
    "github.com/0gfoundation/0g-storage-client/indexer"
    "github.com/0gfoundation/0g-storage-client/transfer"
    "github.com/0gfoundation/0g-storage-client/core"
)

Initialize Clients
Create the necessary clients to interact with the network:

// Create Web3 client for blockchain interactions
w3client := blockchain.MustNewWeb3(evmRpc, privateKey)
defer w3client.Close()

// Create indexer client for node management
indexerClient, err := indexer.NewClient(indRpc, indexer.IndexerClientOption{
    LogOption: common.LogOption{},
})
if err != nil {
    // Handle error
}

Parameters: evmRpc is the chain RPC endpoint, privateKey is your signer key, and indRpc is the indexer RPC endpoint. Use the current values published in the network overview docs for your network.

Core Operations
Node Selection
Select storage nodes before performing file operations:

nodes, err := indexerClient.SelectNodes(ctx, expectedReplicas, droppedNodes, method, fullTrusted)
if err != nil {
    // Handle error
}


Parameters: ctx is the context for the operation. expectedReplicas is the number of replicas to maintain. droppedNodes is a list of nodes to exclude, method can be min, max, random, or a positive number string, and fullTrusted limits selection to trusted nodes.

File Upload
Upload files to the network with the indexer client:

file, err := core.Open(filePath)
if err != nil {
    // Handle error
}
defer file.Close()

fragmentSize := int64(4 * 1024 * 1024 * 1024)
opt := transfer.UploadOption{
    ExpectedReplica:  1,
    TaskSize:         10,
    SkipTx:           true,
    FinalityRequired: transfer.TransactionPacked,
    FastMode:         true,
    Method:           "min",
    FullTrusted:      true,
}

txHashes, roots, err := indexerClient.SplitableUpload(ctx, w3client, file, fragmentSize, opt)
if err != nil {
    // Handle error
}


fragmentSize controls the split size for large files. The returned roots contain the merkle root(s) to download later.

File Hash Calculation
Calculate a file's Merkle root hash for identification:

rootHash, err := core.MerkleRoot(filePath)
if err != nil {
    // Handle error
}
fmt.Printf("File hash: %s\n", rootHash.String())

Important
Save the root hash - you'll need it to download the file later!

File Download
Download files from the network:

rootHex := rootHash.String()
err = indexerClient.Download(ctx, rootHex, outputPath, withProof)
if err != nil {
    // Handle error
}

withProof enables merkle proof verification during download.

Best Practices
Error Handling: Implement proper error handling and cleanup
Context Management: Use contexts for operation timeouts and cancellation
Resource Cleanup: Always close clients when done using defer client.Close()
Verification: Enable proof verification for sensitive files
Monitoring: Track transaction status for important uploads
Additional Resources
Go SDK Repository
Go Starter Kit


INFTs: Tokenizing AI Agents
What Are INFTs?
The rapid growth of AI agents necessitates new methods for managing their ownership, transfer, and capabilities within Web3 ecosystems.

INFTs (Intelligent Non-Fungible Tokens) represent a significant advancement in this space, enabling the tokenization of AI agents with:

Transferability: Move AI agents between owners securely
Decentralized control: No single point of failure
Full asset ownership: Complete control over AI capabilities
Royalty potential: Monetize AI agent usage and transfers
Navigation Guide
This page: High-level concepts and use cases
ERC-7857 Standard: Technical implementation details
Integration Guide: Step-by-step development guide
Why Traditional NFTs Don't Work for AI
Traditional NFT standards like ERC-721 and ERC-1155 have significant limitations when applied to AI agents:

Key Problems
🔓 Static and Public Metadata

Existing standards link to static, publicly accessible metadata
AI agents need dynamic metadata that reflects learning and evolution
Sensitive AI data requires privacy protection
🚫 Insecure Metadata Transfer

ERC-721 transfers only move ownership identifiers
The underlying AI "intelligence" doesn't transfer
New owners receive incomplete or non-functional agents
🔒 No Native Encryption

Current standards lack built-in encryption support
Proprietary AI models remain exposed
Sensitive user data can't be protected
The INFT Solution: ERC-7857
ERC-7857 is a new NFT standard specifically designed to address AI agent requirements. It enables the creation, ownership, and secure transfer of INFTs with their complete intelligence intact.

Revolutionary Features
🛡️ Privacy-Preserving Metadata

Encrypts sensitive AI "intelligence" data
Protects proprietary information from exposure
Maintains privacy throughout transfers
🔄 Secure Metadata Transfers

Both ownership AND encrypted metadata transfer together
Verifiable transfer process ensures integrity
New owners receive fully functional agents
⚡ Dynamic Data Management

Supports evolving AI agent capabilities
Secure updates to agent state and behaviors
Maintains functionality within NFT framework
🌐 Decentralized Storage Integration

Works with 0G Storage for permanent, tamper-proof storage
Distributed access management
No single point of failure
✅ Verifiable Ownership & Control

Cryptographic proofs validate all transfers
Oracle-based verification ensures integrity
Transparent ownership verification
🤖 AI-Specific Functionality

Built-in agent lifecycle management
Pre-execution ownership verification
Specialized features for AI use cases
How INFT Transfers Work
The transfer mechanism ensures both token ownership and encrypted metadata transfer securely together.

Simple Transfer Flow
1. 📦 Encrypt & Commit    →  2. 🔄 Oracle Processing
          ↓                           ↓
6. ✅ Access Granted     ←  3. 🔐 Re-encrypt for Receiver
          ↑                           ↓
5. ✓ Verify & Finalize   ←  4. 🗝️ Secure Key Delivery

Detailed Step-by-Step Process
ERC7857 Transfer Flow Diagram
Technical Implementation
For detailed oracle implementations (TEE vs ZKP), security considerations, and code examples, see the ERC-7857 Technical Standard.

Additional Capabilities
🧬 Clone Function

Creates new token with same AI metadata
Preserves original while enabling distribution
Useful for AI agent templates
🔐 Authorized Usage

Grant usage rights without ownership transfer
Sealed executor processes metadata securely
Enable AI-as-a-Service models
Real-World Applications
Secure AI agent tokenization opens up transformative possibilities:

🏪 AI Agent Marketplaces
Buy and sell trained AI agents with guaranteed capability transfer
Secure marketplaces with verified agent functionality
Transparent pricing and capability verification
🎯 Personalized Automation
Own AI agents tailored for specific tasks:
DeFi trading strategies
Airdrop claiming automation
Social media management
Research and analysis
🏢 Enterprise AI Solutions
Build proprietary AI agents for internal use
Securely transfer or lease agents to clients
Maintain control over sensitive business logic
💼 AI-as-a-Service (AIaaS)
Tokenize AI agents for subscription models
Granular usage permissions and billing
Scalable service delivery
🤝 Agent Collaboration
Combine multiple INFT agents for enhanced capabilities
Create composite AI solutions
Build AI agent ecosystems
💰 IP Monetization
AI developers monetize models as NFTs
Maintain usage control and royalty collection
Protect proprietary algorithms
Powered by 0G Infrastructure
INFTs leverage the complete 0G ecosystem for optimal performance:

Component	Role in INFTs	Key Benefits
0G Storage	Encrypted metadata storage	Secure, permanent, owner-only access
0G DA	Transfer proof verification	Guaranteed metadata availability
0G Chain	Smart contract execution	Fast, low-cost INFT operations
0G Compute	Secure AI inference	Private agent execution
Why This Matters
By combining INFTs with 0G's comprehensive AI infrastructure, developers can create sophisticated, transferable AI agents that maintain their intelligence, privacy, and functionality throughout their entire lifecycle.

Complete AI Stack
0G provides the only complete infrastructure stack specifically designed for AI applications, making it the ideal foundation for INFT development.

Next Steps
For Developers
🚀 Integration Guide - Start building with INFTs
📋 ERC-7857 Standard - Technical implementation details
💻 GitHub Repository - Sample code and examples

For Users
🛒 AI Agent Marketplace - Browse available AI agents (coming soon)
📚 User Guide - How to buy, transfer, and use INFTs (coming soon)

Get Support
💬 Discord Community - Ask questions and get help
📖 Documentation Hub - Complete 0G ecosystem guides

Web3 Compatible
ERC-7857 is designed to be compatible with existing Web3 infrastructure while providing enhanced security and functionality for AI agent tokenization.

INFT Integration Guide
Overview
This step-by-step guide shows you how to integrate INFTs into your applications using the 0G ecosystem. You'll learn to deploy contracts, manage metadata, and implement secure transfers.

Quick Navigation
New to INFTs? Start with INFT Overview
Need technical details? See ERC-7857 Standard
Ready to build? Continue with this guide
Prerequisites
Knowledge Requirements
✅ NFT Standards - Understanding of ERC-721 basics
✅ Smart Contracts - Solidity development experience
✅ Cryptography - Basic encryption and key management concepts
✅ 0G Ecosystem - Familiarity with 0G infrastructure components

Technical Setup
✅ Development Environment - Node.js 16+, Hardhat/Foundry
✅ 0G Testnet Account - Wallet with testnet tokens
✅ API Access - Keys for 0G Storage and Compute services

Quick Setup Checklist
Understanding 0G Integration
INFTs work seamlessly with 0G's complete AI infrastructure:

Component	Purpose	INFT Integration
0G Storage	Encrypted metadata storage	Stores AI agent data securely
0G DA	Proof verification	Validates transfer integrity
0G Chain	Smart contract execution	Hosts INFT contracts
0G Compute	Secure AI inference	Runs agent computations privately
Why This Architecture Matters
This integration ensures that AI agents maintain their intelligence, privacy, and functionality throughout their entire lifecycle while remaining fully decentralized.

Step-by-Step Implementation
Step 1: Initialize Your Project
# Create new project
mkdir my-inft-project && cd my-inft-project
npm init -y

# Install required dependencies
npm install @0gfoundation/0g-ts-sdk @openzeppelin/contracts ethers hardhat
npm install --save-dev @nomicfoundation/hardhat-toolbox

# Initialize Hardhat
npx hardhat init

Configure environment:

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_here
OG_RPC_URL=https://evmrpc-testnet.0g.ai
OG_STORAGE_URL=https://storage-testnet.0g.ai
OG_COMPUTE_URL=https://compute-testnet.0g.ai
EOF

Step 2: Create INFT Smart Contract
// contracts/INFT.sol
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IOracle {
    function verifyProof(bytes calldata proof) external view returns (bool);
}

contract INFT is ERC721, Ownable, ReentrancyGuard {
    // State variables
    mapping(uint256 => bytes32) private _metadataHashes;
    mapping(uint256 => string) private _encryptedURIs;
    mapping(uint256 => mapping(address => bytes)) private _authorizations;
    
    address public oracle;
    uint256 private _nextTokenId = 1;
    
    // Events
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newHash);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor);
    
    constructor(
        string memory name,
        string memory symbol,
        address _oracle
    ) ERC721(name, symbol) {
        oracle = _oracle;
    }
    
    function mint(
        address to,
        string calldata encryptedURI,
        bytes32 metadataHash
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        _encryptedURIs[tokenId] = encryptedURI;
        _metadataHashes[tokenId] = metadataHash;
        
        return tokenId;
    }
    
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external nonReentrant {
        require(ownerOf(tokenId) == from, "Not owner");
        require(IOracle(oracle).verifyProof(proof), "Invalid proof");
        
        // Update metadata access for new owner
        _updateMetadataAccess(tokenId, to, sealedKey, proof);
        
        // Transfer token ownership
        _transfer(from, to, tokenId);
        
        emit MetadataUpdated(tokenId, keccak256(sealedKey));
    }
    
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _authorizations[tokenId][executor] = permissions;
        emit UsageAuthorized(tokenId, executor);
    }
    
    function _updateMetadataAccess(
        uint256 tokenId,
        address newOwner,
        bytes calldata sealedKey,
        bytes calldata proof
    ) internal {
        // Extract new metadata hash from proof
        bytes32 newHash = bytes32(proof[0:32]);
        _metadataHashes[tokenId] = newHash;
        
        // Update encrypted URI if provided in proof
        if (proof.length > 64) {
            string memory newURI = string(proof[64:]);
            _encryptedURIs[tokenId] = newURI;
        }
    }
    
    function getMetadataHash(uint256 tokenId) external view returns (bytes32) {
        return _metadataHashes[tokenId];
    }
    
    function getEncryptedURI(uint256 tokenId) external view returns (string memory) {
        return _encryptedURIs[tokenId];
    }
}

Step 3: Deploy and Initialize Contract
Create deployment script:

// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    
    // Deploy mock oracle for testing (replace with real oracle in production)
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const oracle = await MockOracle.deploy();
    await oracle.deployed();
    
    // Deploy INFT contract
    const INFT = await ethers.getContractFactory("INFT");
    const inft = await INFT.deploy(
        "AI Agent NFTs",
        "AINFT",
        oracle.address
    );
    await inft.deployed();
    
    console.log("Oracle deployed to:", oracle.address);
    console.log("INFT deployed to:", inft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

Deploy to 0G testnet:

npx hardhat run scripts/deploy.js --network og-testnet

Step 4: Implement Metadata Management
Create metadata manager:

// lib/MetadataManager.js
const { ethers } = require('ethers');
const crypto = require('crypto');

class MetadataManager {
    constructor(ogStorage, encryptionService) {
        this.storage = ogStorage;
        this.encryption = encryptionService;
    }
    
    async createAIAgent(aiModelData, ownerPublicKey) {
        try {
            // Prepare AI agent metadata
            const metadata = {
                model: aiModelData.model,
                weights: aiModelData.weights,
                config: aiModelData.config,
                capabilities: aiModelData.capabilities,
                version: '1.0',
                createdAt: Date.now()
            };
            
            // Generate encryption key
            const encryptionKey = crypto.randomBytes(32);
            
            // Encrypt metadata
            const encryptedData = await this.encryption.encrypt(
                JSON.stringify(metadata),
                encryptionKey
            );
            
            // Store on 0G Storage
            const storageResult = await this.storage.store(encryptedData);
            
            // Seal key for owner
            const sealedKey = await this.encryption.sealKey(
                encryptionKey,
                ownerPublicKey
            );
            
            // Generate metadata hash
            const metadataHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(JSON.stringify(metadata))
            );
            
            return {
                encryptedURI: storageResult.uri,
                sealedKey,
                metadataHash
            };
        } catch (error) {
            throw new Error(`Failed to create AI agent: ${error.message}`);
        }
    }
    
    async mintINFT(contract, recipient, aiAgentData) {
        const { encryptedURI, sealedKey, metadataHash } = aiAgentData;
        
        const tx = await contract.mint(
            recipient,
            encryptedURI,
            metadataHash
        );
        
        const receipt = await tx.wait();
        const tokenId = receipt.events[0].args.tokenId;
        
        return {
            tokenId,
            sealedKey,
            transactionHash: receipt.transactionHash
        };
    }
}

module.exports = MetadataManager;

Step 5: Implement Secure Transfers
Transfer preparation:

// lib/TransferManager.js
class TransferManager {
    constructor(oracle, metadataManager) {
        this.oracle = oracle;
        this.metadata = metadataManager;
    }
    
    async prepareTransfer(tokenId, fromAddress, toAddress, toPublicKey) {
        try {
            // Retrieve current metadata
            const currentURI = await this.metadata.getEncryptedURI(tokenId);
            const encryptedData = await this.storage.retrieve(currentURI);
            
            // Request oracle to re-encrypt for new owner
            const transferRequest = {
                tokenId,
                encryptedData,
                fromAddress,
                toAddress,
                toPublicKey
            };
            
            // Get oracle proof and new sealed key
            const oracleResponse = await this.oracle.processTransfer(transferRequest);
            
            return {
                sealedKey: oracleResponse.sealedKey,
                proof: oracleResponse.proof,
                newEncryptedURI: oracleResponse.newURI
            };
        } catch (error) {
            throw new Error(`Transfer preparation failed: ${error.message}`);
        }
    }
    
    async executeTransfer(contract, transferData) {
        const { from, to, tokenId, sealedKey, proof } = transferData;
        
        const tx = await contract.transfer(
            from,
            to,
            tokenId,
            sealedKey,
            proof
        );
        
        return await tx.wait();
    }
}

Best Practices
🔒 Security Guidelines
Key Management:

Store private keys in hardware wallets or HSMs
Never expose keys in code or logs
Implement automatic key rotation
Use multi-signature wallets for critical operations
Metadata Protection:

// Example: Secure metadata handling
class SecureMetadata {
    constructor() {
        this.encryptionAlgorithm = 'aes-256-gcm';
        this.keyDerivation = 'pbkdf2';
    }
    
    async encryptMetadata(data, password) {
        const salt = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(this.encryptionAlgorithm, key, iv);
        // ... encryption logic
    }
}

⚡ Performance Optimization
Efficient Storage Patterns:

Compress metadata before encryption
Use appropriate storage tiers based on access patterns
Implement lazy loading for large AI models
Cache frequently accessed data locally
Batch Operations:

// Batch multiple operations
async function batchMintINFTs(agents, recipients) {
    const operations = agents.map((agent, i) => 
        metadataManager.createAIAgent(agent, recipients[i])
    );
    
    const results = await Promise.all(operations);
    return results;
}

🧪 Testing Strategy
Comprehensive Test Suite:

// test/INFT.test.js
describe('INFT Contract', function () {
    it('should mint INFT with encrypted metadata', async function () {
        const metadata = await createTestMetadata();
        const result = await inft.mint(owner.address, metadata.uri, metadata.hash);
        expect(result).to.emit(inft, 'Transfer');
    });
    
    it('should transfer with re-encryption', async function () {
        // Test secure transfer logic
    });
    
    it('should authorize usage without ownership transfer', async function () {
        // Test authorization functionality
    });
});

Security Testing:

Test with malformed proofs
Verify access controls
Check for reentrancy vulnerabilities
Validate oracle responses
Real-World Use Cases
🏪 AI Agent Marketplace
Complete marketplace integration:

// marketplace/AgentMarketplace.js
class AgentMarketplace {
    constructor(inftContract, paymentToken) {
        this.inft = inftContract;
        this.payment = paymentToken;
        this.listings = new Map();
    }
    
    async listAgent(tokenId, price, description) {
        // Verify ownership
        const owner = await this.inft.ownerOf(tokenId);
        require(owner === msg.sender, 'Not owner');
        
        // Create listing
        const listing = {
            tokenId,
            price,
            description,
            seller: owner,
            isActive: true
        };
        
        this.listings.set(tokenId, listing);
        
        // Approve marketplace for transfer
        await this.inft.approve(this.address, tokenId);
        
        return listing;
    }
    
    async purchaseAgent(tokenId, buyerPublicKey) {
        const listing = this.listings.get(tokenId);
        require(listing && listing.isActive, 'Agent not for sale');
        
        // Prepare secure transfer
        const transferData = await this.prepareTransfer(
            tokenId,
            listing.seller,
            msg.sender,
            buyerPublicKey
        );
        
        // Execute payment
        await this.payment.transferFrom(msg.sender, listing.seller, listing.price);
        
        // Execute secure transfer
        await this.inft.transfer(
            listing.seller,
            msg.sender,
            tokenId,
            transferData.sealedKey,
            transferData.proof
        );
        
        // Remove listing
        this.listings.delete(tokenId);
    }
}

💼 AI-as-a-Service Platform
Usage authorization system:

// services/AIaaS.js
class AIaaSPlatform {
    async createSubscription(tokenId, subscriber, duration, permissions) {
        // Verify agent ownership
        const owner = await this.inft.ownerOf(tokenId);
        
        // Create usage authorization
        const authData = {
            subscriber,
            expiresAt: Date.now() + duration,
            permissions: {
                maxRequests: permissions.maxRequests,
                allowedOperations: permissions.operations,
                rateLimit: permissions.rateLimit
            }
        };
        
        // Grant usage rights
        await this.inft.authorizeUsage(
            tokenId,
            subscriber,
            ethers.utils.toUtf8Bytes(JSON.stringify(authData))
        );
        
        return authData;
    }
    
    async executeAuthorizedInference(tokenId, input, subscriber) {
        // Verify authorization
        const auth = await this.getAuthorization(tokenId, subscriber);
        require(auth && auth.expiresAt > Date.now(), 'Unauthorized');
        
        // Execute inference on 0G Compute
        const result = await this.ogCompute.executeSecure({
            tokenId,
            executor: subscriber,
            input,
            verificationMode: 'TEE'
        });
        
        // Update usage metrics
        await this.updateUsageMetrics(tokenId, subscriber);
        
        return result;
    }
}

🤝 Multi-Agent Collaboration
Agent composition framework:

// collaboration/AgentComposer.js
class AgentComposer {
    async composeAgents(agentTokenIds, compositionRules) {
        // Verify ownership of all agents
        for (const tokenId of agentTokenIds) {
            const owner = await this.inft.ownerOf(tokenId);
            require(owner === msg.sender, `Not owner of agent ${tokenId}`);
        }
        
        // Create composite agent metadata
        const compositeMetadata = {
            type: 'composite',
            agents: agentTokenIds,
            rules: compositionRules,
            createdAt: Date.now()
        };
        
        // Encrypt and store composite metadata
        const encryptedComposite = await this.metadataManager.createAIAgent(
            compositeMetadata,
            msg.sender
        );
        
        // Mint new INFT for composite agent
        const result = await this.inft.mint(
            msg.sender,
            encryptedComposite.encryptedURI,
            encryptedComposite.metadataHash
        );
        
        return result.tokenId;
    }
    
    async executeCompositeInference(compositeTokenId, input) {
        // Retrieve composite metadata
        const metadata = await this.getDecryptedMetadata(compositeTokenId);
        
        // Execute inference on each component agent
        const agentResults = await Promise.all(
            metadata.agents.map(agentId => 
                this.executeAgentInference(agentId, input)
            )
        );
        
        // Apply composition rules to combine results
        const finalResult = this.applyCompositionRules(
            agentResults,
            metadata.rules
        );
        
        return finalResult;
    }
}

Troubleshooting
Common Issues & Solutions
Transfer Failures
Metadata Access Issues
High Gas Costs
Get Support
🐛 GitHub Issues - Report bugs and feature requests
💬 Discord Community - Get help from developers
📖 Documentation - Technical reference
📚 Knowledge Base - Common solutions

Next Steps
Continue Learning
📋 ERC-7857 Technical Standard - Deep dive into implementation details
🎯 INFT Use Cases - Explore more applications
💻 Example Implementations - Reference code

Production Deployment
🚀 Mainnet Migration - Deploy to 0G mainnet when ready
🔒 Security Audit - Get your contracts audited
📊 Monitoring Setup - Implement monitoring and alerts

Community
🤝 Developer Community - Share your implementation
💬 Technical Discussions - Join conversations about best practices
👥 Contribute - Help improve the INFT ecosystem

Ready to Deploy?
Once you've tested your implementation thoroughly, consider getting a security audit before deploying to mainnet. The 0G team can recommend trusted auditing partners

ERC-7857: Technical Standard
Overview
ERC-7857 extends ERC-721 to support encrypted metadata, specifically designed for tokenizing AI agents and sensitive digital assets.

Prerequisites
Understanding of ERC-721 NFT standard
Basic cryptography knowledge (encryption, hashing)
Smart contract development experience
Familiarity with oracle systems
Document Purpose
This page provides the technical specification, implementation details, and security considerations for ERC-7857. For high-level concepts, see the INFT Overview.

Key Technical Features
Feature	Description	Benefit
Encrypted Metadata	Store sensitive data securely	Protects proprietary AI models
Secure Re-encryption	Transfer without data exposure	Maintains privacy during ownership changes
Oracle Verification	TEE/ZKP proof validation	Ensures transfer integrity
Authorized Usage	Grant access without ownership	Enables AI-as-a-Service models
Technical Specification
Core Interface
interface IERC7857 is IERC721 {
    // Transfer with metadata re-encryption
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external;
    
    // Clone token with same metadata
    function clone(
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external returns (uint256 newTokenId);
    
    // Authorize usage without revealing data
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external;
}

Transfer Architecture
ERC-7857 Transfer Flow Diagram
Security Guarantees:

✅ Metadata remains encrypted throughout process
✅ Only new owner can decrypt transferred data
✅ Transfer integrity cryptographically verified
✅ No intermediary can access sensitive information

Oracle Implementations
ERC-7857 supports two oracle types for secure metadata re-encryption:

TEE (Trusted Execution Environment)
How it works:

Sender transmits encrypted data + key to TEE
TEE securely decrypts data in isolated environment
TEE generates new key and re-encrypts metadata
TEE encrypts new key with receiver's public key
TEE outputs sealed key and hash values
Advantages:

Hardware-level security guarantees
TEE can generate cryptographically secure keys
Attestation provides proof of secure execution
TEE Flow
TEE Implementation Example
class TEEOracle {
    async processTransfer(encryptedData, oldKey, receiverPublicKey) {
        // All operations happen inside secure enclave
        try {
            // Step 1: Decrypt original data
            const data = await this.decryptSecurely(encryptedData, oldKey);
            
            // Step 2: Generate new encryption key
            const newKey = await this.generateSecureKey();
            
            // Step 3: Re-encrypt with new key
            const newEncryptedData = await this.encryptSecurely(data, newKey);
            
            // Step 4: Seal key for receiver
            const sealedKey = await this.sealForReceiver(newKey, receiverPublicKey);
            
            // Step 5: Generate attestation proof
            const proof = await this.generateAttestation({
                originalHash: hash(encryptedData),
                newHash: hash(newEncryptedData),
                receiverKey: receiverPublicKey
            });
            
            return {
                newEncryptedData,
                sealedKey,
                proof
            };
        } catch (error) {
            throw new Error(`TEE processing failed: ${error.message}`);
        }
    }
}

ZKP (Zero-Knowledge Proof)
How it works:

Sender provides old and new keys to ZKP system
ZKP circuit verifies correct re-encryption
Proof generated without revealing keys or data
Smart contract validates ZKP proof
Considerations:

Cannot independently generate new keys
Requires sender to handle key generation
Receivers should rotate keys post-transfer
Computationally intensive proof generation
ZKP Flow
ZKP Circuit Example
// ZKP circuit for verifying re-encryption
use ark_relations::r1cs::SynthesisError;

pub struct ReencryptionCircuit {
    // Public inputs (known to verifier)
    pub old_data_hash: Option<Fr>,
    pub new_data_hash: Option<Fr>,
    pub receiver_pubkey: Option<Fr>,
    
    // Private inputs (known only to prover)
    pub encrypted_data: Option<Vec<u8>>,
    pub old_key: Option<Vec<u8>>,
    pub new_key: Option<Vec<u8>>,
    pub plaintext_data: Option<Vec<u8>>,
}

impl ConstraintSynthesizer<Fr> for ReencryptionCircuit {
    fn generate_constraints(
        self,
        cs: ConstraintSystemRef<Fr>,
    ) -> Result<(), SynthesisError> {
        // Step 1: Verify decryption of original data
        let decrypted = decrypt_constraint(
            cs.clone(),
            &self.encrypted_data?,
            &self.old_key?
        )?;
        
        // Step 2: Verify plaintext matches decrypted data
        enforce_equal(
            cs.clone(),
            &decrypted,
            &self.plaintext_data?
        )?;
        
        // Step 3: Verify re-encryption with new key
        let reencrypted = encrypt_constraint(
            cs.clone(),
            &self.plaintext_data?,
            &self.new_key?
        )?;
        
        // Step 4: Verify hash consistency
        let computed_hash = hash_constraint(cs.clone(), &reencrypted)?;
        enforce_equal(
            cs,
            &computed_hash,
            &self.new_data_hash?
        )?;
        
        Ok(())
    }
}

Implementation Guidelines
Smart Contract Architecture
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ERC7857 is ERC721, Ownable, ReentrancyGuard {
    // State variables
    mapping(uint256 => bytes32) private _metadataHashes;
    mapping(uint256 => string) private _encryptedURIs;
    mapping(uint256 => mapping(address => bytes)) private _authorizations;
    
    // Oracle configuration
    address public oracle;
    uint256 public constant PROOF_VALIDITY_PERIOD = 1 hours;
    
    // Events
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newHash);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor);
    event OracleUpdated(address oldOracle, address newOracle);
    
    modifier validProof(bytes calldata proof) {
        require(oracle != address(0), "Oracle not set");
        require(IOracle(oracle).verifyProof(proof), "Invalid proof");
        _;
    }
    
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external nonReentrant validProof(proof) {
        require(ownerOf(tokenId) == from, "Not owner");
        require(to != address(0), "Invalid recipient");
        
        // Update metadata access for new owner
        _updateMetadataAccess(tokenId, to, sealedKey, proof);
        
        // Transfer NFT ownership
        _transfer(from, to, tokenId);
        
        emit MetadataUpdated(tokenId, keccak256(sealedKey));
    }
    
    function _updateMetadataAccess(
        uint256 tokenId,
        address newOwner,
        bytes calldata sealedKey,
        bytes calldata proof
    ) internal {
        // Verify proof contains correct metadata hash
        bytes32 expectedHash = _extractHashFromProof(proof);
        _metadataHashes[tokenId] = expectedHash;
        
        // Store new encrypted URI if provided
        string memory newURI = _extractURIFromProof(proof);
        if (bytes(newURI).length > 0) {
            _encryptedURIs[tokenId] = newURI;
        }
    }
}

Metadata Management
class MetadataManager {
    constructor(storageProvider, encryptionService, options = {}) {
        this.storage = storageProvider;
        this.encryption = encryptionService;
        this.options = {
            keySize: 256,
            algorithm: 'AES-GCM',
            ...options
        };
    }
    
    async storeMetadata(data, ownerPublicKey) {
        try {
            // Validate input data
            this._validateMetadata(data);
            
            // Generate encryption key
            const key = await this.encryption.generateKey({
                size: this.options.keySize,
                algorithm: this.options.algorithm
            });
            
            // Encrypt metadata
            const encrypted = await this.encryption.encrypt(data, key, {
                includeMac: true,
                version: '1.0'
            });
            
            // Store encrypted data on distributed storage
            const uri = await this.storage.store(encrypted, {
                redundancy: 3,
                availability: '99.9%'
            });
            
            // Seal key for owner using their public key
            const sealedKey = await this.encryption.sealForOwner(
                key,
                ownerPublicKey
            );
            
            // Generate metadata hash for verification
            const metadataHash = await this.encryption.hash(encrypted);
            
            return {
                uri,
                sealedKey,
                metadataHash,
                algorithm: this.options.algorithm,
                version: '1.0'
            };
        } catch (error) {
            throw new Error(`Metadata storage failed: ${error.message}`);
        }
    }
    
    async retrieveMetadata(uri, sealedKey, ownerPrivateKey) {
        try {
            // Fetch encrypted data from storage
            const encrypted = await this.storage.retrieve(uri);
            
            // Unseal the encryption key
            const key = await this.encryption.unsealKey(
                sealedKey,
                ownerPrivateKey
            );
            
            // Decrypt and return metadata
            const decrypted = await this.encryption.decrypt(encrypted, key);
            
            return decrypted;
        } catch (error) {
            throw new Error(`Metadata retrieval failed: ${error.message}`);
        }
    }
    
    _validateMetadata(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid metadata format');
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        const serialized = JSON.stringify(data);
        if (serialized.length > maxSize) {
            throw new Error('Metadata exceeds size limit');
        }
    }
}

Security Considerations
🔑 Key Management
Best Practices:

Use hardware security modules (HSM) when available
Implement automatic key rotation every 90 days
Store private keys in secure enclaves or hardware wallets
Never log or expose private keys in error messages
Implementation:

class SecureKeyManager {
    constructor(hsmProvider) {
        this.hsm = hsmProvider;
        this.keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
    }
    
    async generateKey() {
        // Use HSM if available, fallback to secure random
        return this.hsm ? 
            await this.hsm.generateKey() : 
            await crypto.subtle.generateKey(/*...*/);;
    }
}

🔮 Oracle Security
TEE Verification:

Always verify TEE attestations before accepting proofs
Validate enclave signatures and measurement values
Implement attestation freshness checks
ZKP Auditing:

Audit circuit implementations thoroughly
Verify trusted setup parameters
Test edge cases and malformed inputs
Fallback Mechanisms:

contract OracleManager {
    address[] public oracles;
    uint256 public minConfirmations = 2;
    
    function verifyWithFallback(bytes calldata proof) external view returns (bool) {
        uint256 confirmations = 0;
        for (uint i = 0; i < oracles.length; i++) {
            if (IOracle(oracles[i]).verifyProof(proof)) {
                confirmations++;
            }
        }
        return confirmations >= minConfirmations;
    }
}

🛡️ Metadata Privacy
Encryption Standards:

Use AES-256-GCM for symmetric encryption
Implement RSA-4096 or ECC-P384 for key sealing
Always include authentication tags
Storage Security:

Encrypt metadata before network transmission
Use 0G Storage for decentralized, tamper-proof storage
Implement zero-knowledge access controls
Access Patterns:

// Secure metadata access pattern
async function accessMetadata(tokenId, requesterKey) {
    // 1. Verify ownership or authorization
    const isAuthorized = await verifyAccess(tokenId, requesterKey);
    if (!isAuthorized) throw new Error('Unauthorized');
    
    // 2. Retrieve encrypted metadata
    const encrypted = await storage.retrieve(getMetadataURI(tokenId));
    
    // 3. Decrypt only if authorized
    const decrypted = await decrypt(encrypted, requesterKey);
    
    return decrypted;
}

Advanced Features
Clone Functionality
The clone() function allows creating copies of INFTs while maintaining metadata security:

function clone(
    address to,
    uint256 tokenId,
    bytes calldata sealedKey,
    bytes calldata proof
) external returns (uint256) {
    require(canClone(tokenId, msg.sender), "Not authorized");
    
    uint256 newTokenId = _mint(to);
    _copyMetadata(tokenId, newTokenId, sealedKey, proof);
    
    return newTokenId;
}

Authorized Usage
Enable third parties to use INFT capabilities without ownership:

function authorizeUsage(
    uint256 tokenId,
    address executor,
    bytes calldata permissions
) external {
    require(ownerOf(tokenId) == msg.sender, "Not owner");
    
    _authorizations[tokenId][executor] = permissions;
    
    emit UsageAuthorized(tokenId, executor);
}

0G Infrastructure Integration
0G Storage Integration
// Store encrypted AI agent metadata
const metadata = {
    model: aiAgent.serializedModel,
    weights: aiAgent.trainedWeights,
    config: aiAgent.configuration
};

const encrypted = await encryptMetadata(metadata, ownerPublicKey);
const storageResult = await ogStorage.store(encrypted, {
    redundancy: 3,
    durability: '99.999%'
});

console.log(`Metadata stored at: ${storageResult.uri}`);

0G Compute Integration
// Execute secure inference without exposing model
const inferenceResult = await ogCompute.executeSecure({
    tokenId: inftId,
    executor: authorizedExecutor,
    input: userQuery,
    verificationMode: 'TEE' // or 'ZKP'
});

// Result includes proof of correct execution
console.log(`Inference result: ${inferenceResult.output}`);
console.log(`Verification proof: ${inferenceResult.proof}`);

0G Chain Deployment
// Deploy INFT contract to 0G Chain
const ERC7857Factory = await ethers.getContractFactory('ERC7857');
const inftContract = await ERC7857Factory.deploy(
    'AI Agent NFTs',
    'AINFT',
    oracleAddress,
    ogStorageAddress
);

await inftContract.deployed();
console.log(`INFT contract deployed at: ${inftContract.address}`);

Resources & References
Official Documentation
📜 EIP-7857 Specification - Official Ethereum standard proposal
💻 Reference Implementation - Complete codebase with examples
🔒 Security Audit Reports - Third-party security assessments (coming soon)

Community & Support
💬 Developer Forum - Technical discussions and Q&A
🐛 GitHub Issues - Bug reports and feature requests
📚 Knowledge Base - Common implementation patterns

Standards & Specifications
📄 ERC-721 Standard - Base NFT standard
🔐 Encryption Standards - NIST cryptography guidelines
🛡️ TEE Specifications - Intel SGX documentation

Next Steps
For Implementation
🚀 Integration Guide - Step-by-step development guide
🎯 Use Cases - Real-world implementation examples
📋 Best Practices Guide - Production deployment guidelines (coming soon)

For Testing
🧪 Testnet Deployment - Test your implementation
🗗️ Oracle Testing - Verify TEE and ZKP implementations
🔍 Security Testing - Audit your contracts

Community
💬 Join Discussions - Share implementations and get feedback
🚀 Contribute - Help improve the standard and tooling
📚 Learn - Explore advanced features and optimizations

Account
The 0G Compute Network uses a unified account system for managing funds across services. This guide covers how to manage your accounts using different interfaces: Web UI, CLI, and SDK.

Overview
The account system provides a secure and flexible way to manage funds across different AI service providers.

Account Structure
Main Account: Your primary wallet where funds are deposited. All deposits go here first, and you can withdraw funds from here back to your wallet.
Sub-Accounts: Provider-specific accounts created automatically when you transfer funds to a provider. Each provider has a separate sub-account where funds are locked for their specific services.
Fund Flow
Account Fund Flow Diagram
Deposit: Transfer funds from your wallet to your Main Account
Transfer: Move funds from Main Account to Provider Sub-Accounts
Usage: Provider deducts from Sub-Account for services rendered
Refund Request: Initiate refund from Sub-Account (enters 24-hour lock period)
Complete Refund: After lock period expires, call retrieve-fund again to complete transfer back to Main Account
Withdraw: Transfer funds from Main Account back to your wallet
Security Features
24-hour lock period for refunds to protect providers from abuse
Single-use authentication for each request to prevent replay attacks
On-chain verification for all transactions ensuring transparency
Provider acknowledgment required before first use of services
Prerequisites
Node.js >= 22.0.0
A wallet with 0G tokens (for testnet or mainnet)
EVM compatible wallet (for Web UI)
Choose Your Interface
Feature	Web UI	CLI	SDK
Setup time	~1 min	~2 min	~5 min
Visual dashboard	✅	❌	❌
Automation	❌	✅	✅
App integration	❌	❌	✅
Web UI
CLI
SDK
Best for: Quick account management with visual dashboard

Installation
pnpm add @0glabs/0g-serving-broker -g

Launch Web UI
0g-compute-cli ui start-web

Access the Web UI at http://localhost:3090/wallet where you can:

View your account balance in real-time
Deposit funds directly from your connected wallet
Transfer funds to provider sub-accounts
Monitor spending and usage
Request refunds with a visual interface
Best Practices
For Inference Services
Deposit enough funds for expected usage
Transfer funds to providers you plan to use frequently
Keep some balance in sub-accounts for better response times
Monitor usage regularly
For Fine-tuning Services
Calculate dataset size before transferring funds
Transfer enough to cover the entire training job
Request refunds for unused funds after job completion
Troubleshooting
Insufficient Balance Error
Refund Not Available
Transaction Failed
Related Documentation
Inference Services - Using AI inference with your funded accounts
Fine-tuning Services - Training custom models with your funded accounts
Previous
Compute Network Overview


0G Compute Inference
0G Compute Network provides decentralized AI inference services, supporting various AI models including Large Language Models (LLM), text-to-image generation, and speech-to-text processing.

Prerequisites
Node.js >= 22.0.0
A wallet with 0G tokens (either testnet or mainnet)
EVM compatible wallet (for Web UI)
Supported Service Types
Chatbot Services: Conversational AI with models like GPT, DeepSeek, and others
Text-to-Image: Generate images from text descriptions using Stable Diffusion and similar models
Speech-to-Text: Transcribe audio to text using Whisper and other speech recognition models
Available Services
Testnet Services
View Testnet Services (2 Available)
Mainnet Services
View Mainnet Services (7 Available)
Choose Your Interface
Feature	Web UI	CLI	SDK
Setup time	~1 min	~2 min	~5 min
Interactive chat	✅	❌	❌
Automation	❌	✅	✅
App integration	❌	❌	✅
Direct API access	❌	❌	✅
Web UI
CLI
SDK
Best for: Quick testing, experimentation and direct frontend integration.

Option 1: Use the Hosted Web UI
Visit the official 0G Compute Marketplace directly — no installation required:

https://compute-marketplace.0g.ai/inference

Option 2: Run Locally
Installation
pnpm add @0glabs/0g-serving-broker -g

Launch Web UI
0g-compute-cli ui start-web

Open http://localhost:3090 in your browser.

Getting Started
1. Connect & Fund
Connect your wallet (MetaMask recommended)
Deposit some 0G tokens using the account dashboard
Browse available AI models and their pricing
2. Start Using AI Services
Option A: Chat Interface

Click "Chat" on any chatbot provider
Start conversations immediately
Perfect for testing and experimentation
Option B: Get API Integration

Click "Build" on any provider
Get step-by-step integration guides
Copy-paste ready code examples
Understanding Delayed Fee Settlement
How Fee Settlement Works
0G Compute Network uses delayed (batch) settlement for provider fees. This means:

Fees are not deducted immediately after each inference request. Instead, the provider accumulates usage fees and settles them on-chain in batches.
Your sub-account balance may appear to drop suddenly when a batch settlement occurs. For example, if you make 10 requests and the provider settles all at once, you'll see a single larger deduction rather than 10 small ones.
You are only charged for actual usage — no extra fees are deducted. The total amount settled always matches the sum of your individual request costs.
This is by design to reduce on-chain transaction costs and improve efficiency for both users and providers.
What this means in practice:

After making requests, your provider sub-account balance may temporarily appear higher than your "true" available balance
When settlement occurs, the balance updates to reflect all accumulated fees at once
If you see a sudden balance decrease, check your usage history — the total will match your actual usage
This behavior is visible in the Web UI (provider sub-account balances), CLI (get-account), and SDK (getAccount()).

Rate Limits
Per-User Rate Limits
Each provider enforces per-user rate limits to ensure fair resource sharing across all users. The default limits are:

30 requests per minute per user (sustained)
Burst allowance of 5 requests (short spikes allowed)
5 concurrent requests per user
If you exceed these limits, the provider will return HTTP 429 Too Many Requests. Wait briefly and retry. These limits are set by individual providers and may vary.

Troubleshooting
Common Issues
Error: Too many requests (429)
Error: Insufficient balance
Error: Provider not acknowledged
Error: No funds in provider sub-account
Web UI not starting
Next Steps
Manage Accounts → Account Management Guide
Fine-tune Models → Fine-tuning Guide
Become a Provider → Provider Setup
View Examples → GitHub


Fine-tuning
Customize AI models with your own data using 0G's distributed GPU network.

Quick Start
Prerequisites
Node version >= 22.0.0

Install CLI
pnpm install @0glabs/0g-serving-broker -g

Set Environment
Choose Network
# Setup network
0g-compute-cli setup-network

Login with Wallet
Enter your wallet private key when prompted.

# Login with your wallet private key
0g-compute-cli login

Create Account & Add Funds
The Fine-tuning CLI requires an account to pay for service fees via the 0G Compute Network.

For detailed account management instructions, see Account Management.

# Deposit funds to your account
0g-compute-cli deposit --amount 3

# Transfer funds to a provider for fine-tuning
# IMPORTANT: You must specify --service fine-tuning, otherwise funds go to the inference sub-account
0g-compute-cli transfer-fund --provider <PROVIDER_ADDRESS> --amount 2 --service fine-tuning


tip
If you see MinimumDepositRequired when creating a task, it means you haven't transferred funds to the provider's fine-tuning sub-account. Make sure to include --service fine-tuning in the transfer-fund command.

List Providers
0g-compute-cli fine-tuning list-providers

The output will be like:

┌──────────────────────────────────────────────────┬──────────────────────────────────────────────────┐
│ Provider 1                                       │ 0x940b4a101CaBa9be04b16A7363cafa29C1660B0d       │
├──────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ Available                                        │ ✓                                                │
└──────────────────────────────────────────────────┴──────────────────────────────────────────────────┘


Provider x: The address of the provider.
Available: Indicates if the provider is available. If ✓, the provider is available. If ✗, the provider is occupied.
List Models
# List available models
0g-compute-cli fine-tuning list-models

📋 Available Models Summary
The output consists of two main sections:

Predefined Models: Models provided by the system as predefined options. They are built-in, curated, and maintained to ensure quality and reliability.

Provider's Model: Models offered by external service providers. Providers may customize or fine-tune models to address specific needs.

Model Name Format
Use model names without the Qwen/ prefix when specifying the --model parameter. For example:

✅ --model "Qwen2.5-0.5B-Instruct"
❌ --model "Qwen/Qwen2.5-0.5B-Instruct"
Prepare Configuration File
Use the standard configuration template below and only modify the parameter values as needed. Do not add additional parameters.

Standard Configuration Template
{
  "neftune_noise_alpha": 5,
  "num_train_epochs": 1,
  "per_device_train_batch_size": 2,
  "learning_rate": 0.0002,
  "max_steps": 3
}

Important Configuration Rules
Use the template above - Copy the entire template
Only modify parameter values - Do not add or remove parameters
Use decimal notation - Write 0.0002 instead of 2e-4 for learning_rate
Common mistakes to avoid:

❌ Adding extra parameters (e.g., "fp16": true, "bf16": false)
❌ Removing existing parameters
❌ Using scientific notation like 2e-4
Adjustable Parameters
You can modify these parameter values based on your training needs:

Parameter	Description	Notes
neftune_noise_alpha	Noise injection for fine-tuning	0-10 (0 = disabled), typical: 5
num_train_epochs	Number of complete passes through the dataset	Positive integer, typical: 1-3 for fine-tuning
per_device_train_batch_size	Training batch size	1-4, reduce to 1 if out of memory
learning_rate	Learning rate (use decimal notation)	0.00001-0.001, typical: 0.0002
max_steps	Maximum training steps	-1 (use epochs) or positive integer
GPU Memory Management
If you encounter out-of-memory errors, reduce batch size to 1
The provider automatically handles mixed precision training with bf16
Note: For custom models provided by third-party Providers, you can download the usage template including instructions on how to construct the dataset and training configuration using the following command:

0g-compute-cli fine-tuning model-usage --provider <PROVIDER_ADDRESS>  --model <MODEL_NAME>   --output <PATH_TO_SAVE_MODEL_USAGE>


Prepare Your Data
Your dataset must be in JSONL format with a .jsonl file extension. Each line is a JSON object representing one training example.

Supported Dataset Formats
Format 1: Instruction-Input-Output

{"instruction": "Translate to French", "input": "Hello world", "output": "Bonjour le monde"}
{"instruction": "Translate to French", "input": "Good morning", "output": "Bonjour"}
{"instruction": "Summarize the text", "input": "Long article...", "output": "Brief summary"}


Format 2: Chat Messages

{"messages": [{"role": "user", "content": "What is 2+2?"}, {"role": "assistant", "content": "2+2 equals 4."}]}
{"messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there! How can I help you?"}]}


Format 3: Simple Text (for text completion)

{"text": "The quick brown fox jumps over the lazy dog."}
{"text": "Machine learning is a subset of artificial intelligence."}

Dataset Guidelines
File format: Must be a .jsonl file (JSONL format)
Minimum examples: At least 10 examples recommended for meaningful fine-tuning
Quality: Ensure examples are accurate and representative of your use case
Consistency: Use the same format throughout the dataset
Encoding: UTF-8 encoding required
Create Task
Create a fine-tuning task. The fee will be automatically calculated by the broker based on the actual token count of your dataset.

Option A: Using local dataset file (Recommended)

The CLI will automatically upload the dataset to 0G Storage and create the task in one step:

0g-compute-cli fine-tuning create-task \
  --provider <PROVIDER_ADDRESS> \
  --model <MODEL_NAME> \
  --dataset-path <PATH_TO_DATASET> \
  --config-path <PATH_TO_CONFIG_FILE>

Option B: Using dataset root hash

If you prefer to upload the dataset separately first, or need to reuse the same dataset:

Upload your dataset to 0G Storage:
0g-compute-cli fine-tuning upload --data-path <PATH_TO_DATASET>

Output:

Root hash: 0xabc123...

Create the task using the root hash:
0g-compute-cli fine-tuning create-task \
  --provider <PROVIDER_ADDRESS> \
  --model <MODEL_NAME> \
  --dataset <DATASET_ROOT_HASH> \
  --config-path <PATH_TO_CONFIG_FILE>

Parameters:

Parameter	Description
--provider	Address of the service provider
--model	Name of the pretrained model (without Qwen/ prefix)
--dataset-path	Path to local dataset file — automatically uploads to 0G Storage (Option A)
--dataset	Root hash of the dataset on 0G Storage — mutually exclusive with --dataset-path (Option B)
--config-path	Path to the training configuration file
--gas-price	Gas price (optional)
The output will be like:

Verify provider...
Provider verified
Creating task (fee will be calculated automatically)...
Fee will be automatically calculated by the broker based on actual token count
Created Task ID: 6b607314-88b0-4fef-91e7-43227a54de57

Note: When creating a task for the same provider, you must wait for the previous task to be completed (status Finished) before creating a new task. If the provider is currently running other tasks, you will be prompted to choose between adding your task to the waiting queue or canceling the request.

Fee Calculation
The fine-tuning service fee is automatically calculated based on your dataset size and training configuration. The fee consists of two components:

Formula
Total Fee = Training Fee + Storage Reserve Fee

Where:

Training Fee = (tokenSize / 1,000,000) × pricePerMillionTokens × trainEpochs
Storage Reserve Fee = Fixed amount based on model size
Components Explained
Component	Description
tokenSize	Total number of tokens in your dataset (automatically counted)
pricePerMillionTokens	Price per million tokens (model-specific, see Predefined Models)
trainEpochs	Number of training epochs (from your config)
Storage Reserve Fee	Fixed fee to reserve storage for the fine-tuned model:
• Qwen3-32B (~900 MB LoRA): 0.09 0G
• Qwen2.5-0.5B-Instruct (~100 MB LoRA): 0.01 0G
Example
For a dataset with 10,000 tokens, trained for 3 epochs on Qwen2.5-0.5B-Instruct:

Price per million tokens = 0.5 0G (see Predefined Models)
Training Fee = (10,000 / 1,000,000) × 0.5 × 3 = 0.015 0G
Storage Reserve Fee = 0.01 0G (for Qwen2.5-0.5B-Instruct)
Total Fee = 0.025 0G
tip
The actual fee is calculated during the setup phase after your dataset is analyzed. You can view the final fee using the get-task command before training begins.

Monitor Progress
You can monitor the progress of your task by running the following command:

0g-compute-cli fine-tuning get-task --provider <PROVIDER_ADDRESS> --task <TASK_ID>

The output will be like:

┌───────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┐
│ Field                             │ Value                                                                               │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ ID                                │ beb6f0d8-4660-4c62-988d-00246ce913d2                                                │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Created At                        │ 2025-03-11T01:20:07.644Z                                                            │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Pre-trained Model Hash            │ 0xcb42b5ca9e998c82dd239ef2d20d22a4ae16b3dc0ce0a855c93b52c7c2bab6dc                  │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Dataset Hash                      │ 0xaae9b4e031e06f84b20f10ec629f36c57719ea512992a6b7e2baea93f447a5fa                  │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Training Params                   │ {......}                                                                            │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Fee (neuron)                      │ 82                                                                                  │
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Progress                          │ Delivered                                                                           │
└───────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘


Field Descriptions:

ID: Unique identifier for your fine-tuning task
Pre-trained Model Hash: Hash identifier for the base model being fine-tuned
Dataset Hash: Hash identifier for your training dataset (0G Storage root hash)
Training Params: Configuration parameters used during fine-tuning
Fee (neuron): Total cost for the fine-tuning task (automatically calculated based on token count)
Progress: Task status. Possible values are:
Init: Task submitted
SettingUp: Provider is preparing the environment (downloading dataset, etc.)
SetUp: Provider is ready to start training
Training: Provider is training the model
Trained: Provider has finished training
Delivering: Provider is encrypting and uploading the model to 0G Storage
Delivered: Fine-tuning result is ready for download
UserAcknowledged: User has downloaded and confirmed the result
Finished: Provider has settled fees and shared decryption key — task is completed
Failed: Task failed
View Task Logs
You can view the logs of your task by running the following command:

0g-compute-cli fine-tuning get-log --provider <PROVIDER_ADDRESS> --task <TASK_ID>

The output will be like:

creating task....
Step: 0, Logs: {'loss': ..., 'accuracy': ...}
...
Training model for task beb6f0d8-4660-4c62-988d-00246ce913d2 completed successfully

Download and Acknowledge Model
Use the Check Task command to view task status. When the status changes to Delivered, the provider has completed fine-tuning and the encrypted model is ready. Download and acknowledge the model:

0g-compute-cli fine-tuning acknowledge-model \
  --provider <PROVIDER_ADDRESS> \
  --task-id <TASK_ID> \
  --data-path <PATH_TO_SAVE_MODEL_FILE>

The CLI will automatically download the encrypted model from 0G Storage. If 0G Storage download fails, it will fall back to downloading directly from the provider's TEE.

48-Hour Deadline
You must download and acknowledge the model within 48 hours after the task status changes to Delivered.

If you fail to acknowledge within 48 hours:

The provider will force settlement automatically
You will lose access to the fine-tuned model
30% of the total task fee will be deducted as compensation for the provider's compute resources
Action required: Monitor your task status and download promptly when it reaches Delivered.

File Path Required
--data-path must be a file path, not a directory.

Example:

0g-compute-cli fine-tuning acknowledge-model \
  --provider <PROVIDER_ADDRESS> \
  --task-id 0e91ef3d-ac0d-422e-a38c-9d42a28c4412 \
  --data-path /workspace/output/encrypted_model.bin

Data Integrity Verification
The acknowledge-model command performs automatic data integrity verification to ensure the downloaded model matches the root hash that the provider submitted to the blockchain contract. This guarantees you receive the authentic model without corruption or tampering.

Note: The model file downloaded with the above command is encrypted, and additional steps are required for decryption.

Decrypt Model
After acknowledging the model, the provider automatically settles the fees and uploads the decryption key to the contract (encrypted with your public key). Use the get-task command to check the task status. When the status changes to Finished, you can decrypt the model:

0g-compute-cli fine-tuning decrypt-model \
  --provider <PROVIDER_ADDRESS> \
  --task-id <TASK_ID> \
  --encrypted-model <PATH_TO_ENCRYPTED_MODEL_FILE> \
  --output <PATH_TO_SAVE_DECRYPTED_MODEL>

Example:

# Use the same file path you specified in acknowledge-model
0g-compute-cli fine-tuning decrypt-model \
  --provider <PROVIDER_ADDRESS> \
  --task-id 0e91ef3d-ac0d-422e-a38c-9d42a28c4412 \
  --encrypted-model /workspace/output/encrypted_model.bin \
  --output /workspace/output/model_output.zip

The above command performs the following operations:

Gets the encrypted key from the contract uploaded by the provider
Decrypts the key using the user's private key
Decrypts the model with the decrypted key
Wait for Settlement
After acknowledge-model, the provider needs about 1 minute to settle fees and upload the decryption key. If you decrypt too early (status is still UserAcknowledged instead of Finished), you may see an error like second arg must be public key. Simply wait and retry.

Note: The decrypted result will be saved as a zip file. Ensure that the <PATH_TO_SAVE_DECRYPTED_MODEL> ends with .zip (e.g., model_output.zip). After downloading, unzip the file to access the decrypted model.

Extract LoRA Adapter
After decryption, unzip the model to access the LoRA adapter files:

unzip model_output.zip -d ./lora_adapter/

The extracted folder will contain:

lora_adapter/
├── output_model/
│   ├── adapter_config.json       # LoRA configuration
│   ├── adapter_model.safetensors # LoRA weights
│   ├── tokenizer.json            # Tokenizer
│   ├── tokenizer_config.json
│   └── README.md

Using the Fine-tuned Model
After fine-tuning, you receive a LoRA adapter (Low-Rank Adaptation), not a full model. To use it, you need to:

Download the base model
Load the LoRA adapter on top of the base model
Run inference
Step 1: Download Base Model
Download the same base model that was used for fine-tuning from HuggingFace:

# Install huggingface-cli if not already installed
pip install huggingface_hub

# For Qwen2.5-0.5B-Instruct
huggingface-cli download Qwen/Qwen2.5-0.5B-Instruct --local-dir ./base_model

# For Qwen3-32B (requires ~65GB disk space)
# huggingface-cli download Qwen/Qwen3-32B --local-dir ./base_model

Step 2: Load LoRA with Base Model
Use the following Python code to combine the LoRA adapter with the base model.

For Qwen2.5-0.5B-Instruct:

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# Paths
base_model_path = "./base_model"  # or "Qwen/Qwen2.5-0.5B-Instruct"
lora_adapter_path = "./lora_adapter/output_model"

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(lora_adapter_path)

# Load base model
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# Load LoRA adapter
model = PeftModel.from_pretrained(base_model, lora_adapter_path)

print("Model loaded successfully!")

For Qwen3-32B (requires 40GB+ VRAM):

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# Paths
base_model_path = "./base_model"  # or "Qwen/Qwen3-32B"
lora_adapter_path = "./lora_adapter/output_model"

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(lora_adapter_path)

# Load base model with optimizations for large models
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    torch_dtype=torch.float16,      # Use fp16 to reduce memory
    device_map="auto",               # Automatically distribute across GPUs
    low_cpu_mem_usage=True,          # Reduce CPU memory usage during loading
    trust_remote_code=True           # Required for some Qwen models
)

# Load LoRA adapter
model = PeftModel.from_pretrained(base_model, lora_adapter_path)

print("Model loaded successfully!")

Memory Optimization for Large Models
If you encounter out-of-memory errors with Qwen3-32B, you can use quantization:

# 8-bit quantization (requires bitsandbytes)
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(load_in_8bit=True)

base_model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True
)

Step 3: Run Inference
def generate_response(prompt, max_new_tokens=100):
    messages = [{"role": "user", "content": prompt}]
    
    # Apply chat template
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    # Tokenize
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    
    # Generate
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.7,
        top_p=0.9
    )
    
    # Decode
    response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    return response

# Example usage
response = generate_response("Hello, how are you?")
print(response)


Optional: Merge and Save Full Model
If you want to create a standalone model without needing to load the adapter separately:

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# Load base model and LoRA
base_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-0.5B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto"
)
model = PeftModel.from_pretrained(base_model, "./lora_adapter/output_model")

# Merge LoRA weights into base model
merged_model = model.merge_and_unload()

# Save the merged model
merged_model.save_pretrained("./merged_model")
tokenizer = AutoTokenizer.from_pretrained("./lora_adapter/output_model")
tokenizer.save_pretrained("./merged_model")

print("Merged model saved to ./merged_model")

Requirements
Install the required Python packages:

For GPU Environments (Recommended)
If you have an NVIDIA GPU, install PyTorch with CUDA support. Important: Match the CUDA version to your environment.

# For CUDA 12.1 (check your CUDA version with: nvidia-smi)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other ML libraries
pip install transformers peft accelerate


For CPU-Only Environments
pip install torch transformers peft accelerate

Package Requirements
Package	Minimum Version	Purpose
torch	>= 2.0	Deep learning framework
transformers	>= 4.40.0	Model loading and inference
peft	>= 0.10.0	LoRA adapter support
accelerate	>= 0.27.0	Device management
Verify GPU Support
After installation, verify that PyTorch can detect your GPU:

python3 -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"


If CUDA available: False, you may need to reinstall PyTorch with the correct CUDA version.

Account Management
For comprehensive account management, including viewing balances, managing sub-accounts, and handling refunds, see Account Management.

Quick CLI commands:

# Check balance
0g-compute-cli get-account

# View sub-account for a provider
0g-compute-cli get-sub-account --provider <PROVIDER_ADDRESS>

# Request refund from sub-accounts
0g-compute-cli retrieve-fund

Other Commands
Upload Dataset Separately
You can upload a dataset to 0G Storage before creating a task:

0g-compute-cli fine-tuning upload --data-path <PATH_TO_DATASET>

Download Data
You can download previously uploaded datasets from 0G Storage:

0g-compute-cli fine-tuning download --data-path <PATH_TO_SAVE_DATASET> --data-root <DATASET_ROOT_HASH>


View Task List
You can view the list of tasks submitted to a specific provider using the following command:

0g-compute-cli fine-tuning list-tasks  --provider <PROVIDER_ADDRESS>

Cancel a Task
You can cancel a task before it starts running using the following command:

0g-compute-cli fine-tuning cancel-task --provider <PROVIDER_ADDRESS> --task <TASK_ID>

### Observation

For web3 integration use wagmi and viem instead of ethers.