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
        version: "0.5.3",
      },
      { version: '0.6.11'
    },
      {
        version: "0.8.15",
      },
    ],
  },
  networks: {
    ethereum: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
        blockNumber: 15975554,
      },
    },
    l14: {
      url: `https://rpc.l14.lukso.network/`,

      accounts: [
        `0xb5da010fdf1766f750ac2e9975b4cc2845131d873dc07ae64c96af6aefc8aafc`,
      ],
      gasPrice: 30000,
    },
    l2022: {
      url: `https://rpc.2022.l16.lukso.network/`,
      accounts: [
        `0xbbc6703446945a0d6e1d40d50664da1c37bf51a1383ce165af96ccaa62c8f56e`,
      ],
      gasPrice: 30000,
    },
    l3030: {
      url: `https://rpc.execution.3030.devnet.lukso.dev`,
      accounts: [
        `0xbbc6703446945a0d6e1d40d50664da1c37bf51a1383ce165af96ccaa62c8f56e`,
      ],
      gasPrice: 30000,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [
        `0xb5da010fdf1766f750ac2e9975b4cc2845131d873dc07ae64c96af6aefc8aafc`,
      ],
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
  etherscan: {
    apiKey: "no-api-key-needed",
    customChains: [
      {
        network: "l2022",
        chainId: 2022,
        urls: {
          apiURL: "https://explorer.execution.2022.l16.lukso.network/api",
          browserURL: "https://explorer.execution.2022.l16.lukso.network/",
        },
      },
    ],
  },
};

export default config;
