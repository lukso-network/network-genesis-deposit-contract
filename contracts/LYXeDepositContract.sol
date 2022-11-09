// SPDX-License-Identifier: CC0-1.0

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import {DepositContract} from "./DepositContract.sol";

//import {IERC777Recipient} from "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";

contract LUKSOGenesisDepositContract is DepositContract {
    address constant LYXeAddress = 0xA8b919680258d369114910511cc87595aec0be6D;

    /**
     * @dev Storing all the deposit data which should be sliced
     * in order to get the following parameters:
     * - pubkey - the first 48 bytes
     * - withdrawal_credentials - the following 32 bytes
     * - signature - the following 96 bytes
     * - deposit_data_root - last 32 bytes
     */
    mapping(uint256 => bytes) deposit_data;

    /**
     * @dev Owner of the contract
     * Has access to `freezeContract()`
     */
    address private owner;

    /**
     * @dev Default value is false which allows people to send 32 LYXe
     * to this contract with valid data in order to register as Genesis Validator
     */
    bool private contractFrozen;

    /**
     * @dev Save the deployer as the owner of the contract
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Whenever this contract receives LYXe tokens, it must be for the reason of
     * being a Genesis Validator.
     *
     * Requirements:
     * - `amount` MUST be exactly 32 LYXe
     * - `userData` MUST be encoded properly
     * - `userData` MUST contain:
     *   • pubkey - the first 48 bytes
     *   • withdrawal_credentials - the following 32 bytes
     *   • signature - the following 96 bytes
     *   • deposit_data_root - last 32 bytes
     */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external {
        require(!contractFrozen, "Contract is frozen");
        require(msg.sender == LYXeAddress, "Not called on LYXe transfer");
        require(
            amount == 32 ether,
            "Cannot send an amount different from 32 LYXe"
        );
        require(
            userData.length == (48 + 32 + 96 + 32),
            "Data not encoded properly"
        );

        deposit(
            userData[:48],
            userData[48:80],
            userData[80:176],
            convertBytesToBytes32(userData[176:208])
        );

        deposit_data[deposit_count] = userData;
    }

    /**
     * Maybe plit in packs of 1000 elements ??
     * @dev Get an array of all excoded deposit data
     */
    function getDepositData()
        public
        view
        returns (bytes[] memory returnedArray)
    {
        returnedArray = new bytes[](deposit_count);
        for (uint256 i = 0; i < deposit_count; i++)
            returnedArray[i] = deposit_data[i];
    }

    /**
     * @dev Get the encoded deposit data at the `index`
     */
    function getDepositDataByIndex(uint256 index)
        public
        view
        returns (bytes memory)
    {
        return deposit_data[index];
    }

    /**
     * @dev Freze the LUKSO Genesis Deposit Contract
     */
    function freezeContract() external {
        require(msg.sender == owner, "Caller not owner");
        contractFrozen = true;
    }

    /**
     * @dev convert sliced bytes to bytes32
     */
    function convertBytesToBytes32(bytes calldata inBytes)
        internal
        pure
        returns (bytes32 outBytes32)
    {
        if (inBytes.length == 0) {
            return 0x0;
        }
        bytes memory memoryInBytes = inBytes;
        assembly {
            outBytes32 := mload(add(memoryInBytes, 32))
        }
    }
}
