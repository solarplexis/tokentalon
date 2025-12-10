// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title MockChainlinkPriceFeed
 * @dev Mock Chainlink price feed for testing on local networks
 * Returns a configurable ETH/USD price
 */
contract MockChainlinkPriceFeed is AggregatorV3Interface {
    int256 private _price;
    uint8 private constant _decimals = 8;
    uint80 private _roundId = 1;
    string private _description = "Mock ETH/USD Price Feed";

    /**
     * @dev Constructor sets initial mock price
     * @param initialPrice Initial price with 8 decimals (e.g., 304501000000 = $3,045.01)
     */
    constructor(int256 initialPrice) {
        require(initialPrice > 0, "Price must be positive");
        _price = initialPrice;
    }

    /**
     * @dev Returns the number of decimals the price feed uses
     */
    function decimals() external pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Returns the description of the price feed
     */
    function description() external view override returns (string memory) {
        return _description;
    }

    /**
     * @dev Returns the version of the aggregator
     */
    function version() external pure override returns (uint256) {
        return 1;
    }

    /**
     * @dev Returns mock price data
     * @return roundId The round ID
     * @return answer The current price with 8 decimals
     * @return startedAt Timestamp when the round started
     * @return updatedAt Timestamp when the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId
        );
    }

    /**
     * @dev Returns data for a specific round (simplified mock)
     */
    function getRoundData(uint80)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId
        );
    }

    /**
     * @dev Update the mock price (for testing purposes)
     * @param newPrice New price with 8 decimals
     */
    function updatePrice(int256 newPrice) external {
        require(newPrice > 0, "Price must be positive");
        _price = newPrice;
        _roundId++;
    }

    /**
     * @dev Get current mock price
     */
    function getPrice() external view returns (int256) {
        return _price;
    }
}
