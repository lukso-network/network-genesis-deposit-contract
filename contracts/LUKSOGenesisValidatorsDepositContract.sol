 //  _    _   _ _  ______   ___     ____                      _      __     __    _ _     _       _
 // | |  | | | | |/ / ___| / _ \   / ___| ___ _ __   ___  ___(_)___  \ \   / /_ _| (_) __| | __ _| |_ ___  _ __ ___
 // | |  | | | | ' /\___ \| | | | | |  _ / _ \ '_ \ / _ \/ __| / __|  \ \ / / _` | | |/ _` |/ _` | __/ _ \| '__/ __|
 // | |__| |_| | . \ ___) | |_| | | |_| |  __/ | | |  __/\__ \ \__ \   \ V / (_| | | | (_| | (_| | || (_) | |  \__ \
 // |_____\___/|_|\_\____/ \___/   \____|\___|_| |_|\___||___/_|___/    \_/ \__,_|_|_|\__,_|\__,_|\__\___/|_|  |___/



// SPDX-License-Identifier: CC0-1.0

pragma solidity 0.8.15;

import {IERC165} from "./interfaces/IERC165.sol";
import {IERC1820Registry} from "./interfaces/IERC1820Registry.sol";

contract LUKSOGenesisValidatorsDepositContract is IERC165 {
    // The address of the LYXe token contract.
    address constant LYXeAddress = 0xA8b919680258d369114910511cc87595aec0be6D;

    // The address of the registry contract (ERC1820 Registry).
    address constant registryAddress = 0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;

    // The hash of the interface of the contract that receives tokens.
    bytes32 constant TOKENS_RECIPIENT_INTERFACE_HASH =
        0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    // _to_little_endian_64(uint64(32 ether / 1 gwei))
    bytes constant amount_to_little_endian_64 = hex"0040597307000000";

    // The current number of deposits in the contract.
    uint256 internal deposit_count;

    // The delay in blocks for the contract to be frozen (46 523 blocks ~ 1 week)
    uint256 public constant FREEZE_DELAY = 46_523;

    // The block number when the contract will be frozen.
    uint256 public freezeBlockNumber;

    event DepositEvent(
        bytes pubkey,
        bytes withdrawal_credentials,
        bytes amount,
        bytes signature,
        uint256 index
    );

    event FreezeInitiated(uint256 initiatedAt, uint256 freezeAt);

    /**
     * @dev Storing all the deposit data which should be sliced
     * in order to get the following parameters:
     * - pubkey - the first 48 bytes
     * - withdrawal_credentials - the following 32 bytes
     * - signature - the following 96 bytes
     * - deposit_data_root - the following 32 bytes
     * - initial_supply_vote - the last byte is the initial supply of LYX in million where 0 means non-vote
     */
    mapping(uint256 => bytes) internal deposit_data;

    /**
     * @dev Storing the amount of votes for each supply where the index is the initial supply of LYX in million
     */
    mapping(uint256 => uint256) public supplyVoteCounter;

    /**
     * @dev Storing the hash of the public key in order to check if it is already registered
    */
    mapping(bytes32 => bool) private _registeredPubKeyHash;

    /**
     * @dev Owner of the contract
     * Has access to `freezeContract()`
     */
    address public immutable owner;

    /**
     * @dev Default value is false which allows people to send 32 LYXe
     * to this contract with valid data in order to register as Genesis Validator
     */
    bool public isContractFrozen;

    /**
     * @dev Save the deployer as the owner of the contract
     */
    constructor(address owner_) {

        require(owner_ != address(0), "LUKSOGenesisValidatorsDepositContract: owner cannot be zero address");
        owner = owner_;

        isContractFrozen = false;

        // Set this contract as the implementer of the tokens recipient interface in the registry contract.
        IERC1820Registry(registryAddress).setInterfaceImplementer(
            address(this),
            TOKENS_RECIPIENT_INTERFACE_HASH,
            address(this)
        );
    }

    /**
     * @dev Whenever this contract receives LYXe tokens, it must be for the reason of
     * being a Genesis Validator.
     *
     * Requirements:
     * - `amount` MUST be exactly 32 LYXe
     * - `depositData` MUST be encoded properly
     * - `depositData` MUST contain:
     *   • pubkey - the first 48 bytes
     *   • withdrawal_credentials - the following 32 bytes
     *   • signature - the following 96 bytes
     *   • deposit_data_root - the following 32 bytes
     *   • supply - that last byte is the initial supply of LYX in million where 0 means non-vote
     */
    function tokensReceived(
        address, /* operator */
        address, /* from */
        address, /* to */
        uint256 amount,
        bytes calldata depositData,
        bytes calldata /* operatorData */
    ) external {

        uint256 freezeBlockNumberValue = freezeBlockNumber;

        // Check if the contract is frozen
        require(
            freezeBlockNumberValue == 0 || block.number < freezeBlockNumberValue,
            "LUKSOGenesisValidatorsDepositContract: Contract is frozen"
        );
        // Check is the caller is the LYXe token contract
        require(
            msg.sender == LYXeAddress,
            "LUKSOGenesisValidatorsDepositContract: Not called on LYXe transfer"
        );
        // Check if the amount is 32 LYXe
        require(
            amount == 32 ether,
            "LUKSOGenesisValidatorsDepositContract: Cannot send an amount different from 32 LYXe"
        );
        /*Check if the deposit data has the correct length (209 bytes)
          - 48 bytes for the pubkey
          - 32 bytes for the withdrawal_credentials
          - 96 bytes for the signature
          - 32 bytes for the deposit_data_root
          - 1 byte for the initialSupplyVote
        */
        require(
            depositData.length == 209,
            "LUKSOGenesisValidatorsDepositContract: depositData not encoded properly"
        );

        uint256 initialSupplyVote = uint256(uint8(depositData[208]));
        require(initialSupplyVote <= 100, "LUKSOGenesisValidatorsDepositContract: Invalid initialSupplyVote vote");
        supplyVoteCounter[initialSupplyVote]++;

        // Store the deposit data in the contract state.
        deposit_data[deposit_count] = depositData;

        bytes calldata pubkey = depositData[:48];
        bytes calldata withdrawal_credentials = depositData[48:80];
        bytes calldata signature = depositData[80:176];
        bytes32 deposit_data_root = bytes32(depositData[176:208]);

        bytes32 pubKeyHash = keccak256(pubkey);
        // Prevent deposits twice for the same pubkey
        require(
            !_registeredPubKeyHash[pubKeyHash],
            "LUKSOGenesisValidatorsDepositContract: Deposit already processed"
        );

        // Mark the pubkey as registered
        _registeredPubKeyHash[pubKeyHash] = true;

        // Compute deposit data root (`DepositData` hash tree root)
        bytes32 pubkey_root = keccak256(abi.encodePacked(pubkey, bytes16(0)));

        // Compute the root of the signature data.
        bytes32 signature_root = keccak256(
            abi.encodePacked(
                keccak256(abi.encodePacked(signature[:64])),
                keccak256(abi.encodePacked(signature[64:], bytes32(0)))
            )
        );

        // Compute the root of the deposit data.
        bytes32 computedDataRoot = keccak256(
            abi.encodePacked(
                keccak256(abi.encodePacked(pubkey_root, withdrawal_credentials)),
                keccak256(abi.encodePacked(amount_to_little_endian_64, bytes24(0), signature_root))
            )
        );

        // Verify computed and expected deposit data roots match
        require(
            computedDataRoot == deposit_data_root,
            "LUKSOGenesisValidatorsDepositContract: reconstructed DepositData does not match supplied deposit_data_root"
        );

        // Emit `DepositEvent` log
        emit DepositEvent(
            pubkey,
            withdrawal_credentials,
            amount_to_little_endian_64,
            signature,
            deposit_count
        );

        deposit_count++;

    }

    /**
     * @dev Freze the LUKSO Genesis Deposit Contract 100 blocks after the call
     */
    function freezeContract() external {
         uint256 freezeInitiatedAt = freezeBlockNumber;
        // Check if the contract is already frozen
        require(
            freezeInitiatedAt == 0,
            "LUKSOGenesisValidatorsDepositContract: Contract is already frozen"
        );
        // Check if the caller is the owner
        require(msg.sender == owner, "LUKSOGenesisValidatorsDepositContract: Caller not owner");
        // Set the freeze block number to the current block number + FREEZE_DELAY
        uint256 freezeAt = block.number + FREEZE_DELAY;
        freezeBlockNumber = freezeAt;
        emit FreezeInitiated(block.number, freezeAt);
    }

    /**
     * @dev Returns wether the pubkey is registered or not.
     *
     * @param pubkey The public key of the validator.
     * @return bool Whether the pubkey is registered or not.
     */
    function isPubkeyRegistered(bytes calldata pubkey) external view returns (bool) {
        return _registeredPubKeyHash[keccak256(pubkey)];
    }

    /**
     * @dev Returns the current number of deposits.
     *
     * @return The number of deposits.
     */
    function depositCount() external view returns (uint256) {
        return deposit_count;
    }

    /**
     * @dev Retrieves an array of votes per supply and the total number of votes
     */

    function getsVotesPerSupply()
        external
        view
        returns (uint256[101] memory votesPerSupply, uint256 totalVotes)
    {
        for (uint256 i = 0; i <= 100; i++) {
            votesPerSupply[i] = supplyVoteCounter[i];
        }
        return (votesPerSupply, deposit_count);
    }

    /**
     * @dev Get an array of all excoded deposit data
     */
    function getDepositData() external view returns (bytes[] memory returnedArray) {
        returnedArray = new bytes[](deposit_count);
        for (uint256 i = 0; i < deposit_count; i++) returnedArray[i] = deposit_data[i];
    }

    /**
     * @dev Get the encoded deposit data at the `index`
     */
    function getDepositDataByIndex(uint256 index) external view returns (bytes memory) {
        return deposit_data[index];
    }

    /**
     * @dev Determines whether the contract supports a given interface.
     *
     * @param interfaceId The interface ID to check.
     * @return True if the contract supports the interface, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId;
    }
}
