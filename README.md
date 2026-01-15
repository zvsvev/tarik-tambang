# TarikTambang Onchain

**TarikTambang - Pull Together, Win Together**

Hourly blockchain betting game with time-based aligned sessions and automated features.

## 🎯 Key Features

### Smart Contract Improvements
- ✅ **Time-Based Aligned Sessions:** Sessions align to hourly boundaries (09:00, 10:00, 11:00, etc.)
- ✅ **Lazy Auto-Create:** New session automatically created when user bets after previous session ends
- ✅ **Auto-Finalize:** Previous session automatically finalized when creating new session
- ✅ **Fund-Based Winner:** Team with higher total funds wins (true tug-of-war!)
- ✅ **Draw Mechanism:** Equal funds = 100% refund to all users
- ✅ **Fee Distribution:** 2.5% house fee, 0.5% finalizer reward, 97% to winners (no fees on draw)
- ✅ **Minimum Bet:** 0.0001 ETH to prevent spam

### Bot Features
- 🤖 **Auto-Bet Bot:** Prevents empty sessions with random bets
- 🎲 **Random Strategy:** Random team selection and bet amounts
- ⏰ **Scheduled Betting:** Runs every 10-15 minutes

## 📊 Architecture

### Session Flow

```
09:00 ──────────────── 10:00 ──────────────── 11:00
  │                       │                       │
  │   Session 1          │   Session 2          │   Session 3
  │   (Betting)          │   (Betting)          │   (Betting)
  │                       │                       │
  └─ User bet at 09:30   └─ User bet at 10:15   └─ User bet at 11:05
     (creates session)      (auto-finalizes S1,    (auto-finalizes S2,
                             creates S2)            creates S3)
```

### Fee Distribution

```
Total Pot: 100 ETH
├─ House Fee (2.5%): 2.5 ETH → Owner
├─ Finalizer Reward (0.5%): 0.5 ETH → User who triggers finalize
└─ Winner Pot (97%): 97 ETH → Distributed proportionally to winners
```

### Winner Determination

```
Finalization Logic:
├─ Total Team A > Total Team B → Team A Wins
├─ Total Team B > Total Team A → Team B Wins
└─ Total Team A == Total Team B → Draw (100% Refund)

Fee Distribution:
├─ Win Scenario:
│   ├─ House Fee (2.5%): To Owner
│   ├─ Finalizer Reward (0.5%): To Finalizer
│   └─ Winner Pot (97%): Distributed proportionally to winners
│
└─ Draw Scenario:
    └─ No Fees: 100% refund to all participants
```

## 🚀 Deployment

### 1. Compile Contract

```bash
forge build
```

### 2. Deploy to Testnet (Base Sepolia)

```bash
forge script script/DeployTarikTambangOnchain.s.sol:DeployTarikTambangOnchain \
    --rpc-url $BASE_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify
```

### 3. Deploy to Mainnet (Base)

```bash
forge script script/DeployTarikTambangOnchain.s.sol:DeployTarikTambangOnchain \
    --rpc-url $BASE_MAINNET_RPC \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify
```

### 4. Setup Bot

See [bot/README.md](../../bot/README.md) for bot setup instructions.

## 🧪 Testing

### Run All Tests

```bash
forge test --match-contract TarikTambangOnchainTest -vvv
```

### Run Specific Tests

```bash
# Test session alignment
forge test --match-test testSessionAlignment -vvv

# Test auto-finalize
forge test --match-test testAutoFinalize -vvv

# Test random winner
forge test --match-test testRandomnessVariation -vvv

# Test fee distribution
forge test --match-test testFeeDistribution -vvv
```

### Test Coverage

```bash
forge coverage --match-contract TarikTambangOnchainTest
```

## 📖 Usage

### For Users

**1. Place a Bet:**

```solidity
// Bet on Team A
contract.betOnTeamA{value: 0.01 ether}();

// Bet on Team B
contract.betOnTeamB{value: 0.01 ether}();
```

**2. Check Current Session:**

