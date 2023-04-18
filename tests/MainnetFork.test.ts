import { expect } from "chai";
import { ethers, network } from "hardhat";
import { LUKSOGenesisValidatorsDepositContract } from "../typechain-types";
import { ReversibleICOToken } from "../types";
import {
  generateHexBetweenOneAndOneHundred,
  getDepositDataByIndex,
} from "./helpers";
import {
  LYXeHolders,
  LYXE_ADDRESS,
  ETH_HOLDER_WITHOUT_LYXE,
  DEPOSIT_AMOUNT,
  DEPOSIT_START_TIMESTAMP,
} from "./constants";

describe("Testing on Mainnet Fork", async function () {
  let LYXeContract: ReversibleICOToken;
  let depositContract: LUKSOGenesisValidatorsDepositContract;
  let depositAddress: string;

  await network.provider.send("evm_setNextBlockTimestamp", [
    DEPOSIT_START_TIMESTAMP,
  ]);

  beforeEach(async () => {
    const depositContractDeployer = await ethers.getImpersonatedSigner(
      ETH_HOLDER_WITHOUT_LYXE
    );

    // LYXe contract
    LYXeContract = await ethers.getContractAt(
      "ReversibleICOToken",
      LYXE_ADDRESS
    );

    const DepositFactory = await ethers.getContractFactory(
      "LUKSOGenesisValidatorsDepositContract"
    );

    depositContract = await DepositFactory.connect(
      depositContractDeployer
    ).deploy();

    await depositContract.deployed();
    depositAddress = depositContract.address;
  });

  describe("when depositor has LYXe and ETH to pay for tx", () => {
    it("should deposit for 1 depositor", async function () {
      // address with LYXe
      const LYXeHolder = LYXeHolders[0];

      const LYXeHolderSigner = await ethers.getImpersonatedSigner(LYXeHolder);

      const { depositDataHex } = getDepositDataByIndex(1);

      const supplyVoteBytes = generateHexBetweenOneAndOneHundred();

      // append supplyVoteBytes to depositData
      const depositDataWithVote = depositDataHex + supplyVoteBytes;

      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      // deposit LYXe to Deposit contract
      await LYXeContract.connect(LYXeHolderSigner).send(
        depositAddress,
        DEPOSIT_AMOUNT,
        depositDataWithVote
      );

      // // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const depositBalanceAfterInLYXe = depositBalanceAfter.toString();

      expect(depositBalanceAfterInLYXe).to.equal(DEPOSIT_AMOUNT);

      expect(await depositContract.getDepositDataByIndex(0)).to.equal(
        depositDataWithVote
      );
    });

    it("should deposit for multiple depositors", async function () {
      const supplyVoteBytes = generateHexBetweenOneAndOneHundred();
      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      // Create an array to store depositDataWithVote values
      const depositDataWithVotes = [];

      for (let i = 0; i < LYXeHolders.length; i++) {
        // Generate deposit data for each deposit
        const { depositDataHex } = getDepositDataByIndex(i);
        const depositDataWithVote = depositDataHex + supplyVoteBytes;

        // Store the depositDataWithVote value in the array
        depositDataWithVotes.push(depositDataWithVote);

        const LYXeHolder = LYXeHolders[i];
        const signer = await ethers.getImpersonatedSigner(LYXeHolder);
        await LYXeContract.connect(signer).send(
          depositAddress,
          DEPOSIT_AMOUNT,
          depositDataWithVote
        );
      }

      // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const expectedBalance =
        BigInt(LYXeHolders.length) * BigInt(DEPOSIT_AMOUNT);
      expect(depositBalanceAfter).to.equal(expectedBalance);

      // Update the loop to use the stored depositDataWithVote values
      for (let i = 0; i < LYXeHolders.length; i++) {
        expect(await depositContract.getDepositDataByIndex(i)).to.equal(
          depositDataWithVotes[i]
        );
      }

      expect(await depositContract.getDepositDataByIndex(10)).to.equal("0x");
    });
  });

  describe("when depositor has no LYXe", () => {
    it("should revert", async function () {
      const LYXelessSigner = await ethers.getImpersonatedSigner(
        ETH_HOLDER_WITHOUT_LYXE
      );

      // get eth balance of depositor before deposit
      const balance = await LYXelessSigner.getBalance();

      // convert eth balance to ethers
      const balanceInETH = parseInt(ethers.utils.formatEther(balance));

      // expect balance to be greater than 1 eth to pay for tx
      expect(balanceInETH).to.be.greaterThan(1);

      const { depositDataHex } = getDepositDataByIndex(0);

      await expect(
        LYXeContract.connect(LYXelessSigner).send(
          depositAddress,
          DEPOSIT_AMOUNT,
          depositDataHex
        )
      ).to.be.revertedWith("Sending failed: Insufficient funds");

      expect(await depositContract.getDepositDataByIndex(0)).to.equal("0x");

      expect(await depositContract.getDepositDataByIndex(1)).to.equal("0x");
    });
  });
});
