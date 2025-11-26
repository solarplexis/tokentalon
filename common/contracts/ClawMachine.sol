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

    // Track active game sessions
    mapping(address => GameSession) public activeSessions;

    struct GameSession {
        uint256 tokensEscrowed;
        uint256 timestamp;
        bool active;
    }

    // Events
    event GameStarted(address indexed player, uint256 tokensEscrowed);
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
     * @notice Start a new game session by escrowing tokens
     * @dev Player must have approved this contract to spend their tokens
     */
    function startGame() external {
        require(!activeSessions[msg.sender].active, "Game already in progress");
        require(
            gameToken.balanceOf(msg.sender) >= costPerPlay,
            "Insufficient token balance"
        );
        require(
            gameToken.allowance(msg.sender, address(this)) >= costPerPlay,
            "Insufficient token allowance"
        );

        // Transfer tokens to contract (escrow)
        require(
            gameToken.transferFrom(msg.sender, address(this), costPerPlay),
            "Token transfer failed"
        );

        // Create game session
        activeSessions[msg.sender] = GameSession({
            tokensEscrowed: costPerPlay,
            timestamp: block.timestamp,
            active: true
        });

        emit GameStarted(msg.sender, costPerPlay);
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
        require(activeSessions[msg.sender].active, "No active game session");

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

        // Mark voucher as used and save tokens before clearing session
        usedVouchers[voucherHash] = true;
        uint256 tokensSpent = activeSessions[msg.sender].tokensEscrowed;
        delete activeSessions[msg.sender];

        // Mint NFT prize to player
        emit PrizeClaimed(
            msg.sender,
            prizeNFT.mintPrize(msg.sender, prizeId, metadataUri, replayDataHash, difficulty, tokensSpent),
            prizeId,
            voucherHash
        );
    }

    /**
     * @notice Forfeit active game (lose escrowed tokens)
     * @dev Allows player to cancel game without claiming prize
     */
    function forfeitGame() external {
        require(activeSessions[msg.sender].active, "No active game session");

        // Clear game session (tokens remain in contract)
        delete activeSessions[msg.sender];
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
     * @notice Get active game session info
     * @param player Player address
     */
    function getGameSession(address player)
        external
        view
        returns (
            uint256 tokensEscrowed,
            uint256 timestamp,
            bool active
        )
    {
        GameSession memory session = activeSessions[player];
        return (session.tokensEscrowed, session.timestamp, session.active);
    }

    /**
     * @notice Check if voucher has been used
     * @param voucherHash Hash of the voucher
     */
    function isVoucherUsed(bytes32 voucherHash) external view returns (bool) {
        return usedVouchers[voucherHash];
    }
}
