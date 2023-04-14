import { ethers, network } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import depositDataJSON from "./deposit_data-test.json";
import { JsonRpcProvider } from "@ethersproject/providers";

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  LUKSOGenesisValidatorsDepositContract__factory,
  LUKSOGenesisValidatorsDepositContract,
  ReversibleICOToken,
  IERC165__factory,
} from "../types";

// helpers
import {
  getInterfaceID,
  toLittleEndian64,
  generateHexBetweenOneAndOneHundred,
  getDepositDataByIndex,
} from "./helpers";
import {
  LYXeHolders,
  LYXE_ADDRESS,
  DEPOSIT_AMOUNT,
  DEPOSIT_START_TIMESTAMP,
  DEPOSIT_CONTRACT_OWNER,
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

  const depositContractOwnerAddress = DEPOSIT_CONTRACT_OWNER;

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

describe("Testing LUKSOGenesisValidatorsDepositContract", async () => {
  let context: LUKSOGenesisValidatorsDepositContractContext;
  const validators: SignerWithAddress[] = [];
  const validatorsData: string[] = [];
  const one_gwei = "1000000000";
  const amount_to_little_endian_64 = toLittleEndian64(
    ethers.utils.parseEther("32").div(one_gwei).toHexString()
  );
  const snapshotId = await network.provider.send("evm_snapshot");

  await network.provider.send("evm_setNextBlockTimestamp", [
    DEPOSIT_START_TIMESTAMP,
  ]);

  describe("when timestamp is after deposit start timestamp", async () => {
    beforeEach(async () => {
      context = await buildContext();

      for (let i = 0; i < 4; i++) {
        const { depositDataHex } = getDepositDataByIndex(i);
        const supplyVoteByte = generateHexBetweenOneAndOneHundred();
        const dataWithSupplyVoteByte = depositDataHex + supplyVoteByte;
        validatorsData.push(dataWithSupplyVoteByte);

        validators.push(context.accounts[i + 2]);
      }
    });

    describe("when using `tokensReceived(..)`", () => {
      it("should revert with wrong deposit_data_root when passing random data", async () => {
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));
        const supplyVoteByte = generateHexBetweenOneAndOneHundred();
        const dataWithSupplyVoteByte = data + supplyVoteByte;

        await expect(
          context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            dataWithSupplyVoteByte
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: reconstructed DepositData does not match supplied deposit_data_root"
        );
      });

      it("should revert when data's length is bigger than 209", async () => {
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));
        const supplyVoteByte = generateHexBetweenOneAndOneHundred();
        const dataWithSupplyVoteByte = data + supplyVoteByte + "00";

        await expect(
          context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            dataWithSupplyVoteByte
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
        );
      });

      it("should revert when data's length is smaller than 209", async () => {
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));

        await expect(
          context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            data
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
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
            0
          );
      });

      it("should revert if called two times with the same correct setup", async () => {
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
            0
          );

        const secondDepositTx = context.LYXeContract.connect(
          validators[0]
        ).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorsData[0]
        );

        await expect(secondDepositTx).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: Deposit already processed"
        );
      });
    });

    it("Should match the original JSON after reconstructing", async () => {
      for (let i = 0; i < depositDataJSON.length; i++) {
        const validatorData = getDepositDataByIndex(i);

        const depositTx = context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          validatorData.depositDataWithSupplyVoteHex
        );

        await depositTx;
      }

      const depositedData = await context.depositContract.getDepositData();
      const reconstructedJson = [];

      for (let i = 0; i < depositedData.length; i++) {
        const depositDataWithoutSupplyVote =
          "0x" + depositedData[i].substring(2, depositedData[i].length - 2);
        const originalValidator = depositDataJSON[i];

        const reconstructedValidator = {
          pubkey: depositDataWithoutSupplyVote.substring(2, 98),
          withdrawal_credentials: depositDataWithoutSupplyVote.substring(
            98,
            162
          ),
          amount: originalValidator.amount,
          signature: depositDataWithoutSupplyVote.substring(162, 354),
          deposit_message_root: originalValidator.deposit_message_root,
          deposit_data_root: originalValidator.deposit_data_root,
          fork_version: originalValidator.fork_version,
          network_name: originalValidator.network_name,
          deposit_cli_version: originalValidator.deposit_cli_version,
        };

        reconstructedJson.push(reconstructedValidator);
      }

      expect(reconstructedJson).to.deep.equal(depositDataJSON);
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
            0
          );

        expect(await context.depositContract.depositCount()).to.equal(1);

        expect(await context.depositContract.depositCount()).to.equal(1);
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
              i
            );

          expect(await context.depositContract.depositCount()).to.equal(i + 1);

          expect(await context.depositContract.depositCount()).to.equal(i + 1);
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
              i
            );

          expect(await context.depositContract.depositCount()).to.equal(i + 1);

          expect(await context.depositContract.depositCount()).to.equal(i + 1);
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
              i
            );

          expect(await context.depositContract.depositCount()).to.equal(i + 1);

          expect(await context.depositContract.depositCount()).to.equal(i + 1);
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
            0
          );

        const expectedDepositedData = [validatorsData[0]];

        expect(await context.depositContract.getDepositData()).to.deep.equal(
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
              i
            );
        }

        expect(await context.depositContract.getDepositData()).to.deep.equal(
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
              i
            );
        }

        expect(await context.depositContract.getDepositData()).to.deep.equal(
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
              i
            );
        }

        expect(await context.depositContract.getDepositData()).to.deep.equal(
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
            0
          );

        expect(
          await context.depositContract.getDepositDataByIndex(0)
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
              i
            );
        }

        expect(
          await context.depositContract.getDepositDataByIndex(0)
        ).to.deep.equal(validatorsData[0]);
        expect(
          await context.depositContract.getDepositDataByIndex(1)
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
              i
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
              i
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
        const currentBlock = await ethers.provider.getBlockNumber();
        const freezeBlockNumber = currentBlock + 46523;

        await expect(
          await context.depositContract
            .connect(context.depositContractOwner)
            .freezeContract()
        )
          .to.emit(context.depositContract, "FreezeInitiated")
          .withArgs(currentBlock + 1, freezeBlockNumber + 1); // +1 because of the block that will be mined after the tx
      });

      describe("when block.number < freezeBlockNumber", () => {
        it("should still allow depositing", async () => {
          const currentBlock = await ethers.provider.getBlockNumber();
          const freezeBlockNumber =
            await context.depositContract.freezeBlockNumber();
          const numBlocksToMine =
            freezeBlockNumber.toNumber() - currentBlock - 20;

          await mine(numBlocksToMine);

          await expect(
            context.LYXeContract.connect(validators[1]).send(
              context.depositContract.address,
              DEPOSIT_AMOUNT,
              validatorsData[1]
            )
          )
            .to.emit(context.depositContract, "DepositEvent")
            .withArgs(
              "0x" + validatorsData[1].substring(2, 98),
              "0x" + validatorsData[1].substring(98, 162),
              amount_to_little_endian_64,
              "0x" + validatorsData[1].substring(162, 354),
              0
            );
        });
        describe("when block.number > freezeBlockNumber", () => {
          it("should disallow depositing if contract is frozen", async () => {
            const numBlocksToMine = 46523;

            await mine(numBlocksToMine);

            network;

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
        describe("should not be able to call `freezeContract(..)` again", () => {
          it("should revert", async () => {
            await expect(
              context.depositContract
                .connect(context.depositContractOwner)
                .freezeContract()
            ).to.be.revertedWith(
              "LUKSOGenesisValidatorsDepositContract: Contract is already frozen"
            );
          });
        });
      });
    });
    describe("supportsInterface", () => {
      it("should support ERC165", async () => {
        const IERC165 = IERC165__factory.createInterface();

        const ERC165_INTERFACE_ID = getInterfaceID(IERC165);

        expect(
          await context.depositContract.supportsInterface(ERC165_INTERFACE_ID)
        ).to.be.true;
      });
      it("should not support other interfaces", async () => {
        const RANDOM_INTERFACE_ID = "0x12345678";

        expect(
          await context.depositContract.supportsInterface(RANDOM_INTERFACE_ID)
        ).to.be.false;
      });
    });
    describe("supplyVote", () => {
      it("should not let you deposit with vote with value 100", async () => {
        const { depositDataHex } = getDepositDataByIndex(0);
        const supplyVoteByte = "ff";
        const depositDataWithVote = depositDataHex + supplyVoteByte;

        await expect(
          context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            depositDataWithVote
          )
        ).to.be.revertedWith(
          "LUKSOGenesisValidatorsDepositContract: Invalid initialSupplyVote vote"
        );
      });
      it("should return all supply vote for 100 deposits", async () => {
        const numberOfDeposits = 250;
        let supplyVotes = Array(101).fill(BigNumber.from(0));

        for (let i = 0; i < numberOfDeposits; i++) {
          const { depositDataHex } = getDepositDataByIndex(i);
          const supplyVoteByte = generateHexBetweenOneAndOneHundred();

          supplyVotes[parseInt(supplyVoteByte, 16)] =
            supplyVotes[parseInt(supplyVoteByte, 16)].add(1);
          const depositDataWithVote = depositDataHex + supplyVoteByte;

          await context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            depositDataWithVote
          );
        }

        const fetchedSupplyVotes =
          await context.depositContract.getsVotesPerSupply();

        expect(fetchedSupplyVotes[0]).to.deep.equal(supplyVotes);
        expect(fetchedSupplyVotes[1]).to.equal(numberOfDeposits);
      });
      it("should be able to return the number of people not wishing to vote", async () => {
        const numberOfDeposits = 250;
        let supplyVotes = Array(101).fill(BigNumber.from(0));

        let numberOf0Votes = 0;

        for (let i = 0; i < numberOfDeposits; i++) {
          const { depositDataHex } = getDepositDataByIndex(i);
          const supplyVoteByte = generateHexBetweenOneAndOneHundred();

          if (supplyVoteByte === "00") {
            numberOf0Votes += 1;
          }

          supplyVotes[parseInt(supplyVoteByte, 16)] =
            supplyVotes[parseInt(supplyVoteByte, 16)].add(1);
          const depositDataWithVote = depositDataHex + supplyVoteByte;

          await context.LYXeContract.connect(validators[0]).send(
            context.depositContract.address,
            DEPOSIT_AMOUNT,
            depositDataWithVote
          );
        }

        const fetchedSupplyVotes =
          await context.depositContract.getsVotesPerSupply();

        expect(fetchedSupplyVotes[0]).to.deep.equal(supplyVotes);
        expect(fetchedSupplyVotes[1]).to.equal(numberOfDeposits);

        expect(fetchedSupplyVotes[0][0]).to.equal(numberOf0Votes);
      });
    });
    describe("isPubkeyRegistered mapping tests", () => {
      it("should return true for a registered public key", async () => {
        const { depositDataHex } = getDepositDataByIndex(0);
        const supplyVoteByte = "00";
        const depositDataWithVote = depositDataHex + supplyVoteByte;

        await context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          depositDataWithVote
        );

        // Check if the pubkey is registered
        const pubkey = depositDataWithVote.substring(0, 98);

        const result =
          await context.depositContract.callStatic.isPubkeyRegistered(pubkey);
        expect(result).to.equal(true);
      });
      it("should return false for a non-registered public key", async () => {
        const { depositDataHex } = getDepositDataByIndex(0);
        const supplyVoteByte = "00";
        const depositDataWithVote = depositDataHex + supplyVoteByte;

        // Check if the pubkey is registered
        const pubkey = depositDataWithVote.substring(0, 98);

        const result =
          await context.depositContract.callStatic.isPubkeyRegistered(pubkey);
        expect(result).to.equal(false);
      });
    });
  });

  describe("when deposit timestamp is before deposit start timestamp", async () => {
    // reverting evm state because of timestamp change
    await network.provider.send("evm_revert", [snapshotId]);

    it("should revert", async () => {
      context = await buildContext();

      for (let i = 0; i < 4; i++) {
        const { depositDataHex } = getDepositDataByIndex(i);
        const supplyVoteByte = generateHexBetweenOneAndOneHundred();
        const dataWithSupplyVoteByte = depositDataHex + supplyVoteByte;
        validatorsData.push(dataWithSupplyVoteByte);

        validators.push(context.accounts[i + 2]);
      }

      const data = ethers.utils.hexlify(ethers.utils.randomBytes(208));
      const supplyVoteByte = generateHexBetweenOneAndOneHundred();
      const dataWithSupplyVoteByte = data + supplyVoteByte;

      const provider = ethers.provider;

      const currentBlock = await provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;
      expect(currentTimestamp).to.be.lessThan(DEPOSIT_START_TIMESTAMP);

      await network.provider.send("evm_setNextBlockTimestamp", [
        DEPOSIT_START_TIMESTAMP - 1,
      ]);

      await expect(
        context.LYXeContract.connect(validators[0]).send(
          context.depositContract.address,
          DEPOSIT_AMOUNT,
          dataWithSupplyVoteByte
        )
      ).to.be.revertedWith(
        "LUKSOGenesisValidatorsDepositContract: Deposits not yet allowed"
      );
    });
  });
});
