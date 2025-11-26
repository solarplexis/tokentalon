// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./GameToken.sol";
import "./PrizeNFT.sol";

/**
 * @title ClawMachine
 * @notice Orchestrates claw machine gameplay, token escrow, and prize distribution
 * @dev Uses oracle pattern to verify off-chain game outcomes before minting NFT prizes
 */
contract ClawMachine is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // State variables
    GameToken public immutable gameToken;
    PrizeNFT public immutable prizeNFT;
    address public oracleAddress;
    uint256 public costPerPlay;

    // Track used vouchers to prevent replay attacks
    mapping(bytes32 => bool) public usedVouchers;

    // Track total games played per player (for NFT metadata)
    mapping(address => uint256) public gamesPlayed;

    // Events
    event GameStarted(address indexed player, uint256 timestamp);
    event GrabAttempt(address indexed player, uint256 grabNumber, uint256 tokensPaid);
    event PrizeClaimed(
        address indexed player,
        uint256 indexed tokenId,
        uint256 prizeId,
        bytes32 voucherHash
    );
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    event CostPerPlayUpdated(uint256 oldCost, uint256 newCost);
    event TokensWithdrawn(address indexed owner, uint256 amount);

    /**
     * @notice Constructor
     * @param _gameToken Address of GameToken contract
     * @param _prizeNFT Address of PrizeNFT contract
     * @param _oracleAddress Backend server address that signs win vouchers
     * @param _costPerPlay Initial cost in tokens to play one game
     */
    constructor(
        address _gameToken,
        address _prizeNFT,
        address _oracleAddress,
        uint256 _costPerPlay
    ) Ownable(msg.sender) {
        require(_gameToken != address(0), "Invalid GameToken address");
        require(_prizeNFT != address(0), "Invalid PrizeNFT address");
        require(_oracleAddress != address(0), "Invalid oracle address");
        require(_costPerPlay > 0, "Cost per play must be positive");

        gameToken = GameToken(_gameToken);
        prizeNFT = PrizeNFT(_prizeNFT);
        oracleAddress = _oracleAddress;
        costPerPlay = _costPerPlay;
    }

    /**
     * @notice Pay for a claw grab attempt
     * @dev Player must approve contract to spend tokens before each grab
     */
    function payForGrab() external {
        require(
            gameToken.balanceOf(msg.sender) >= costPerPlay,
            "Insufficient token balance"
        );
        require(
            gameToken.allowance(msg.sender, address(this)) >= costPerPlay,
            "Insufficient token allowance"
        );

        // Transfer tokens to contract
        require(
            gameToken.transferFrom(msg.sender, address(this), costPerPlay),
            "Token transfer failed"
        );

        // Increment grab count
        grabCounts[msg.sender]++;

        emit GrabAttempt(msg.sender, grabCounts[msg.sender], costPerPlay);
    }

    /**
     * @notice Claim a prize by submitting oracle-signed voucher
     * @param prizeId The ID of the prize won
     * @param metadataUri IPFS URI containing NFT metadata
     * @param replayDataHash IPFS hash of the game replay data
     * @param difficulty Difficulty level (1-10) of the win
     * @param nonce Unique nonce to prevent voucher reuse
     * @param signature Oracle's signature of the voucher
     */
    function claimPrize(
        uint256 prizeId,
        string calldata metadataUri,
        string calldata replayDataHash,
        uint8 difficulty,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(grabCounts[msg.sender] > 0, "No grabs recorded");

        // Create and verify voucher
        bytes32 voucherHash = keccak256(
            abi.encodePacked(
                msg.sender,
                prizeId,
                metadataUri,
                replayDataHash,
                difficulty,
                nonce
            )
        );

        require(!usedVouchers[voucherHash], "Voucher already used");
        require(
            voucherHash.toEthSignedMessageHash().recover(signature) == oracleAddress,
            "Invalid oracle signature"
        );

        // Mark voucher as used and get grab count before resetting
        usedVouchers[voucherHash] = true;
        uint256 totalGrabs = grabCounts[msg.sender];
        grabCounts[msg.sender] = 0; // Reset grab count after claiming

        // Mint NFT prize to player (tokensSpent = grabs * costPerPlay)
        emit PrizeClaimed(
            msg.sender,
            prizeNFT.mintPrize(
                msg.sender, 
                prizeId, 
                metadataUri, 
                replayDataHash, 
                difficulty, 
                totalGrabs * costPerPlay
            ),
            prizeId,
            voucherHash
        );
    }

    /**
     * @notice Update oracle address
     * @param newOracle New oracle address
     */
    function setOracleAddress(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        address oldOracle = oracleAddress;
        oracleAddress = newOracle;
        emit OracleAddressUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Update cost per play
     * @param newCost New cost in tokens
     */
    function setCostPerPlay(uint256 newCost) external onlyOwner {
        require(newCost > 0, "Cost must be positive");
        uint256 oldCost = costPerPlay;
        costPerPlay = newCost;
        emit CostPerPlayUpdated(oldCost, newCost);
    }

    /**
     * @notice Withdraw accumulated tokens to owner
     * @dev Withdraws all tokens held by contract
     */
    function withdrawTokens() external onlyOwner {
        uint256 balance = gameToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(gameToken.transfer(owner(), balance), "Transfer failed");
        emit TokensWithdrawn(owner(), balance);
    }

    /**
     * @notice Get player's current grab count
     * @param player Player address
     */
    function getGrabCount(address player) external view returns (uint256) {
        return grabCounts[player];
    }

    /**
     * @notice Check if voucher has been used
     * @param voucherHash Hash of the voucher
     */
    function isVoucherUsed(bytes32 voucherHash) external view returns (bool) {
        return usedVouchers[voucherHash];
    }
}
