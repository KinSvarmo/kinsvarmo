# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to 0G testnet

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to 0G testnet, you need an account with funds to send the transaction. The provided Hardhat configuration includes configuration variables called `OG_RPC_URL` and `PRIVATE_KEY`, which you can use to set the RPC URL and private key for the deployer account.

You can set those variables using the `hardhat-keystore` plugin or by setting them as environment variables.

To set the `PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set PRIVATE_KEY
```

After setting the variables, you can run the deployment with the 0G testnet network:

```shell
npx hardhat run scripts/deploy.ts --network 0gTestnet
```
