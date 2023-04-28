import { ethers } from "hardhat";
import { expect } from "chai";

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestnetDepositContract } from "../../typechain-types";

// helpers
import { getDepositDataByIndex } from "./helpers";
import { ETH_HOLDER_WITHOUT_LYXE } from "./constants";


export type TestnetDepositContractContext = {
  depositor: SignerWithAddress;
  depositContractOwner: SignerWithAddress;
  depositContract: TestnetDepositContract;
};

const buildContext = async () => {
  const [depositContractOwner] = await ethers.getSigners();

  const depositor = await ethers.getImpersonatedSigner(ETH_HOLDER_WITHOUT_LYXE);

  const depositContract = await (
    await ethers.getContractFactory("TestnetDepositContract", depositor)
  ).deploy(depositor.address);

  return {
    depositor,
    depositContractOwner,
    depositContract,
  };
};

describe("Testing LUKSOTestnetDepositContract", () => {
  let context: TestnetDepositContractContext;
  const validators: SignerWithAddress[] = [];

  beforeEach(async () => {
    context = await buildContext();

    validators.push(context.depositor);
  });
  it("should not let you deposit if you are not whitelisted", async () => {

    const {deposit_data_root, signature, withdrawal_credentials, pubkey} = getDepositDataByIndex(
      1
    );
    await expect(
      context.depositContract
        .connect(context.depositor)
        .deposit(`0x${pubkey}`, `0x${withdrawal_credentials}`, `0x${signature}`, `0x${deposit_data_root}`)
    ).to.be.revertedWith("TestnetDepositContract: address not allowed to deposit");
  });
  it("should let you deposit if you are whitelisted", async () => {

    const validatorAddress = await validators[0].getAddress();
    await context.depositContract.whitelistAddress(validatorAddress, 1);


    const { deposit_data_root, signature, withdrawal_credentials, pubkey } = getDepositDataByIndex(1);

    const depositAmount = ethers.utils.parseEther("32");

    await expect(
      context.depositContract
        .connect(context.depositor)
        .deposit(`0x${pubkey}`, `0x${withdrawal_credentials}`, `0x${signature}`, `0x${deposit_data_root}`, {
          value: depositAmount,
        })
    ).to.not.be.reverted;
  });
  it("should not let you deposit if you are whitelisted and have deposited more than allowed", async () => {

    const validatorAddress = await validators[0].getAddress();
    await context.depositContract.whitelistAddress(validatorAddress, 1);


    const { deposit_data_root, signature, withdrawal_credentials, pubkey } = getDepositDataByIndex(1);

    const depositAmount = ethers.utils.parseEther("32");

    await expect(
      context.depositContract
        .connect(context.depositor)
        .deposit(`0x${pubkey}`, `0x${withdrawal_credentials}`, `0x${signature}`, `0x${deposit_data_root}`, {
          value: depositAmount,
        })
    ).to.not.be.reverted;

    await expect(
      context.depositContract
        .connect(context.depositor)
        .deposit(`0x${pubkey}`, `0x${withdrawal_credentials}`, `0x${signature}`, `0x${deposit_data_root}`, {
          value: depositAmount,
        })
    ).to.be.revertedWith("TestnetDepositContract: address not allowed to deposit");
  });
  describe("when owner", () => {
    it("should be able to transfer ownership", async () => {
      const newOwner = ETH_HOLDER_WITHOUT_LYXE;
      await context.depositContract.transferOwnership(newOwner);

      const newOwnerSigner = await ethers.getImpersonatedSigner(newOwner);

      await context.depositContract.connect(newOwnerSigner).acceptOwnership();

      expect(await context.depositContract.owner()).to.deep.equal(newOwner);
    });
  });
  describe("when not owner", () => {
    it("should not be able to accept ownership", async () => {
      const newOwner = ETH_HOLDER_WITHOUT_LYXE;

      await context.depositContract
        .connect(context.depositor)
        .transferOwnership(newOwner);

      const newOwnerSigner = await ethers.getImpersonatedSigner(newOwner);

      expect(
        await context.depositContract.connect(newOwnerSigner).acceptOwnership()
      );
    });
  });
});
