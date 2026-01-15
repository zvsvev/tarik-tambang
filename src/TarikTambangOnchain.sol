// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TarikTambangOnchain
 * @notice TarikTambang - Pull Together, Win Together
 * @notice Hourly betting game with time-based aligned sessions
 * @dev Features:
 * - Sessions aligned to hourly boundaries (09:00, 10:00, 11:00, etc.)
 * - Lazy auto-create: new session created when user bets after previous ends
 * - Auto-finalize: previous session finalized when creating new session
 * - Fund-based winner determination (team with more total funds wins)
 * - Draw mechanism: equal funds = 100% refund to all users
 * - Fee distribution: 2.5% house, 0.5% finalizer, 97% winners (no fees on draw)
 */
contract TarikTambangOnchain {
    enum Team {
        None,
        TeamA,
        TeamB
    }

    struct Session {
        uint256 sessionId;
        uint256 startTime;      // Aligned to hour boundary
        uint256 endTime;        // startTime + 1 hour
        uint256 totalTeamA;
        uint256 totalTeamB;
        uint256 houseFunds;     // Accumulated house fees
        uint256 finalizerReward; // Reward for finalizer
        Team winner;
        address finalizer;      // Who triggered finalization
        bool finalized;
    }

    address public immutable owner;
    uint256 public currentSessionId;
    uint256 public totalHouseFunds; // Accumulated house funds across all sessions
    
    // Constants
    uint256 public constant SESSION_DURATION = 1 hours;
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant HOUSE_FEE_PERCENT = 250;      // 2.5% (basis points)
    uint256 public constant FINALIZER_FEE_PERCENT = 50;   // 0.5% (basis points)
    uint256 public constant BASIS_POINTS = 10000;         // 100%
    
    // Session storage
    mapping(uint256 => Session) public sessions;
    
    // Session-specific user data
    mapping(uint256 => mapping(address => uint256)) public teamABets;
    mapping(uint256 => mapping(address => uint256)) public teamBBets;
    mapping(uint256 => mapping(address => Team)) public userTeam;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // Reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    event SessionCreated(uint256 indexed sessionId, uint256 startTime, uint256 endTime);
    event BetPlaced(uint256 indexed sessionId, address indexed user, Team team, uint256 amount);
    event SessionFinalized(uint256 indexed sessionId, Team winner, uint256 totalPot, address finalizer);
    event Claimed(uint256 indexed sessionId, address indexed user, uint256 amount, bool isWinner);
    event HouseFundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrancy detected");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Bet on Team A for current session
     * @dev Automatically creates new session if needed
     */
    function betOnTeamA() external payable {
        _ensureCurrentSession();
        _placeBet(currentSessionId, Team.TeamA);
    }

    /**
     * @notice Bet on Team B for current session
     * @dev Automatically creates new session if needed
     */
    function betOnTeamB() external payable {
        _ensureCurrentSession();
        _placeBet(currentSessionId, Team.TeamB);
    }

    /**
     * @notice Claim rewards or refund for a finalized session
     * @param sessionId The session to claim from
     */
    function claim(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        
        require(session.finalized, "Session not finalized");
        require(!hasClaimed[sessionId][msg.sender], "Already claimed");
        
        Team userBetTeam = userTeam[sessionId][msg.sender];
        require(userBetTeam != Team.None, "No bet placed");
        
        hasClaimed[sessionId][msg.sender] = true;
        
        uint256 userBet;
        uint256 reward;
        
        // Handle draw scenario (100% refund)
        if (session.winner == Team.None) {
            // Draw: refund user's original bet
            if (userBetTeam == Team.TeamA) {
                userBet = teamABets[sessionId][msg.sender];
            } else {
                userBet = teamBBets[sessionId][msg.sender];
            }
            
            require(userBet > 0, "No bet placed");
            reward = userBet; // 100% refund
            
            (bool success, ) = msg.sender.call{value: reward}("");
            require(success, "Transfer failed");
            
            emit Claimed(sessionId, msg.sender, reward, false); // false = refund, not win
        } else {
            // Win scenario: proportional distribution
            require(userBetTeam == session.winner, "Not on winning team");
            
            uint256 winningTotal;
            
            if (session.winner == Team.TeamA) {
                userBet = teamABets[sessionId][msg.sender];
                winningTotal = session.totalTeamA;
            } else {
                userBet = teamBBets[sessionId][msg.sender];
                winningTotal = session.totalTeamB;
            }
            
            require(userBet > 0, "No bet on winning team");
            require(winningTotal > 0, "No winning bets"); // Prevent division by zero
            
            // Calculate winner pot (total - house fee - finalizer reward)
            uint256 totalPot = session.totalTeamA + session.totalTeamB;
            uint256 winnerPot = totalPot - session.houseFunds - session.finalizerReward;
            
            // Proportional reward
            reward = (userBet * winnerPot) / winningTotal;
            
            (bool success, ) = msg.sender.call{value: reward}("");
            require(success, "Transfer failed");
            
            emit Claimed(sessionId, msg.sender, reward, true); // true = winner
        }
    }

    /**
     * @notice Owner withdraws accumulated house funds
     */
    function withdrawHouseFunds() external onlyOwner nonReentrant {
        uint256 amount = totalHouseFunds;
        require(amount > 0, "No funds to withdraw");
        
        totalHouseFunds = 0;
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit HouseFundsWithdrawn(owner, amount);
    }

    /**
     * @notice Get current active session
     * @return Session details of the current session
     */
    function getCurrentSession() external view returns (Session memory) {
        require(currentSessionId > 0, "No session created");
        return sessions[currentSessionId];
    }

    /**
     * @notice Get session details by ID
     * @param sessionId The session ID to query
     * @return Session details
     */
    function getSession(uint256 sessionId) external view returns (Session memory) {
        require(sessions[sessionId].sessionId != 0, "Session does not exist");
        return sessions[sessionId];
    }

    /**
     * @notice Get user's bet for a specific session
     * @param sessionId The session ID
     * @param user The user address
     * @return team The team the user bet on
     * @return amount The total amount bet
     */
    function getUserBet(uint256 sessionId, address user) external view returns (Team team, uint256 amount) {
        team = userTeam[sessionId][user];
        if (team == Team.TeamA) {
            amount = teamABets[sessionId][user];
        } else if (team == Team.TeamB) {
            amount = teamBBets[sessionId][user];
        }
    }

    /**
     * @notice Calculate potential reward for a user in a session
     * @param sessionId The session ID
     * @param user The user address
     * @return The reward amount (0 if not eligible)
     */
    function calculateReward(uint256 sessionId, address user) external view returns (uint256) {
        Session storage session = sessions[sessionId];
        
        if (!session.finalized) return 0;
        if (hasClaimed[sessionId][user]) return 0;
        
        Team userBetTeam = userTeam[sessionId][user];
        if (userBetTeam == Team.None) return 0;
        if (userBetTeam != session.winner) return 0;
        
        uint256 userBet;
        uint256 winningTotal;
        
        if (session.winner == Team.TeamA) {
            userBet = teamABets[sessionId][user];
            winningTotal = session.totalTeamA;
        } else {
            userBet = teamBBets[sessionId][user];
            winningTotal = session.totalTeamB;
        }
        
        if (userBet == 0 || winningTotal == 0) return 0;
        
        uint256 totalPot = session.totalTeamA + session.totalTeamB;
        uint256 winnerPot = totalPot - session.houseFunds - session.finalizerReward;
        
        return (userBet * winnerPot) / winningTotal;
    }

    /**
     * @notice Check if betting is currently open for current session
     * @return True if betting is open
     */
    function isBettingOpen() external view returns (bool) {
        if (currentSessionId == 0) return true; // Can create first session
        
        Session storage session = sessions[currentSessionId];
        return block.timestamp >= session.startTime && block.timestamp < session.endTime;
    }

    // Internal functions

    /**
     * @dev Ensure current session exists and is valid
     * Creates new session if needed, finalizes old session
     */
    function _ensureCurrentSession() internal {
        if (currentSessionId == 0) {
            // First session ever
            _createSession();
        } else {
            Session storage lastSession = sessions[currentSessionId];
            
            // Check if current session has ended
            if (block.timestamp >= lastSession.endTime) {
                // Finalize previous session if not already done
                if (!lastSession.finalized) {
                    _finalizeSession(currentSessionId);
                }
                // Create new session
                _createSession();
            }
        }
    }

    /**
     * @dev Create a new session aligned to current hour
     */
    function _createSession() internal {
        currentSessionId++;
        
        // Align to current hour boundary
        uint256 currentHour = (block.timestamp / SESSION_DURATION) * SESSION_DURATION;
        uint256 startTime = currentHour;
        uint256 endTime = startTime + SESSION_DURATION;
        
        sessions[currentSessionId] = Session({
            sessionId: currentSessionId,
            startTime: startTime,
            endTime: endTime,
            totalTeamA: 0,
            totalTeamB: 0,
            houseFunds: 0,
            finalizerReward: 0,
            winner: Team.None,
            finalizer: address(0),
            finalized: false
        });
        
        emit SessionCreated(currentSessionId, startTime, endTime);
    }

    /**
     * @dev Finalize a session - determine winner based on total funds
     * @param sessionId The session to finalize
     */
    function _finalizeSession(uint256 sessionId) internal {
        Session storage session = sessions[sessionId];
        
        require(!session.finalized, "Already finalized");
        require(block.timestamp >= session.endTime, "Session not ended");
        
        session.finalized = true;
        session.finalizer = msg.sender;
        
        uint256 totalPot = session.totalTeamA + session.totalTeamB;
        
        // Handle empty session
        if (totalPot == 0) {
            emit SessionFinalized(sessionId, Team.None, 0, msg.sender);
            return;
        }
        
        // Determine winner based on total funds
        Team winner;
        if (session.totalTeamA > session.totalTeamB) {
            winner = Team.TeamA;
        } else if (session.totalTeamB > session.totalTeamA) {
            winner = Team.TeamB;
        } else {
            // Draw: equal funds
            winner = Team.None;
        }
        
        session.winner = winner;
        
        // Handle draw scenario (no fees, 100% refund)
        if (winner == Team.None) {
            // No fees on draw
            session.houseFunds = 0;
            session.finalizerReward = 0;
            emit SessionFinalized(sessionId, Team.None, totalPot, msg.sender);
            return;
        }
        
        // Win scenario: calculate and distribute fees
        uint256 houseFee = (totalPot * HOUSE_FEE_PERCENT) / BASIS_POINTS;
        uint256 finalizerFee = (totalPot * FINALIZER_FEE_PERCENT) / BASIS_POINTS;
        
        session.houseFunds = houseFee;
        session.finalizerReward = finalizerFee;
        totalHouseFunds += houseFee;
        
        // Transfer finalizer reward immediately
        (bool success, ) = msg.sender.call{value: finalizerFee}("");
        require(success, "Finalizer reward transfer failed");
        
        emit SessionFinalized(sessionId, session.winner, totalPot, msg.sender);
    }

    /**
     * @dev Internal function to handle bet placement
     */
    function _placeBet(uint256 sessionId, Team team) private {
        Session storage session = sessions[sessionId];
        
        require(session.sessionId != 0, "Session does not exist");
        require(block.timestamp >= session.startTime, "Betting not started");
        require(block.timestamp < session.endTime, "Betting ended");
        require(msg.value >= MIN_BET, "Bet below minimum");
        
        Team currentTeam = userTeam[sessionId][msg.sender];
        
        if (team == Team.TeamA) {
            require(currentTeam != Team.TeamB, "Already bet on Team B");
            teamABets[sessionId][msg.sender] += msg.value;
            session.totalTeamA += msg.value;
        } else {
            require(currentTeam != Team.TeamA, "Already bet on Team A");
            teamBBets[sessionId][msg.sender] += msg.value;
            session.totalTeamB += msg.value;
        }
        
        if (currentTeam == Team.None) {
            userTeam[sessionId][msg.sender] = team;
        }
        
        emit BetPlaced(sessionId, msg.sender, team, msg.value);
    }


}
