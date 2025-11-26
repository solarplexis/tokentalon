// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameToken
 * @dev ERC-20 token used as in-game currency for TokenTalon
 * Players spend these tokens to play the claw machine game
 */
contract GameToken is ERC20, Ownable {
    /// @dev Maximum supply cap (10 million tokens)
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;

    /// @dev Token price in wei (for purchasing with ETH)
    uint256 public tokenPrice;

    /// @dev Faucet amount (tokens given per claim)
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 tokens

    /// @dev Faucet cooldown period (24 hours)
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @dev Track last faucet claim time for each address
    mapping(address => uint256) public lastFaucetClaim;

    /// @dev Event emitted when tokens are purchased
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);

    /// @dev Event emitted when faucet tokens are claimed
    event FaucetClaimed(address indexed claimer, uint256 amount);

    /// @dev Event emitted when token price is updated
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /**
     * @dev Constructor that mints initial supply to deployer
     * @param initialSupply Initial number of tokens to mint (in whole tokens, not wei)
     * @param _tokenPrice Price of one token in wei
     */
    constructor(
        uint256 initialSupply,
        uint256 _tokenPrice
    ) ERC20("TokenTalon Game Token", "TALON") Ownable(msg.sender) {
        require(initialSupply * 10**18 <= MAX_SUPPLY, "Initial supply exceeds max");
        tokenPrice = _tokenPrice;
        _mint(msg.sender, initialSupply * 10**18);
    }

    /**
     * @dev Allows anyone to purchase tokens by sending ETH
     * Automatically calculates token amount based on current price
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Must send ETH to buy tokens");
        require(tokenPrice > 0, "Token price not set");

        uint256 tokenAmount = (msg.value * 10**18) / tokenPrice;
        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Would exceed max supply");

        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }

    /**
     * @dev Claim free tokens from faucet (testnet only)
     * Can be called once every 24 hours per address
     */
    function claimFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown not expired"
        );
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "Would exceed max supply");

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Check if address can claim from faucet
     * @param account Address to check
     * @return True if can claim, false otherwise
     */
    function canClaimFaucet(address account) external view returns (bool) {
        return block.timestamp >= lastFaucetClaim[account] + FAUCET_COOLDOWN;
    }

    /**
     * @dev Get time until next faucet claim is available
     * @param account Address to check
     * @return Seconds until next claim (0 if can claim now)
     */
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 nextClaim = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaim) return 0;
        return nextClaim - block.timestamp;
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        _mint(to, amount);
    }

    /**
     * @dev Update the token price (only owner)
     * @param newPrice New price in wei
     */
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = tokenPrice;
        tokenPrice = newPrice;
        emit TokenPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @dev Withdraw accumulated ETH from token sales (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Get the amount of tokens that can be purchased with a given ETH amount
     * @param ethAmount Amount of ETH in wei
     * @return Amount of tokens that can be purchased
     */
    function getTokenAmount(uint256 ethAmount) external view returns (uint256) {
        if (tokenPrice == 0) return 0;
        return (ethAmount * 10**18) / tokenPrice;
    }
}
