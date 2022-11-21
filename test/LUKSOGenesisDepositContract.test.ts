import {ethers} from 'hardhat';
import {expect} from 'chai';

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers";
import {
  TestToken__factory,
  TestToken,
  LUKSOGenesisDepositContract__factory,
  LUKSOGenesisDepositContract
} from '../typechain-types';

export type LUKSOGenesisDepositContractContext = {
  accounts: SignerWithAddress[];
  testTokenOwner: SignerWithAddress;
  testToken: TestToken;
  depositContractOwner: SignerWithAddress;
  depositContract: LUKSOGenesisDepositContract;
};

const buildContext = async () => {
  const accounts = await ethers.getSigners();
  const testTokenOwner = accounts[1];
  const testToken = await new TestToken__factory(testTokenOwner).deploy("TestToken", "TT", [testTokenOwner.address]);
  const depositContractOwner = accounts[0];
  const depositContract = await new LUKSOGenesisDepositContract__factory(depositContractOwner).deploy(testToken.address);

  return {
    accounts, testTokenOwner, testToken, depositContractOwner, depositContract
  }
}
  
describe("Testing LUKSOGenesisDepositContract", () => {
  let context: LUKSOGenesisDepositContractContext;
  before(async () => {
    context = await buildContext();
  });

  describe("when using `tokensReceived(..)`", () => {
    it("a", async () => {
      console.log(context.depositContract.address);
      expect(1).to.equal(1);
    });
  });

  describe("when using `getDepositData(..)`", () => {
    it("a", async () => {
      console.log(context.depositContract.address);
    });
  });

  describe("when using `getDepositDataByIndex(..)`", () => {
    it("a", async () => {
      console.log(context.depositContract.address);
    });
  });

  describe("when using `freezeContract(..)`", () => {
    it("a", async () => {
      console.log(context.depositContract.address);
    });
  });

  describe("when using `convertBytesToBytes32(..)`", () => {
    it("a", async () => {
      console.log(context.depositContract.address);
    });
  });
});