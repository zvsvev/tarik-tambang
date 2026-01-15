// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AutoBetManager
 * @notice Manages configuration for TarikTambang auto-bet bots
 * @dev Stores bot settings on-chain for transparency and control
 */
contract AutoBetManager {
    struct BotConfig {
        uint256 minBetAmount;      // Minimum bet in wei
        uint256 maxBetAmount;      // Maximum bet in wei
        uint256 betFrequency;      // Seconds between bets
        bool isActive;             // Bot enabled/disabled
        uint8 teamAWeight;         // 0-100: probability of betting on Team A
        uint256 lastUpdated;       // Timestamp of last config update
    }
    
    // Bot operator => their config
    mapping(address => BotConfig) public botConfigs;
    
    // Track all registered bot operators
    address[] public registeredBots;
    mapping(address => bool) public isBotRegistered;
    
    // Events
    event BotConfigured(
        address indexed operator,
        uint256 minBet,
        uint256 maxBet,
        uint256 frequency,
        uint8 teamAWeight
    );
    event BotStatusChanged(address indexed operator, bool isActive);
    
    /**
     * @notice Configure bot parameters
     * @param _minBet Minimum bet amount in wei
     * @param _maxBet Maximum bet amount in wei
     * @param _frequency Seconds between bets (e.g., 600 = 10 minutes)
     * @param _teamAWeight Probability of Team A (0-100, 50 = equal chance)
     */
    function configureBotConfig(
        uint256 _minBet,
        uint256 _maxBet,
        uint256 _frequency,
        uint8 _teamAWeight
    ) external {
        require(_minBet > 0, "Min bet must be > 0");
        require(_maxBet >= _minBet, "Max bet must be >= min bet");
        require(_teamAWeight <= 100, "Weight must be 0-100");
        require(_frequency >= 60, "Frequency must be >= 60 seconds");
        
        // Register bot if first time
        if (!isBotRegistered[msg.sender]) {
            registeredBots.push(msg.sender);
            isBotRegistered[msg.sender] = true;
        }
        
        botConfigs[msg.sender] = BotConfig({
            minBetAmount: _minBet,
            maxBetAmount: _maxBet,
            betFrequency: _frequency,
            isActive: true,
            teamAWeight: _teamAWeight,
            lastUpdated: block.timestamp
        });
        
        emit BotConfigured(msg.sender, _minBet, _maxBet, _frequency, _teamAWeight);
    }
    
    /**
     * @notice Pause or resume bot
     * @param _isActive true to activate, false to pause
     */
    function setBotStatus(bool _isActive) external {
        require(botConfigs[msg.sender].minBetAmount > 0, "Bot not configured");
        
        botConfigs[msg.sender].isActive = _isActive;
        emit BotStatusChanged(msg.sender, _isActive);
    }
    
    /**
     * @notice Get bot configuration
     * @param operator Address of bot operator
     */
    function getBotConfig(address operator) external view returns (BotConfig memory) {
        return botConfigs[operator];
    }
    
    /**
     * @notice Check if bot is active
     */
    function isBotActive(address operator) external view returns (bool) {
        return botConfigs[operator].isActive;
    }
    
    /**
     * @notice Get total number of registered bots
     */
    function getTotalBots() external view returns (uint256) {
        return registeredBots.length;
    }
    
    /**
     * @notice Get all registered bot addresses
     */
    function getAllBots() external view returns (address[] memory) {
        return registeredBots;
    }
    
    /**
     * @notice Get active bots count
     */
    function getActiveBotCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < registeredBots.length; i++) {
            if (botConfigs[registeredBots[i]].isActive) {
                count++;
            }
        }
        return count;
    }
}
