require('dotenv').config();
const { ethers } = require('ethers');
const cron = require('node-cron');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;
const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;
const MANAGER_CONTRACT_ADDRESS = process.env.MANAGER_CONTRACT_ADDRESS;

// Game Contract ABI (minimal)
const GAME_ABI = [
    'function betOnTeamA() external payable',
    'function betOnTeamB() external payable',
    'function currentSessionId() external view returns (uint256)',
    'function isBettingOpen() external view returns (bool)',
    'function getUserBet(uint256 sessionId, address user) external view returns (uint8 team, uint256 amount)',
];

// Manager Contract ABI (minimal)
const MANAGER_ABI = [
    'function getBotConfig(address) external view returns (tuple(uint256 minBetAmount, uint256 maxBetAmount, uint256 betFrequency, bool isActive, uint8 teamAWeight, uint256 lastUpdated))',
    'function isBotActive(address) external view returns (bool)',
];

// Validate environment variables
if (!BOT_PRIVATE_KEY) {
    console.error('❌ BOT_PRIVATE_KEY not set in .env file');
    process.exit(1);
}

if (!GAME_CONTRACT_ADDRESS) {
    console.error('❌ GAME_CONTRACT_ADDRESS not set in .env file');
    process.exit(1);
}

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_ABI, wallet);
const managerContract = MANAGER_CONTRACT_ADDRESS ? new ethers.Contract(MANAGER_CONTRACT_ADDRESS, MANAGER_ABI, wallet) : null;

let lastRunTime = 0;
let isExecuting = false;

console.log('🤖 TarikTambang Auto-Bet Bot (Enhanced) Started');
console.log('📍 Game Contract:', GAME_CONTRACT_ADDRESS);
if (MANAGER_CONTRACT_ADDRESS) {
    console.log('⚙️  Manager Contract:', MANAGER_CONTRACT_ADDRESS);
} else {
    console.log('⚠️  Manager Contract not set, using default local settings');
}
console.log('🔑 Bot Wallet:', wallet.address);
console.log('---');

let lastRunTime = 0;

/**
 * Get bot configuration (On-chain if manager exists, otherwise local defaults)
 */
async function getBotConfig() {
    if (managerContract) {
        try {
            const config = await managerContract.getBotConfig(wallet.address);
            // If bit 0, it means not yet configured on-chain
            if (config.minBetAmount === 0n) throw new Error("Not configured on-chain");

            return {
                minBet: config.minBetAmount,
                maxBet: config.maxBetAmount,
                frequency: Number(config.betFrequency),
                isActive: config.isActive,
                teamAWeight: Number(config.teamAWeight),
            };
        } catch (error) {
            console.log('ℹ️  Using default settings (not configured on-chain or error)');
        }
    }

    // Default local settings
    return {
        minBet: ethers.parseEther('0.0001'),
        maxBet: ethers.parseEther('0.001'),
        frequency: 600, // 10 minutes
        isActive: true,
        teamAWeight: 50,
    };
}

/**
 * Place a bet
 */
async function placeBet() {
    try {
        const config = await getBotConfig();

        if (!config.isActive) {
            console.log('⏸️  Bot is inactive (config.isActive = false)');
            return;
        }

        // Check if betting is open
        const isOpen = await gameContract.isBettingOpen();
        if (!isOpen) {
            console.log('⏸️  Betting not open, skipping...');
            return;
        }

        const sessionId = await gameContract.currentSessionId();

        // Check if bot already committed to a team in this session
        const [currentTeamInt] = await gameContract.getUserBet(sessionId, wallet.address);
        let team;

        if (currentTeamInt === 1) { // 1 = TeamA
            team = 'TeamA';
            console.log(`ℹ️ Bot already bet on TeamA this session. Continuing...`);
        } else if (currentTeamInt === 2) { // 2 = TeamB
            team = 'TeamB';
            console.log(`ℹ️ Bot already bet on TeamB this session. Continuing...`);
        } else {
            // First bet of the session: pick random team based on weight
            const randomVal = Math.random() * 100;
            team = randomVal < config.teamAWeight ? 'TeamA' : 'TeamB';
            console.log(`🎲 First bet of session: Picking ${team} (Weight: ${config.teamAWeight}%)`);
        }

        // Random amount between min and max
        const minEth = parseFloat(ethers.formatEther(config.minBet));
        const maxEth = parseFloat(ethers.formatEther(config.maxBet));
        const randomAmount = minEth + Math.random() * (maxEth - minEth);
        const betAmount = ethers.parseEther(randomAmount.toFixed(6));

        console.log(`🎲 Betting on ${team} (Weight: ${config.teamAWeight}%)`);
        console.log(`💰 Amount: ${randomAmount.toFixed(6)} ETH`);
        console.log(`📊 Session: ${sessionId}`);

        let tx;
        if (team === 'TeamA') {
            tx = await gameContract.betOnTeamA({ value: betAmount });
        } else {
            tx = await gameContract.betOnTeamB({ value: betAmount });
        }

        console.log(`📤 Tx Sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
        console.log('---');

    } catch (error) {
        console.error('❌ Error placing bet:', error.message);
        console.log('---');
    }
}

/**
 * Check balance
 */
async function checkBalance() {
    try {
        const balance = await provider.getBalance(wallet.address);
        console.log(`💼 Bot Balance: ${ethers.formatEther(balance)} ETH`);
        console.log('---');
    } catch (error) {
        console.log('⚠️  Could not check balance');
    }
}

/**
 * Main loop logic
 */
async function runBot() {
    if (isExecuting) {
        console.log('⏳ Bot is already executing a transaction, skipping this cycle...');
        return;
    }

    const now = Date.now();
    const config = await getBotConfig();

    // Check if enough time has passed based on frequency
    if (now - lastRunTime >= config.frequency * 1000) {
        isExecuting = true;
        try {
            console.log(`⏰ [${new Date().toLocaleString()}] Cycle Start`);
            await checkBalance();
            await placeBet();
            lastRunTime = now;
        } finally {
            isExecuting = false;
        }
    }
}

// Initial run
runBot();

// Check every minute if it should run
cron.schedule('* * * * *', runBot);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});
