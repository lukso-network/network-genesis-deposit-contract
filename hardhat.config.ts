import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-erc1820";
import "dotenv/config";

const { INFURA_KEY, COINMARKETCAP_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.5.0",
      },

      {
        version: "0.8.15",
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
    coinmarketcap: COINMARKETCAP_KEY,
  },
};

export default config;
