// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title GameToken
 * @dev ERC-20 token used as in-game currency for TokenTalon
 * Players spend these tokens to play the claw machine game
 */
contract GameToken is ERC20, Ownable {
    /// @dev Maximum supply cap (10 million tokens)
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;

    /// @dev Token price in wei (for purchasing with ETH) - deprecated, use tokenPriceUsd
    uint256 public tokenPrice;

    /// @dev Token price in USD with 8 decimals (e.g., 50 = $0.00000050)
    uint256 public tokenPriceUsd;

    /// @dev Chainlink price feed for ETH/USD conversion
    AggregatorV3Interface public priceFeed;

    /// @dev Faucet amount (tokens given per claim) - configurable by owner
    uint256 public faucetAmount = 500 * 10**18; // 500 tokens

    /// @dev Faucet cooldown period - configurable by owner
    uint256 public faucetCooldown = 5 minutes;

    /// @dev Faucet enabled/disabled state - configurable by owner
    bool public faucetEnabled = true;

    /// @dev Maximum allowed faucet amount (safety limit)
    uint256 public constant MAX_FAUCET_AMOUNT = 10000 * 10**18; // 10,000 tokens

    /// @dev Minimum allowed faucet cooldown (prevent spam)
    uint256 public constant MIN_FAUCET_COOLDOWN = 1 minutes;

    /// @dev Maximum allowed faucet cooldown
    uint256 public constant MAX_FAUCET_COOLDOWN = 30 days;

    /// @dev Track last faucet claim time for each address
    mapping(address => uint256) public lastFaucetClaim;

    /// @dev Event emitted when tokens are purchased
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);

    /// @dev Event emitted when faucet tokens are claimed
    event FaucetClaimed(address indexed claimer, uint256 amount);

    /// @dev Event emitted when token price is updated
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /// @dev Event emitted when faucet amount is updated
    event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount);

    /// @dev Event emitted when faucet cooldown is updated
    event FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    /// @dev Event emitted when faucet is enabled/disabled
    event FaucetStatusUpdated(bool enabled);

    /// @dev Event emitted when price feed address is updated
    event PriceFeedUpdated(address indexed oldPriceFeed, address indexed newPriceFeed);

    /// @dev Event emitted when token price in USD is updated
    event TokenPriceUsdUpdated(uint256 oldPrice, uint256 newPrice);

    /**
     * @dev Constructor that mints initial supply to deployer
     * @param initialSupply Initial number of tokens to mint (in whole tokens, not wei)
     * @param _tokenPriceUsd Price of one token in USD with 8 decimals (e.g., 50 = $0.00000050)
     * @param _priceFeedAddress Address of Chainlink ETH/USD price feed
     */
    constructor(
        uint256 initialSupply,
        uint256 _tokenPriceUsd,
        address _priceFeedAddress
    ) ERC20("TokenTalon Game Token", "TALON") Ownable(msg.sender) {
        require(initialSupply * 10**18 <= MAX_SUPPLY, "Initial supply exceeds max");
        require(_tokenPriceUsd > 0, "Token price must be positive");
        require(_priceFeedAddress != address(0), "Invalid price feed address");

        tokenPriceUsd = _tokenPriceUsd;
        priceFeed = AggregatorV3Interface(_priceFeedAddress);

        // Set initial tokenPrice for backwards compatibility
        tokenPrice = getTokenPriceEth();

        _mint(msg.sender, initialSupply * 10**18);
    }

    /**
     * @dev Get current token price in ETH calculated from USD price and ETH/USD rate
     * @return Token price in wei
     */
    function getTokenPriceEth() public view returns (uint256) {
        (, int256 ethUsdPrice, , , ) = priceFeed.latestRoundData();
        require(ethUsdPrice > 0, "Invalid price feed data");

        // tokenPriceUsd has 8 decimals, ethUsdPrice has 8 decimals
        // Result should be in wei (18 decimals)
        // Formula: (tokenPriceUsd * 1e18) / ethUsdPrice
        return (tokenPriceUsd * 1e18) / uint256(ethUsdPrice);
    }

    /**
     * @dev Allows anyone to purchase tokens by sending ETH
     * Automatically calculates token amount based on current ETH/USD price
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Must send ETH to buy tokens");

        uint256 currentPrice = getTokenPriceEth();
        require(currentPrice > 0, "Token price not set");

        uint256 tokenAmount = (msg.value * 10**18) / currentPrice;
        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Would exceed max supply");

        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }

    /**
     * @dev Claim free tokens from faucet (testnet only)
     * Can be called once per cooldown period
     */
    function claimFaucet() external {
        require(faucetEnabled, "Faucet is disabled");
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown,
            "Faucet cooldown not expired"
        );
        require(totalSupply() + faucetAmount <= MAX_SUPPLY, "Would exceed max supply");

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit FaucetClaimed(msg.sender, faucetAmount);
    }

    /**
     * @dev Check if address can claim from faucet
     * @param account Address to check
     * @return True if can claim, false otherwise
     */
    function canClaimFaucet(address account) external view returns (bool) {
        if (!faucetEnabled) return false;
        return block.timestamp >= lastFaucetClaim[account] + faucetCooldown;
    }

    /**
     * @dev Get time until next faucet claim is available
     * @param account Address to check
     * @return Seconds until next claim (0 if can claim now)
     */
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        if (!faucetEnabled) return type(uint256).max; // Return max if disabled
        uint256 nextClaim = lastFaucetClaim[account] + faucetCooldown;
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
     * @notice DEPRECATED: Use setTokenPriceUsd() instead for dynamic pricing
     * @param newPrice New price in wei
     */
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = tokenPrice;
        tokenPrice = newPrice;
        emit TokenPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @dev Update the token price in USD terms (only owner)
     * Price will automatically adjust based on ETH/USD rate
     * @param newPriceUsd New price in USD with 8 decimals (e.g., 50 = $0.00000050)
     */
    function setTokenPriceUsd(uint256 newPriceUsd) external onlyOwner {
        require(newPriceUsd > 0, "Price must be greater than 0");
        uint256 oldPrice = tokenPriceUsd;
        tokenPriceUsd = newPriceUsd;
        // Update tokenPrice for backwards compatibility
        tokenPrice = getTokenPriceEth();
        emit TokenPriceUsdUpdated(oldPrice, newPriceUsd);
    }

    /**
     * @dev Update the Chainlink price feed address (only owner)
     * @param newPriceFeed Address of new Chainlink ETH/USD price feed
     */
    function setPriceFeed(address newPriceFeed) external onlyOwner {
        require(newPriceFeed != address(0), "Invalid price feed address");
        address oldPriceFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(newPriceFeed);
        // Update tokenPrice for backwards compatibility
        tokenPrice = getTokenPriceEth();
        emit PriceFeedUpdated(oldPriceFeed, newPriceFeed);
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
        uint256 currentPrice = getTokenPriceEth();
        if (currentPrice == 0) return 0;
        return (ethAmount * 10**18) / currentPrice;
    }

    /**
     * @dev Update the faucet amount (only owner)
     * @param newAmount New faucet amount in wei
     */
    function setFaucetAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be greater than 0");
        require(newAmount <= MAX_FAUCET_AMOUNT, "Amount exceeds maximum");
        uint256 oldAmount = faucetAmount;
        faucetAmount = newAmount;
        emit FaucetAmountUpdated(oldAmount, newAmount);
    }

    /**
     * @dev Update the faucet cooldown period (only owner)
     * @param newCooldown New cooldown period in seconds
     */
    function setFaucetCooldown(uint256 newCooldown) external onlyOwner {
        require(newCooldown >= MIN_FAUCET_COOLDOWN, "Cooldown too short");
        require(newCooldown <= MAX_FAUCET_COOLDOWN, "Cooldown too long");
        uint256 oldCooldown = faucetCooldown;
        faucetCooldown = newCooldown;
        emit FaucetCooldownUpdated(oldCooldown, newCooldown);
    }

    /**
     * @dev Enable or disable the faucet (only owner)
     * @param enabled True to enable, false to disable
     */
    function setFaucetEnabled(bool enabled) external onlyOwner {
        faucetEnabled = enabled;
        emit FaucetStatusUpdated(enabled);
    }
}
