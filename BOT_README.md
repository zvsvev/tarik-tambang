# TarikTambang Auto-Bet Bot

**TarikTambang - Pull Together, Win Together**

Automated betting bot to prevent empty sessions in TarikTambang Onchain.

## Features

- 🎲 Random team selection (50/50 Team A vs Team B)
- 💰 Random bet amounts (0.0001 - 0.001 ETH)
- ⏰ Runs every 10-15 minutes (randomized timing)
- 🔄 Auto-retry on errors
- 💼 Balance monitoring

## Setup

### 1. Install Dependencies

```bash
cd src/v2
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
RPC_URL=https://sepolia.base.org
BOT_PRIVATE_KEY=your_bot_wallet_private_key
CONTRACT_ADDRESS=0x...deployed_contract_address
```

⚠️ **IMPORTANT:** 
- Create a **NEW wallet** for the bot (don't use your main wallet)
- Keep the private key **SECRET**
- Fund the bot wallet with ETH for gas + betting

### 3. Fund Bot Wallet

The bot needs ETH for:
- Gas fees (~$0.10 per bet on Base)
- Bet amounts (0.0001 - 0.001 ETH per bet)

**Recommended funding:**
- Testnet: 0.1 ETH (enough for ~100 bets)
- Mainnet: 0.5 ETH (enough for ~50 bets + gas)

### 4. Run Bot

**Development (with auto-restart):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Background (using PM2):**
```bash
npm install -g pm2
pm2 start autoBet.js --name tariktambang-bot
pm2 save
pm2 startup
```

## Monitoring

Check bot status:
```bash
pm2 status
pm2 logs tariktambang-bot
```

Stop bot:
```bash
pm2 stop tariktambang-bot
```

## Configuration

Edit `autoBet.js` to customize:

- **Bet frequency:** Line 124 - `cron.schedule('*/10 * * * *', ...)`
  - `*/10` = every 10 minutes
  - Change to `*/5` for every 5 minutes
  
- **Bet amount range:** Lines 58-60
  ```javascript
  const minBet = 0.0001;
  const maxBet = 0.001;
  ```

- **Random delay:** Line 126
  ```javascript
  const delayMinutes = Math.floor(Math.random() * 5); // 0-5 minutes
  ```

## Troubleshooting

**Error: "BOT_PRIVATE_KEY not set"**
- Make sure `.env` file exists in `src/v2/` folder
- Check that `BOT_PRIVATE_KEY` is set correctly

**Error: "insufficient funds"**
- Bot wallet needs more ETH
- Send ETH to bot wallet address

**Error: "Betting not open"**
- Normal - bot skips when betting window is closed
- Wait for next session

**Bot not running:**
```bash
# Check if process is running
pm2 status

# Restart bot
pm2 restart tariktambang-bot

# View logs
pm2 logs tariktambang-bot --lines 100
```

## Security Notes

🔒 **NEVER commit `.env` file to git!**

The `.env` file is already in `.gitignore`, but double-check:
```bash
git status
# Should NOT show .env file
```

🔑 **Generate a new wallet for the bot:**
```javascript
// In Node.js console:
const ethers = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
```

## Cost Estimation

**Base Sepolia (Testnet):**
- Gas: FREE (testnet ETH)
- Bets: ~0.0005 ETH average × 6 bets/hour = 0.003 ETH/hour
- Daily: ~0.072 ETH

**Base Mainnet:**
- Gas: ~$0.10 per bet
- Bets: ~$1.25 average × 6 bets/hour = $7.50/hour
- Daily: ~$180 (but bot can win back some!)

## For UGM Blockchain Club Presentation

When presenting, explain:

1. **Why bot is needed:** Smart contracts can't auto-execute, need external trigger
2. **How it works:** Node.js cron job that calls contract functions
3. **Randomness:** Random team + amount to simulate real users
4. **Cost-effective:** Simple solution vs expensive Chainlink Automation

**Demo:**
```bash
# Show bot running
npm start

# Show logs in real-time
# Bot will place bets every 10-15 minutes
```

---

**TarikTambang - Pull Together, Win Together** 🎯
