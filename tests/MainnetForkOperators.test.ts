import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  ReversibleICOToken, // the LYXe contract
  LUKSOGenesisValidatorsDepositContract, // the deposit contract
  IERC1820Registry__factory, // the ERC1820 registry
} from "../types";

// constants for testing
import {
  DEPOSIT_AMOUNT,
  ETH_HOLDER_WITHOUT_LYXE,
  LYXE_ADDRESS,
  LYXeHolders,
  OPERATOR,
  TOKENS_RECIPIENT_INTERFACE_HASH,
} from "./constants";

import {
  getDepositDataByIndex,
  generateHexBetweenOneAndOneHundred,
} from "./helpers";

describe("experiment through mainnet fork", () => {
  let LYXeContract: ReversibleICOToken;
  let depositContract: LUKSOGenesisValidatorsDepositContract;

  let depositContractOwnerAndDeployer: SignerWithAddress;

  before(async () => {
    depositContractOwnerAndDeployer = await ethers.getImpersonatedSigner(
      ETH_HOLDER_WITHOUT_LYXE
    );

    // instantiate LYXe contract
    LYXeContract = await ethers.getContractAt(
      "ReversibleICOToken",
      LYXE_ADDRESS
    );

    // instantiate deposit contract
    const depositContractFactory = await ethers.getContractFactory(
      "LUKSOGenesisValidatorsDepositContract"
    );
    depositContract = await depositContractFactory
      .connect(depositContractOwnerAndDeployer)
      .deploy();
  });

  describe("test setup after deploying", () => {
    it("contract is not frozen after having been deployed", async () => {
      expect(await depositContract.isContractFrozen()).to.equal(false);
    });

    describe("when calling the IERC1820 registry at {address}", () => {
      it("should have set the DepositContract as implementer of the token recipient interface", async () => {
        const erc1820Registry = await ethers.getContractAt(
          IERC1820Registry__factory.abi,
          "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24"
        );

        const result = await erc1820Registry.getInterfaceImplementer(
          depositContract.address,
          TOKENS_RECIPIENT_INTERFACE_HASH
        );

        expect(result).to.equal(depositContract.address);
      });
    });
  });

  describe("depositing on behalf of someone else (as an operator)", () => {
    describe("test via `authorizeOperator(...)` + `operatorSend(...)`", () => {
      it("should pass", async () => {
        const LYXeHolder = await ethers.getImpersonatedSigner(LYXeHolders[0]);

        const { depositDataHex } = getDepositDataByIndex(1);
        const supplyVoteBytes = generateHexBetweenOneAndOneHundred();

        // append supplyVoteBytes to depositData
        const depositDataWithVote = depositDataHex + supplyVoteBytes;

        // get balance of depositContract before deposit
        const depositBalanceBefore = await LYXeContract.balanceOf(
          depositContract.address
        );
        expect(depositBalanceBefore).to.equal(0);

        // get balance of LYXeHolder before deposit
        const LYXeHolderBalanceBefore = await LYXeContract.balanceOf(
          LYXeHolder.address
        );

        // check that the operator is not authorized first
        expect(
          await LYXeContract.isOperatorFor(OPERATOR, LYXeHolder.address)
        ).to.equal(false);

        // approve an operator to deposit 32 LYXe on behalf of a LYXeHolder
        await expect(
          LYXeContract.connect(LYXeHolder).authorizeOperator(OPERATOR)
        )
          .to.emit(LYXeContract, "AuthorizedOperator")
          .withArgs(OPERATOR, LYXeHolder.address);

        expect(
          await LYXeContract.isOperatorFor(OPERATOR, LYXeHolder.address)
        ).to.equal(true);

        // deposit 32 LYXe on behalf of a LYXeHolder
        const operatorAsSigner = await ethers.getImpersonatedSigner(OPERATOR);

        // for testing purpose
        const operatorData = ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes(
            "I have deposited 32 LYXe on behalf of a LYXeHolder. LUKSO TO THE MOON!!!!"
          )
        );

        const tx = await LYXeContract.connect(operatorAsSigner).operatorSend(
          LYXeHolder.address,
          depositContract.address,
          DEPOSIT_AMOUNT,
          depositDataWithVote,
          operatorData
        );

        // check that the depositContract emitted a `DepositEvent` event
        await expect(tx).to.emit(depositContract, "DepositEvent");

        // Check that the LYXe Token Contract emitted a `Sent` event
        await expect(tx)
          .to.emit(LYXeContract, "Sent")
          .withArgs(
            OPERATOR,
            LYXeHolder.address,
            depositContract.address,
            DEPOSIT_AMOUNT,
            depositDataWithVote,
            operatorData
          );

        // get balance of depositContract before deposit
        const depositBalanceAfter = await LYXeContract.balanceOf(
          depositContract.address
        );
        expect(depositBalanceAfter).to.equal(DEPOSIT_AMOUNT);

        // get balance of LYXeHolder after deposit
        const LYXeHolderBalanceAfter = await LYXeContract.balanceOf(
          LYXeHolder.address
        );
        expect(LYXeHolderBalanceAfter).to.equal(
          LYXeHolderBalanceBefore.sub(DEPOSIT_AMOUNT)
        );
      });
    });

    describe("try to deposit via `approve(...)` + `transferFrom(...)`", () => {
      it("should revert with `'LUKSOGenesisValidatorsDepositContract: depositData not encoded properly'` because no `data` is passed with `transferFrom(...)` to register deposit", async () => {
        const LYXeHolder = await ethers.getImpersonatedSigner(LYXeHolders[0]);

        const { depositDataHex } = getDepositDataByIndex(1);
        const supplyVoteBytes = generateHexBetweenOneAndOneHundred();

        // append supplyVoteBytes to depositData
        const depositDataWithVote = depositDataHex + supplyVoteBytes;

        // approve an operator to deposit 32 LYXe on behalf of a LYXeHolder
        await expect(
          LYXeContract.connect(LYXeHolder).approve(OPERATOR, DEPOSIT_AMOUNT)
        )
          .to.emit(LYXeContract, "Approval")
          .withArgs(LYXeHolder.address, OPERATOR, DEPOSIT_AMOUNT);

        // deposit 32 LYXe on behalf of a LYXeHolder
        const operatorAsSigner = await ethers.getImpersonatedSigner(OPERATOR);

        // MUST revert with `transferFrom`
        await expect(
          LYXeContract.connect(operatorAsSigner).transferFrom(
            LYXeHolder.address,
            depositContract.address,
            DEPOSIT_AMOUNT
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
        );
      });
    });
  });

  describe("try to deposit via `transfer(...)`", () => {
    it("should revert with `'LUKSOGenesisValidatorsDepositContract: depositData not encoded properly'` because no `data` is passed with `transfer(...)` to register deposit", async () => {
      const LYXeHolder = await ethers.getImpersonatedSigner(LYXeHolders[0]);

      const { depositDataHex } = getDepositDataByIndex(1);
      const supplyVoteBytes = generateHexBetweenOneAndOneHundred();

      // append supplyVoteBytes to depositData
      const depositDataWithVote = depositDataHex + supplyVoteBytes;

      // MUST revert with `transfer`
      await expect(
        LYXeContract.connect(LYXeHolder).transfer(
          depositContract.address,
          DEPOSIT_AMOUNT
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
      );

      // even with appended calldata, it should still revert
      let txWithExtraCalldata = await LYXeContract.connect(
        LYXeHolder
      ).populateTransaction.transfer(depositContract.address, DEPOSIT_AMOUNT);

      txWithExtraCalldata.data =
        txWithExtraCalldata.data + depositDataWithVote.substring(2);

      await expect(
        LYXeHolder.sendTransaction(txWithExtraCalldata)
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
      );
    });
  });
});
