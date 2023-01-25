// SPDX-License-Identifier: CC0-1.0

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

// This interface is designed to be compatible with the Vyper version.
/// @notice This is the Ethereum 2.0 deposit contract interface.
/// For more information see the Phase 0 specification under https://github.com/ethereum/eth2.0-specs
interface IDepositContract {
    /// @notice A processed deposit event.
    event DepositEvent(
        bytes pubkey,
        bytes withdrawal_credentials,
        bytes amount,
        bytes signature,
        bytes index
    );

    /// @notice Query the current deposit root hash.
    /// @return The deposit root hash.
    function get_deposit_root() external view returns (bytes32);

    /// @notice Query the current deposit count.
    /// @return The deposit count encoded as a little endian 64-bit number.
    function get_deposit_count() external view returns (bytes memory);

    /// @notice Query the owner of the deposit contract.
    /// @return The owner of the deposit contract.
    function owner() external view returns (address);

    /// @notice Querry if the deposit contract is frozen
    /// @return True if the deposit contract is frozen, false otherwise.
    function isContractFrozen() external view returns (bool);

    // @notice function called by the LYXe token contract to deposit
    // @params amount The amount of LYXe to deposit
    // @parama depositData The deposit data (pubkey, withdrawal_credentials, signature, deposit_data_root)
    function tokensReceived(
        address, /* operator */
        address, /* from */
        address, /* to */
        uint256 amount,
        bytes calldata depositData,
        bytes calldata /* operatorData */
    ) external;

    /// @notice change isContractFrozen to true
    // @dev only owner can call this function
    function freezeContract() external;

    /// @dev Get an array of all excoded deposit data
    function get_deposit_data() external view returns (bytes[] memory returnedArray);

    /// @dev Get the encoded deposit data at the `index`
    function get_deposit_data_by_index(uint256 index) external view returns (bytes memory);
}

// Based on official specification in https://eips.ethereum.org/EIPS/eip-165
interface ERC165 {
    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @dev Interface identification is specified in ERC-165. This function
    ///  uses less than 30,000 gas.
    /// @return `true` if the contract implements `interfaceId` and
    ///  `interfaceId` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceId) external pure returns (bool);
}

interface ERC1820Registry {
    function setInterfaceImplementer(
        address _addr,
        bytes32 _interfaceHash,
        address _implementer
    ) external;
}

