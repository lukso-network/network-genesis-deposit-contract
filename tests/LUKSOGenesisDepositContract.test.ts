import {ethers} from 'hardhat';
import {expect} from 'chai';

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers";
import {
  TestToken__factory,
  TestToken,
  LUKSOGenesisDepositContract__factory,
  LUKSOGenesisDepositContract
} from '../types';

export type LUKSOGenesisDepositContractContext = {
  accounts: SignerWithAddress[];
  testTokenOwner: SignerWithAddress;
  testToken: TestToken;
  depositContractOwner: SignerWithAddress;
  depositContract: LUKSOGenesisDepositContract;
};

const buildContext = async () => {
  const accounts = await ethers.getSigners();
  const testTokenOwner = accounts[0];
  const testToken = await new TestToken__factory(testTokenOwner).deploy("TestToken", "TT", []);
  const depositContractOwner = accounts[1];
  const depositContract = await new LUKSOGenesisDepositContract__factory(depositContractOwner).deploy(testToken.address);

  return {
    accounts, testTokenOwner, testToken, depositContractOwner, depositContract
  }
}
  
describe("Testing LUKSOGenesisDepositContract", () => {
  let context: LUKSOGenesisDepositContractContext;
  let validators: SignerWithAddress[];
  before(async () => {
    context = await buildContext();
    validators = [
      context.accounts[2],
      context.accounts[3],
      context.accounts[4],
      context.accounts[5],
    ];
  });

  describe.only("when using `tokensReceived(..)`", () => {
    before(async () => {
      await context.testToken.connect(context.testTokenOwner).mint(validators[0].address, ethers.utils.parseEther("100"));
      await context.testToken.connect(context.testTokenOwner).mint(validators[1].address, ethers.utils.parseEther("100"));
      await context.testToken.connect(context.testTokenOwner).mint(validators[2].address, ethers.utils.parseEther("100"));
      await context.testToken.connect(context.testTokenOwner).mint(validators[3].address, ethers.utils.parseEther("100"));
    });

    it("a", async () => {
      await context.testToken
        .connect(validators[0])
        .send(context.depositContract.address, ethers.utils.parseEther("100"), "0x");
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