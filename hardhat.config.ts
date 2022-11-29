import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-erc1820";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
      },
      {
        version: "0.8.1",
      }
    ],
  },
  paths: {
    artifacts: "artifacts",
    tests: "tests",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
};

export default config;
