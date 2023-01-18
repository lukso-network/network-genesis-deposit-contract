import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-erc1820";
import "dotenv/config";

const { INFURA_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
      },
      {
        version: "0.8.1",
      },
      {
        version: "0.5.0",
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
        blockNumber: 15975554,
      },
    },
  },
  paths: {
    artifacts: "artifacts",
    tests: "tests",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
    coinmarketcap: "132e4fb4-1b3d-43b3-920a-65777cf1830b",
  },
};

export default config;
