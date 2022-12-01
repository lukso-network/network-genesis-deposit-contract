import { expect } from "chai";
import { ethers } from "hardhat";
import { LUKSOGenesisDepositContract } from "../typechain-types";
import { ReversibleICOToken } from "../types";
import { generateDepositData } from "./helpers";

describe("Testing on Mainnet Fork", async function () {
  const LYXeContractAddress = "0xA8b919680258d369114910511cc87595aec0be6D";
  let LYXeContract: ReversibleICOToken;
  let depositContract: LUKSOGenesisDepositContract;
  let depositAddress: string;
  describe("when depositor has LYXe and ETH to pay for tx", () => {
    beforeEach(async () => {
      // LYXe contract
      LYXeContract = await ethers.getContractAt(
        "ReversibleICOToken",
        LYXeContractAddress
      );
      const DepositFactory = await ethers.getContractFactory(
        "LUKSOGenesisDepositContract"
      );
      depositContract = await DepositFactory.deploy(LYXeContractAddress);
      await depositContract.deployed();
      depositAddress = depositContract.address;
    });

    it("should deploy, mint and deposit for 1 depositor", async function () {
      // address with LYXe
      const LYXeHolder = "0xde8531C4FDf2cE3014527bAF57F8f788E240746e";

      const LYXeHolderSigner = await ethers.getImpersonatedSigner(LYXeHolder);

      const { depositDataHex } = generateDepositData();

      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      // deposit LYXe to Deposit contract
      await LYXeContract.connect(LYXeHolderSigner).send(
        depositAddress,
        ethers.utils.parseEther("32"),
        depositDataHex
      );

      // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const depositBalanceAfterInLYXe =
        parseInt(depositBalanceAfter) / 10 ** 18;

      expect(depositBalanceAfterInLYXe).to.equal(32);

      expect(await depositContract.getDepositDataByIndex(0)).to.equal(
        depositDataHex
      );
    });

    it("should deploy, mint and deposit for multiple depositors", async function () {
      // LYXeHolders with ETH to pay for transaction fees
      const LYXeHolders = [
        "0xde8531C4FDf2cE3014527bAF57F8f788E240746e",
        "0x09363887A4096b142f3F6b58A7eeD2F1A0FF7343",
        "0x3022eb3691fdf020f6eaf85ef28569f7b6a518ea",
        "0xd08D3fc1fd5F82E86f71733a5B6f4731938e76F3",
        "0x5a94809ed5e3d4f5c632141100b76ce04f94380f",
        "0xf35a6bd6e0459a4b53a27862c51a2a7292b383d1",
      ];

      const { depositDataHex } = generateDepositData();

      // get balance of depositAddress before deposit
      const depositBalanceBefore = await LYXeContract.balanceOf(depositAddress);

      expect(depositBalanceBefore).to.equal(0);

      for (let i = 0; i < LYXeHolders.length; i++) {
        const LYXeHolder = LYXeHolders[i];
        const signer = await ethers.getImpersonatedSigner(LYXeHolder);
        await LYXeContract.connect(signer).send(
          depositAddress,
          ethers.utils.parseEther("32"),
          depositDataHex
        );
      }

      // get balance of Deposit contract after deposit
      const depositBalanceAfter = await LYXeContract.balanceOf(depositAddress);

      const depositBalanceAfterInLYXe =
        parseInt(depositBalanceAfter) / 10 ** 18;

      expect(depositBalanceAfterInLYXe).to.equal(LYXeHolders.length * 32);

      for (let i = 0; i < LYXeHolders.length; i++) {
        expect(await depositContract.getDepositDataByIndex(i)).to.equal(
          depositDataHex
        );
      }

      expect(await depositContract.getDepositDataByIndex(10)).to.equal("0x");
    });
  });
  describe("when depositor has no LYXe", () => {
    beforeEach(async () => {
      // LYXe contract
      LYXeContract = await ethers.getContractAt(
        "ReversibleICOToken",
        LYXeContractAddress
      );
      const DepositFactory = await ethers.getContractFactory(
        "LUKSOGenesisDepositContract"
      );
      depositContract = await DepositFactory.deploy(LYXeContractAddress);
      await depositContract.deployed();
      depositAddress = depositContract.address;
      depositAddress = depositContract.address;
    });

    it("should revert when depositor has no LYXe", async function () {
      const LYXelessAddress = "0x0037825fD75af7EEaCe28889665e3FAC8fdb6300";
      const LYXelessSigner = await ethers.getImpersonatedSigner(
        LYXelessAddress
      );

      // get eth balance of depositor before deposit
      const balance = await LYXelessSigner.getBalance();

      // convert eth balance to ethers
      const balanceInETH = parseInt(balance) / 10 ** 18;

      // expect balance to be greater than 1 eth to pay for tx
      expect(balanceInETH).to.be.greaterThan(1);

      const { depositDataHex } = generateDepositData();

      await expect(
        LYXeContract.connect(LYXelessSigner).send(
          depositAddress,
          ethers.utils.parseEther("32"),
          depositDataHex
        )
      ).to.be.revertedWith("Sending failed: Insufficient funds");

      expect(await depositContract.getDepositDataByIndex(0)).to.equal("0x");

      expect(await depositContract.getDepositDataByIndex(1)).to.equal("0x");
    });
  });
});