contract LUKSOGenesisValidatorsDepositContract is IDepositContract, ERC165 {
    // The address of the LYXe token contract.
    address constant LYXeAddress = 0xA8b919680258d369114910511cc87595aec0be6D;

    // The address of the registry contract (ERC1820 Registry).
    address constant registryAddress = 0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;

    // The hash of the interface of the contract that receives tokens.
    bytes32 constant TOKENS_RECIPIENT_INTERFACE_HASH =
        0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    // The depth of the Merkle tree of deposits.
    uint256 constant DEPOSIT_CONTRACT_TREE_DEPTH = 32;

    // NOTE: this also ensures `deposit_count` will fit into 64-bits
    uint256 constant MAX_DEPOSIT_COUNT = 2**DEPOSIT_CONTRACT_TREE_DEPTH - 1;

    // _to_little_endian_64(uint64(32 ether / 1 gwei))
    bytes constant amount_to_little_endian_64 = hex"0040597307000000";

    // The current state of the Merkle tree of deposits.
    bytes32[DEPOSIT_CONTRACT_TREE_DEPTH] branch;

    // A pre-computed array of zero hashes for use in computing the Merkle root.
    bytes32[DEPOSIT_CONTRACT_TREE_DEPTH] zero_hashes;

    // The current number of deposits in the contract.
    uint256 public deposit_count;

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
    address public immutable override owner;

    /**
     * @dev Default value is false which allows people to send 32 LYXe
     * to this contract with valid data in order to register as Genesis Validator
     */
    bool public override isContractFrozen;

    /**
     * @dev Save the deployer as the owner of the contract
     */
    constructor() public {
        owner = msg.sender;

        isContractFrozen = false;

        // Set this contract as the implementer of the tokens recipient interface in the registry contract.
        ERC1820Registry(registryAddress).setInterfaceImplementer(
            address(this),
            TOKENS_RECIPIENT_INTERFACE_HASH,
            address(this)
        );

        // Compute hashes in empty sparse Merkle tree
        for (uint256 height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH - 1; height++)
            zero_hashes[height + 1] = sha256(
                abi.encodePacked(zero_hashes[height], zero_hashes[height])
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
     *   • deposit_data_root - last 32 bytes
     */
    function tokensReceived(
        address, /* operator */
        address, /* from */
        address, /* to */
        uint256 amount,
        bytes calldata depositData,
        bytes calldata /* operatorData */
    ) external override {
        require(!isContractFrozen, "LUKSOGenesisValidatorsDepositContract: Contract is frozen");
        require(msg.sender == LYXeAddress, "LUKSOGenesisValidatorsDepositContract: Not called on LYXe transfer");
        require(amount == 32 ether, "LUKSOGenesisValidatorsDepositContract: Cannot send an amount different from 32 LYXe");
        // 208 = 48 bytes pubkey + 32 bytes withdrawal_credentials + 96 bytes signature + 32 bytes deposit_data_root
        require(depositData.length == (208), "LUKSOGenesisValidatorsDepositContract: Data not encoded properly");

        // Store the deposit data in the contract state.
        deposit_data[deposit_count] = depositData;

        // Process the deposit and update the Merkle tree.
        _deposit(
            depositData[:48], // pubkey
            depositData[48:80], // withdrawal_credentials
            depositData[80:176], // signature
            _convertBytesToBytes32(depositData[176:208]) // deposit_data_root
        );
    }

    /**
     * @dev Freze the LUKSO Genesis Deposit Contract
     */
    function freezeContract() external override {
        require(msg.sender == owner, "LUKSOGenesisValidatorsDepositContract: Caller not owner");
        isContractFrozen = true;
    }

    /**
     * @dev Returns the current root of the Merkle tree of deposits.
     *
     * @return The Merkle root of the deposit data.
     */
    function get_deposit_root() external view override returns (bytes32) {
        bytes32 node;
        uint256 size = deposit_count;
        for (uint256 height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
            if ((size & 1) == 1) node = sha256(abi.encodePacked(branch[height], node));
            else node = sha256(abi.encodePacked(node, zero_hashes[height]));
            size /= 2;
        }

        return
            sha256(abi.encodePacked(node, _to_little_endian_64(uint64(deposit_count)), bytes24(0)));
    }

    /**
     * @dev Returns the current number of deposits in the contract.
     *
     * @return The number of deposits in little-endian order.
     */
    function get_deposit_count() external view override returns (bytes memory) {
        return _to_little_endian_64(uint64(deposit_count));
    }

    /**
     * @dev Get an array of all excoded deposit data
     */
    function get_deposit_data() external view override returns (bytes[] memory returnedArray) {
        returnedArray = new bytes[](deposit_count);
        for (uint256 i = 0; i < deposit_count; i++) returnedArray[i] = deposit_data[i];
    }

    /**
     * @dev Get the encoded deposit data at the `index`
     */
    function get_deposit_data_by_index(uint256 index) public view override returns (bytes memory) {
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
            interfaceId == type(ERC165).interfaceId ||
            interfaceId == type(IDepositContract).interfaceId;
    }

    /**
     * @dev Processes a deposit and updates the Merkle tree.
     *
     * @param pubkey The public key of the depositor.
     * @param withdrawal_credentials The withdrawal credentials of the depositor.
     * @param signature The deposit signature of the depositor.
     * @param deposit_data_root The root of the deposit data.
     */
    function _deposit(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) internal {
        // Emit `DepositEvent` log
        emit DepositEvent(
            pubkey,
            withdrawal_credentials,
            amount_to_little_endian_64,
            signature,
            _to_little_endian_64(uint64(deposit_count))
        );

        // Compute deposit data root (`DepositData` hash tree root)
        bytes32 pubkey_root = sha256(abi.encodePacked(pubkey, bytes16(0)));

        // Compute the root of the signature data.
        bytes32 signature_root = sha256(
            abi.encodePacked(
                sha256(abi.encodePacked(signature[:64])),
                sha256(abi.encodePacked(signature[64:], bytes32(0)))
            )
        );

        // Compute the root of the deposit data.
        bytes32 node = sha256(
            abi.encodePacked(
                sha256(abi.encodePacked(pubkey_root, withdrawal_credentials)),
                sha256(abi.encodePacked(amount_to_little_endian_64, bytes24(0), signature_root))
            )
        );

        // Verify computed and expected deposit data roots match
        require(
            node == deposit_data_root,
            "LUKSOGenesisValidatorsDepositContract: reconstructed DepositData does not match supplied deposit_data_root"
        );

        // Avoid overflowing the Merkle tree (and prevent edge case in computing `branch`)
        require(deposit_count < MAX_DEPOSIT_COUNT, "LUKSOGenesisValidatorsDepositContract: merkle tree full");

        // Add deposit data root to Merkle tree (update a single `branch` node)
        deposit_count += 1;
        uint256 size = deposit_count;
        for (uint256 height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
            if ((size & 1) == 1) {
                branch[height] = node;
                return;
            }
            node = sha256(abi.encodePacked(branch[height], node));
            size /= 2;
        }
        // As the loop should always end prematurely with the `return` statement,
        // this code should be unreachable. We assert `false` just to be safe.
        assert(false);
    }

    /**
     * @dev Converts a uint64 value to a byte array in little-endian order.
     *
     * @param value The uint64 value to convert.
     * @return ret The byte array in little-endian order.
     */
    function _to_little_endian_64(uint64 value) internal pure returns (bytes memory ret) {
        ret = new bytes(8);
        bytes8 bytesValue = bytes8(value);
        // Byteswapping during copying to bytes.
        ret[0] = bytesValue[7];
        ret[1] = bytesValue[6];
        ret[2] = bytesValue[5];
        ret[3] = bytesValue[4];
        ret[4] = bytesValue[3];
        ret[5] = bytesValue[2];
        ret[6] = bytesValue[1];
        ret[7] = bytesValue[0];
    }

    /**
     * @dev Converts the first 32 bytes of a byte array to a bytes32 value.
     *
     * @param inBytes The byte array to convert.
     * @return outBytes32 The bytes32 value.
     */
    function _convertBytesToBytes32(bytes calldata inBytes)
        internal
        pure
        returns (bytes32 outBytes32)
    {
        bytes memory memoryInBytes = inBytes;
        assembly {
            outBytes32 := mload(add(memoryInBytes, 32))
        }
    }
}
