require('dotenv').config();
const { ethers } = require('ethers');
const cron = require('node-cron');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Contract ABI (minimal - only functions we need)
const CONTRACT_ABI = [
    'function betOnTeamA() external payable',
    'function betOnTeamB() external payable',
    'function currentSessionId() external view returns (uint256)',
    'function isBettingOpen() external view returns (bool)',
];

// Validate environment variables
if (!BOT_PRIVATE_KEY) {
    console.error('❌ BOT_PRIVATE_KEY not set in .env file');
    process.exit(1);
}

if (!CONTRACT_ADDRESS) {
    console.error('❌ CONTRACT_ADDRESS not set in .env file');
    process.exit(1);
}

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

console.log('🤖 TugBet Auto-Bet Bot Started');
console.log('📍 Contract:', CONTRACT_ADDRESS);
console.log('🔑 Bot Wallet:', wallet.address);
console.log('⏰ Running every 10-15 minutes (randomized)');
console.log('---');

/**
 * Place a random bet
 */
async function placeBet() {
    try {
        // Check if betting is open
        const isOpen = await contract.isBettingOpen();
        if (!isOpen) {
            console.log('⏸️  Betting not open, skipping...');
            return;
        }

        // Get current session
        const sessionId = await contract.currentSessionId();

        // Random team (50/50)
        const randomTeam = Math.random() > 0.5 ? 'TeamA' : 'TeamB';

        // Random amount between 0.0001 and 0.001 ETH
        const minBet = 0.0001;
        const maxBet = 0.001;
        const randomAmount = minBet + Math.random() * (maxBet - minBet);
        const betAmount = ethers.parseEther(randomAmount.toFixed(4));

        console.log(`🎲 Placing bet on ${randomTeam}`);
        console.log(`💰 Amount: ${randomAmount.toFixed(4)} ETH`);
        console.log(`📊 Session: ${sessionId}`);

        // Place bet
        let tx;
        if (randomTeam === 'TeamA') {
            tx = await contract.betOnTeamA({ value: betAmount });
        } else {
            tx = await contract.betOnTeamB({ value: betAmount });
        }

        console.log(`📤 Transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Bet confirmed in block ${receipt.blockNumber}`);
        console.log('---');

    } catch (error) {
        console.error('❌ Error placing bet:', error.message);
        console.log('---');
    }
}

/**
 * Check wallet balance
 */
async function checkBalance() {
    try {
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);

        console.log(`💼 Bot Balance: ${balanceInEth} ETH`);

        if (parseFloat(balanceInEth) < 0.01) {
            console.warn('⚠️  WARNING: Bot balance is low! Please top up.');
        }

        console.log('---');
    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
    }
}

/**
 * Main bot loop
 */
async function runBot() {
    console.log(`⏰ [${new Date().toLocaleString()}] Running bot...`);

    await checkBalance();
    await placeBet();
}

// Run immediately on start
runBot();

// Schedule random bets every 10-15 minutes
// Using multiple cron jobs with random delays
cron.schedule('*/10 * * * *', async () => {
    // Random delay 0-5 minutes
    const delayMinutes = Math.floor(Math.random() * 5);
    const delayMs = delayMinutes * 60 * 1000;

    setTimeout(() => {
        runBot();
    }, delayMs);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Bot shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Bot shutting down...');
    process.exit(0);
});
