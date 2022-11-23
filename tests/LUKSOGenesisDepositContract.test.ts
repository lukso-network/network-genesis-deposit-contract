import { ethers } from "hardhat";
import { expect } from "chai";

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers";
import {
  TestToken__factory,
  TestToken,
  LUKSOGenesisDepositContract__factory,
  LUKSOGenesisDepositContract,
} from "../types";

// helpers
import { generateDepositDataRoot, getMerkleTreeRoot } from "./helpers";

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
  const testToken = await new TestToken__factory(testTokenOwner).deploy(
    "TestToken",
    "TT",
    []
  );
  const depositContractOwner = accounts[1];
  const depositContract = await new LUKSOGenesisDepositContract__factory(
    depositContractOwner
  ).deploy(testToken.address);

  return {
    accounts,
    testTokenOwner,
    testToken,
    depositContractOwner,
    depositContract,
  };
};

describe("Testing LUKSOGenesisDepositContract", () => {
  let context: LUKSOGenesisDepositContractContext;
  const validators: SignerWithAddress[] = [];
  const validatorsData: string[] = [];
  beforeEach(async () => {
    context = await buildContext();

    for (let i = 0; i < 4; i++) {
      const pubkey = ethers.utils.hexlify(ethers.utils.randomBytes(48));
      const withdrawal_credentials = ethers.utils.hexlify(
        ethers.utils.randomBytes(32)
      );
      const signature = ethers.utils.hexlify(ethers.utils.randomBytes(96));
      const deposit_data_root = generateDepositDataRoot(
        pubkey,
        withdrawal_credentials,
        signature
      );

      validatorsData.push(
        ethers.utils.hexlify(
          ethers.utils.concat([
            pubkey,
            withdrawal_credentials,
            signature,
            deposit_data_root,
          ])
        )
      );

      validators.push(context.accounts[i + 2]);

      await context.testToken
        .connect(context.testTokenOwner)
        .mint(validators[i].address, ethers.utils.parseEther("1000"));
    }
  });

  describe("when using `tokensReceived(..)`", () => {
    const pubkey = ethers.utils.hexlify(ethers.utils.randomBytes(48));
    const withdrawal_credentials = ethers.utils.hexlify(
      ethers.utils.randomBytes(32)
    );
    const signature = ethers.utils.hexlify(ethers.utils.randomBytes(96));
    const deposit_data_root = generateDepositDataRoot(
      pubkey,
      withdrawal_credentials,
      signature
    );

    it("should revert when passing random data", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));

      await expect(
        context.testToken
          .connect(validators[0])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            data
          )
      ).to.be.revertedWith(
        "DepositContract: reconstructed DepositData does not match supplied deposit_data_root"
      );
    });

    it("should revent when data's length is bigger than 208", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(209));

      await expect(
        context.testToken
          .connect(validators[0])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            data
          )
      ).to.be.revertedWith(
        "LUKSOGenesisDepositContract: Data not encoded properly"
      );
    });

    it("should revent when data's length is smaller than 208", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(207));

      await expect(
        context.testToken
          .connect(validators[0])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            data
          )
      ).to.be.revertedWith(
        "LUKSOGenesisDepositContract: Data not encoded properly"
      );
    });

    it("should revent when sending more than 32 LYXe", async () => {
      const data = ethers.utils.concat([
        pubkey,
        withdrawal_credentials,
        signature,
        deposit_data_root,
      ]);

      await expect(
        context.testToken
          .connect(validators[0])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("33"),
            data
          )
      ).to.be.revertedWith(
        "LUKSOGenesisDepositContract: Cannot send an amount different from 32 LYXe"
      );
    });

    it("should revent when sending less than 32 LYXe", async () => {
      const data = ethers.utils.concat([
        pubkey,
        withdrawal_credentials,
        signature,
        deposit_data_root,
      ]);

      await expect(
        context.testToken
          .connect(validators[0])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("31"),
            data
          )
      ).to.be.revertedWith(
        "LUKSOGenesisDepositContract: Cannot send an amount different from 32 LYXe"
      );
    });

    it("should revent when `tokensReceived(..)` is called by any other address but the LYXe address", async () => {
      const data = ethers.utils.concat([
        pubkey,
        withdrawal_credentials,
        signature,
        deposit_data_root,
      ]);

      await expect(
        context.depositContract
          .connect(validators[0])
          .tokensReceived(
            validators[0].address,
            validators[0].address,
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            data,
            "0x"
          )
      ).to.be.revertedWith(
        "LUKSOGenesisDepositContract: Not called on LYXe transfer"
      );
    });

    it("should pass if the setup is correct: called by LYXe contract, during a 32 LYXe transfer with properly encoded data", async () => {
      const data = ethers.utils.concat([
        pubkey,
        withdrawal_credentials,
        signature,
        deposit_data_root,
      ]);

      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          data
        );
    });

    it("should pass if called two times with the same correct setup", async () => {
      const data = ethers.utils.concat([
        pubkey,
        withdrawal_credentials,
        signature,
        deposit_data_root,
      ]);

      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          data
        );

      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          data
        );
    });
  });

  describe("when using `get_deposit_root(..)`", () => {
    it("Should properly update the Merkle Tree Branch on first deposit", async () => {
      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          validatorsData[0]
        );

      const dataDeposited = [validatorsData[0]];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });

    it("Should properly update the Merkle Tree Branch on second deposit", async () => {
      for (let i = 0; i < 2; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      const dataDeposited = [validatorsData[0], validatorsData[1]];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });

    it("Should properly update the Merkle Tree Branch on third deposit", async () => {
      for (let i = 0; i < 3; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      const dataDeposited = [
        validatorsData[0],
        validatorsData[1],
        validatorsData[2],
      ];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });

    it("Should properly update the Merkle Tree Branch on fourth deposit", async () => {
      for (let i = 0; i < 4; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      const dataDeposited = [
        validatorsData[0],
        validatorsData[1],
        validatorsData[2],
        validatorsData[3],
      ];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });
  });

  describe("when using `getDepositData(..)`", () => {
    it("Should properly update the Merkle Tree Branch on first deposit", async () => {
      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          validatorsData[0]
        );

      const expectedDepositedData = [validatorsData[0]];

      expect(await context.depositContract.getDepositData()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the Merkle Tree Branch on second deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 2; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );

        expectedDepositedData.push(validatorsData[i]);
      }

      expect(await context.depositContract.getDepositData()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the Merkle Tree Branch on third deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 3; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );

        expectedDepositedData.push(validatorsData[i]);
      }

      expect(await context.depositContract.getDepositData()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the Merkle Tree Branch on fourth deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 4; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );

        expectedDepositedData.push(validatorsData[i]);
      }

      expect(await context.depositContract.getDepositData()).to.deep.equal(
        expectedDepositedData
      );
    });
  });

  describe("when using `getDepositDataByIndex(..)`", () => {
    it("Should properly update the Merkle Tree Branch on first deposit", async () => {
      await context.testToken
        .connect(validators[0])
        .send(
          context.depositContract.address,
          ethers.utils.parseEther("32"),
          validatorsData[0]
        );

      expect(
        await context.depositContract.getDepositDataByIndex(0)
      ).to.deep.equal(validatorsData[0]);
    });

    it("Should properly update the Merkle Tree Branch on second deposit", async () => {
      for (let i = 0; i < 2; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      expect(
        await context.depositContract.getDepositDataByIndex(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.getDepositDataByIndex(1)
      ).to.deep.equal(validatorsData[1]);
    });

    it("Should properly update the Merkle Tree Branch on third deposit", async () => {
      for (let i = 0; i < 3; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      expect(
        await context.depositContract.getDepositDataByIndex(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.getDepositDataByIndex(1)
      ).to.deep.equal(validatorsData[1]);
      expect(
        await context.depositContract.getDepositDataByIndex(2)
      ).to.deep.equal(validatorsData[2]);
    });

    it("Should properly update the Merkle Tree Branch on fourth deposit", async () => {
      for (let i = 0; i < 4; i++) {
        await context.testToken
          .connect(validators[i])
          .send(
            context.depositContract.address,
            ethers.utils.parseEther("32"),
            validatorsData[i]
          );
      }

      expect(
        await context.depositContract.getDepositDataByIndex(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.getDepositDataByIndex(1)
      ).to.deep.equal(validatorsData[1]);
      expect(
        await context.depositContract.getDepositDataByIndex(2)
      ).to.deep.equal(validatorsData[2]);
      expect(
        await context.depositContract.getDepositDataByIndex(3)
      ).to.deep.equal(validatorsData[3]);
    });
  });

  describe("when using `freezeContract(..)`", () => {
    beforeEach(async () => {
      await context.depositContract
        .connect(context.depositContractOwner)
        .freezeContract();
    });

    it("should disallow depositing if contract is frozen", async () => {
      for (let i = 0; i < validators.length; i++) {
        await expect(
          context.testToken
            .connect(validators[i])
            .send(
              context.depositContract.address,
              ethers.utils.parseEther("32"),
              validatorsData[i]
            )
        ).to.be.revertedWith("LUKSOGenesisDepositContract: Contract is frozen");
      }
    });
  });
});
