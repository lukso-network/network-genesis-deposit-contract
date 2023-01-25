import { ethers } from "hardhat";
import { expect } from "chai";

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  LUKSOGenesisValidatorsDepositContract__factory,
  LUKSOGenesisValidatorsDepositContract,
  ReversibleICOToken,
  ERC165__factory,
  IDepositContract__factory,
  IDepositContractETH2__factory,
} from "../types";

// helpers
import {
  generateDepositData,
  getMerkleTreeRoot,
  getInterfaceID,
  toLittleEndian64,
} from "./helpers";
import {
  LYXeHolders,
  LYXE_ADDRESS,
  ETH_HOLDER_WITHOUT_LYXE,
  DEPOSIT_AMOUNT,
} from "./constants";

export type LUKSOGenesisValidatorsDepositContractContext = {
  accounts: SignerWithAddress[];
  LYXeContract: ReversibleICOToken;
  depositContractOwner: SignerWithAddress;
  depositContract: LUKSOGenesisValidatorsDepositContract;
};

const buildContext = async () => {
  const accounts = [];
  for (const holder of LYXeHolders) {
    const signer = await ethers.getImpersonatedSigner(holder);
    accounts.push(signer);
  }

  const LYXeContract = await ethers.getContractAt(
    "ReversibleICOToken",
    LYXE_ADDRESS
  );

  const depositContractOwnerAddress = ETH_HOLDER_WITHOUT_LYXE;

  const depositContractOwner = await ethers.getImpersonatedSigner(
    depositContractOwnerAddress
  );
  const depositContract =
    await new LUKSOGenesisValidatorsDepositContract__factory(
      depositContractOwner
    ).deploy();

  return {
    accounts,
    LYXeContract,
    depositContractOwner,
    depositContract,
  };
};

