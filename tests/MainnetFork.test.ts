import { expect } from "chai";
import { ethers } from "hardhat";
import { LUKSOGenesisDepositContract } from "../typechain-types";
import { ReversibleICOToken } from "../types";
import { generateDepositData } from "./helpers";
import {
  LYXeHolders,
  LYXE_ADDRESS,
  ETH_HOLDER_WITHOUT_LYXE,
  DEPOSIT_AMOUNT,
} from "./constants";

describe("Testing on Mainnet Fork", async function () {
  let LYXeContract: ReversibleICOToken;
  let depositContract: LUKSOGenesisDepositContract;
  let depositAddress: string;
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
      "LUKSOGenesisDepositContract"
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

      const { depositDataHex } = generateDepositData();

      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      // deposit LYXe to Deposit contract
      await LYXeContract.connect(LYXeHolderSigner).send(
        depositAddress,
        DEPOSIT_AMOUNT,
        depositDataHex
      );

      // // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const depositBalanceAfterInLYXe = depositBalanceAfter.toString();

      expect(depositBalanceAfterInLYXe).to.equal(DEPOSIT_AMOUNT);

      expect(await depositContract.get_deposit_data_by_index(0)).to.equal(
        depositDataHex
      );
    });

    it("should deposit for multiple depositors", async function () {
      const { depositDataHex } = generateDepositData();

      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      for (let i = 0; i < LYXeHolders.length; i++) {
        const LYXeHolder = LYXeHolders[i];
        const signer = await ethers.getImpersonatedSigner(LYXeHolder);
        await LYXeContract.connect(signer).send(
          depositAddress,
          DEPOSIT_AMOUNT,
          depositDataHex
        );
      }

      // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const expectedBalance =
        BigInt(LYXeHolders.length) * BigInt(DEPOSIT_AMOUNT);
      expect(depositBalanceAfter).to.equal(expectedBalance);

      for (let i = 0; i < LYXeHolders.length; i++) {
        expect(await depositContract.get_deposit_data_by_index(i)).to.equal(
          depositDataHex
        );
      }

      expect(await depositContract.get_deposit_data_by_index(10)).to.equal(
        "0x"
      );
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

      const { depositDataHex } = generateDepositData();

      await expect(
        LYXeContract.connect(LYXelessSigner).send(
          depositAddress,
          DEPOSIT_AMOUNT,
          depositDataHex
        )
      ).to.be.revertedWith("Sending failed: Insufficient funds");

      expect(await depositContract.get_deposit_data_by_index(0)).to.equal("0x");

      expect(await depositContract.get_deposit_data_by_index(1)).to.equal("0x");
    });
  });
});