```solidity
Session memory session = contract.getCurrentSession();
// session.startTime - when betting started
// session.endTime - when betting ends
// session.totalTeamA - total bets on Team A
// session.totalTeamB - total bets on Team B
```

**3. Claim Winnings:**

```solidity
// After session is finalized
contract.claim(sessionId);
```

### For Owner

**Withdraw House Funds:**

```solidity
contract.withdrawHouseFunds();
```

## 🎮 Game Rules

### Betting
- Minimum bet: **0.0001 ETH**
- Can bet multiple times on the **same team**
- **Cannot switch teams** after first bet
- Betting window: **1 hour** (aligned to hour boundaries)

### Winning
- Winner determined by **total funds comparison**
- Team with **more total bets wins** (true tug-of-war!)
- **Draw possible**: If both teams have equal total funds
- Winners receive **97% of total pot** (proportional to their bet)
- Finalizer receives **0.5%** as reward
- House receives **2.5%** as fee

### Draw Scenario
- If `Total Team A == Total Team B`
- **No fees charged**
- All users can claim **100% refund** of their original bet
- Fair outcome when teams are perfectly balanced

### Edge Cases

**Empty Session:**
- If no bets placed, session is skipped (no finalization)

**One-Sided Bet:**
- If only one team has bets, that team automatically wins
- Winners receive 97% of pot (their own bets minus fees)

## 🔒 Security

### Reentrancy Protection
- `nonReentrant` modifier on all fund transfer functions
- Pull payment pattern (users claim, not pushed)

### Randomness
- Pseudo-random using `block.prevrandao`
- Sufficient for game purposes
- Cannot be manipulated by users (determined at finalization)

### Access Control
- Only owner can withdraw house funds
- Session creation/finalization is permissionless

## 📝 Contract Interface

### Write Functions

```solidity
function betOnTeamA() external payable
function betOnTeamB() external payable
function claim(uint256 sessionId) external
function withdrawHouseFunds() external onlyOwner
```

### Read Functions

```solidity
function getCurrentSession() external view returns (Session memory)
function getSession(uint256 sessionId) external view returns (Session memory)
function getUserBet(uint256 sessionId, address user) external view returns (Team, uint256)
function calculateReward(uint256 sessionId, address user) external view returns (uint256)
function isBettingOpen() external view returns (bool)
```

## 🆚 Differences from V1

| Feature | V1 (MultiSession) | V2 (New) |
|---------|-------------------|----------|
| Session Creation | Manual (owner only) | Auto (lazy, user-triggered) |
| Session Timing | Manual start time | Aligned to hour boundaries |
| Finalization | Manual call | Auto when creating new session |
| Winner Selection | Total bet amount | Fund-based comparison |
| Draw Scenario | Yes (refund) | Yes (100% refund) |
| Finalizer Reward | No | 0.5% of pot |
| House Fee | No | 2.5% of pot |

## 🎓 For UGM Blockchain Club

### Key Learning Points

1. **Blockchain Limitations:**
   - Smart contracts cannot auto-execute
   - Need external trigger (user transaction or bot)
   - Lazy evaluation pattern

2. **Time Management:**
   - `block.timestamp` for time-based logic
   - Alignment to hour boundaries
   - Session lifecycle management

3. **Winner Determination:**
   - Fund-based comparison logic
   - Team with higher total wins
   - Draw handling (equal funds)

4. **Fee Economics:**
   - Incentivize finalizers (gas compensation)
   - House fee for sustainability
   - Proportional reward distribution

5. **Off-Chain Components:**
   - Bot for automation
   - Node.js + ethers.js integration
   - Cron scheduling

### Presentation Tips

**Demo Flow:**
1. Show contract deployment
2. Explain time-based alignment
3. Place bets from multiple accounts
4. Show auto-finalize when new session starts
5. Demonstrate random winner selection
6. Show bot running in background
7. Claim winnings

**Questions to Prepare:**
- Why can't smart contracts auto-execute?
- How does pseudo-random work?
- What happens if no one bets?
- How is the bot different from Chainlink Automation?

## 📄 License

MIT