describe("Testing LUKSOGenesisValidatorsDepositContract", () => {
  let context: LUKSOGenesisValidatorsDepositContractContext;
  const validators: SignerWithAddress[] = [];
  const validatorsData: string[] = [];
  const one_gwei = "1000000000";
  const amount_to_little_endian_64 = toLittleEndian64(
    ethers.utils.parseEther("32").div(one_gwei).toHexString()
  );
  beforeEach(async () => {
    context = await buildContext();

    for (let i = 0; i < 4; i++) {
      const { depositDataHex } = generateDepositData();
      validatorsData.push(depositDataHex);

      validators.push(context.accounts[i + 2]);
    }
  });

  describe("when using `tokensReceived(..)`", () => {
    it("should revert when passing random data", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));

      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          data
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: reconstructed DepositData does not match supplied deposit_data_root"
      );
    });

    it("should revert when data's length is bigger than 208", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(209));

      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          data
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Data not encoded properly"
      );
    });

    it("should revert when data's length is smaller than 208", async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(207));

      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          data
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Data not encoded properly"
      );
    });

    it("should revert when sending more than 32 LYXe", async () => {
      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          ethers.utils.parseEther("33"),
          validatorsData[0]
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Cannot send an amount different from 32 LYXe"
      );
    });

    it("should revert when sending less than 32 LYXe", async () => {
      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          ethers.utils.parseEther("31"),
          validatorsData[0]
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Cannot send an amount different from 32 LYXe"
      );
    });

    it("should revert when `tokensReceived(..)` is called by any other address but the LYXe address", async () => {
      await expect(
        context.depositContract
          .connect(validators[0])
          .tokensReceived(
            validators[0].address,
            validators[0].address,
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            validatorsData[0],
            "0x"
          )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Not called on LYXe transfer"
      );
    });

    it("should pass if the setup is correct: called by LYXe contract, during a 32 LYXe transfer with properly encoded data", async () => {
      const depositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(depositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );
    });

    it("should pass if called two times with the same correct setup", async () => {
      const firstDepositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(firstDepositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );

      const secondDepositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(secondDepositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(1))
        );
    });
  });

  describe("when using `get_deposit_root(..)`", () => {
    it("Should properly update the Merkle Tree Branch on first deposit", async () => {
      const depositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(depositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );

      const dataDeposited = [validatorsData[0]];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });

    it("Should properly update the Merkle Tree Branch on second deposit", async () => {
      for (let i = 0; i < 2; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      const dataDeposited = [validatorsData[0], validatorsData[1]];

      expect(await context.depositContract.get_deposit_root()).to.equal(
        getMerkleTreeRoot(dataDeposited)
      );
    });

    it("Should properly update the Merkle Tree Branch on third deposit", async () => {
      for (let i = 0; i < 3; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
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
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
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

  describe("when using `get_deposit_count(..)`", () => {
    it("Should properly update the counter on first deposit", async () => {
      const depositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(depositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );

      expect(await context.depositContract.get_deposit_count()).to.equal(
        toLittleEndian64(ethers.utils.hexlify(1))
      );

      expect(await context.depositContract.deposit_count()).to.equal(1);
    });

    it("Should properly update the counter on the first two deposits", async () => {
      for (let i = 0; i < 2; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );

        expect(await context.depositContract.get_deposit_count()).to.equal(
          toLittleEndian64(ethers.utils.hexlify(i + 1))
        );

        expect(await context.depositContract.deposit_count()).to.equal(i + 1);
      }
    });

    it("Should properly update the counter on the first three deposits", async () => {
      for (let i = 0; i < 3; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );

        expect(await context.depositContract.get_deposit_count()).to.equal(
          toLittleEndian64(ethers.utils.hexlify(i + 1))
        );

        expect(await context.depositContract.deposit_count()).to.equal(i + 1);
      }
    });

    it("Should properly update the counter on the first four deposits", async () => {
      for (let i = 0; i < 4; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );

        expect(await context.depositContract.get_deposit_count()).to.equal(
          toLittleEndian64(ethers.utils.hexlify(i + 1))
        );

        expect(await context.depositContract.deposit_count()).to.equal(i + 1);
      }
    });
  });

  describe("when using `getDepositData(..)`", () => {
    it("Should properly update the stored data on first deposit", async () => {
      const depositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(depositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );

      const expectedDepositedData = [validatorsData[0]];

      expect(await context.depositContract.get_deposit_data()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the stored data on second deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 2; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        expectedDepositedData.push(validatorsData[i]);

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(await context.depositContract.get_deposit_data()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the stored data on third deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 3; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        expectedDepositedData.push(validatorsData[i]);

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(await context.depositContract.get_deposit_data()).to.deep.equal(
        expectedDepositedData
      );
    });

    it("Should properly update the stored data on fourth deposit", async () => {
      const expectedDepositedData: string[] = [];
      for (let i = 0; i < 4; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        expectedDepositedData.push(validatorsData[i]);

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(await context.depositContract.get_deposit_data()).to.deep.equal(
        expectedDepositedData
      );
    });
  });

  describe("when using `getDepositDataByIndex(..)`", () => {
    it("Should properly update the stored data on first deposit", async () => {
      const depositTx = context.LYXeContract.connect(validators[0]).send(
        context.depositContract.address,
        DEPOSIT_AMOUNT,
        validatorsData[0]
      );

      await expect(depositTx)
        .to.emit(context.depositContract, "DepositEvent")
        .withArgs(
          "0x" + validatorsData[0].substring(2, 98),
          "0x" + validatorsData[0].substring(98, 162),
          amount_to_little_endian_64,
          "0x" + validatorsData[0].substring(162, 354),
          toLittleEndian64(ethers.utils.hexlify(0))
        );

      expect(
        await context.depositContract.get_deposit_data_by_index(0)
      ).to.deep.equal(validatorsData[0]);
    });

    it("Should properly update the stored data on second deposit", async () => {
      for (let i = 0; i < 2; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(
        await context.depositContract.get_deposit_data_by_index(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.get_deposit_data_by_index(1)
      ).to.deep.equal(validatorsData[1]);
    });

    it("Should properly update the stored data on third deposit", async () => {
      for (let i = 0; i < 3; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(
        await context.depositContract.get_deposit_data_by_index(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.get_deposit_data_by_index(1)
      ).to.deep.equal(validatorsData[1]);
      expect(
        await context.depositContract.get_deposit_data_by_index(2)
      ).to.deep.equal(validatorsData[2]);
    });

    it("Should properly update the stored data on fourth deposit", async () => {
      for (let i = 0; i < 4; i++) {
        const depositTx = context.LYXeContract.connect(validators[i]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[i]
        );

        await expect(depositTx)
          .to.emit(context.depositContract, "DepositEvent")
          .withArgs(
            "0x" + validatorsData[i].substring(2, 98),
            "0x" + validatorsData[i].substring(98, 162),
            amount_to_little_endian_64,
            "0x" + validatorsData[i].substring(162, 354),
            toLittleEndian64(ethers.utils.hexlify(i))
          );
      }

      expect(
        await context.depositContract.get_deposit_data_by_index(0)
      ).to.deep.equal(validatorsData[0]);
      expect(
        await context.depositContract.get_deposit_data_by_index(1)
      ).to.deep.equal(validatorsData[1]);
      expect(
        await context.depositContract.get_deposit_data_by_index(2)
      ).to.deep.equal(validatorsData[2]);
      expect(
        await context.depositContract.get_deposit_data_by_index(3)
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
          context.LYXeContract.connect(validators[i]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            validatorsData[i]
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: Contract is frozen"
        );
      }
    });
  });
  describe("supportsInterface", () => {
    it("should support ERC165", async () => {
      const IERC165 = ERC165__factory.createInterface();

      const ERC165_INTERFACE_ID = getInterfaceID(IERC165);

      expect(
        await context.depositContract.supportsInterface(ERC165_INTERFACE_ID)
      ).to.be.true;
    });
    it("should support IDepositContract", async () => {
      const IDepositContract = IDepositContract__factory.createInterface();

      const DEPOSIT_CONTRACT_INTERFACE_ID = getInterfaceID(IDepositContract);

      expect(
        await context.depositContract.supportsInterface(
          DEPOSIT_CONTRACT_INTERFACE_ID
        )
      ).to.be.true;
    });
    it("should not support ETH2 IDepositContract interface", async () => {
      const IDepositETH2 = IDepositContractETH2__factory.createInterface();

      const DEPOSIT_ETH2_INTERFACE_ID = getInterfaceID(IDepositETH2);

      expect(
        await context.depositContract.supportsInterface(
          DEPOSIT_ETH2_INTERFACE_ID
        )
      ).to.be.false;
    });
    it("should not support other interfaces", async () => {
      const RANDOM_INTERFACE_ID = "0x12345678";

      expect(
        await context.depositContract.supportsInterface(RANDOM_INTERFACE_ID)
      ).to.be.false;
    });
  });
});
