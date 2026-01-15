require('dotenv').config();
const { ethers } = require('ethers');
const cron = require('node-cron');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const BOT_PRIVATE_KEYS = process.env.BOT_PRIVATE_KEY.split(',').map(key => key.trim()); // Support comma-separated keys
const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;
const MANAGER_CONTRACT_ADDRESS = process.env.MANAGER_CONTRACT_ADDRESS;

// Game Contract ABI (minimal)
const GAME_ABI = [
    'function betOnTeamA() external payable',
    'function betOnTeamB() external payable',
    'function currentSessionId() external view returns (uint256)',
    'function isBettingOpen() external view returns (bool)',
    'function getUserBet(uint256 sessionId, address user) external view returns (uint8 team, uint256 amount)',
    'function sessions(uint256) external view returns (uint256 sessionId, uint256 startTime, uint256 endTime, uint256 totalTeamA, uint256 totalTeamB, uint256 houseFunds, uint256 finalizerReward, uint8 winner, address finalizer, bool finalized)',
];

// Manager Contract ABI (minimal)
const MANAGER_ABI = [
    'function getBotConfig(address) external view returns (tuple(uint256 minBetAmount, uint256 maxBetAmount, uint256 betFrequency, bool isActive, uint8 teamAWeight, uint256 lastUpdated))',
    'function isBotActive(address) external view returns (bool)',
];

// Validate environment variables
if (!BOT_PRIVATE_KEYS[0]) {
    console.error('❌ BOT_PRIVATE_KEY not set in .env file');
    process.exit(1);
}

if (!GAME_CONTRACT_ADDRESS) {
    console.error('❌ GAME_CONTRACT_ADDRESS not set in .env file');
    process.exit(1);
}

// Setup provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

console.log('🤖 TarikTambang Multi-Wallet Bot Started');
console.log(`👥 Managed Wallets: ${BOT_PRIVATE_KEYS.length}`);
console.log('📍 Game Contract:', GAME_CONTRACT_ADDRESS);
console.log('---');

let lastRunTime = 0;
let isExecuting = false;

/**
 * Get bot configuration (On-chain if manager exists, otherwise local defaults)
 */
async function getBotConfig(walletAddress) {
    if (MANAGER_CONTRACT_ADDRESS) {
        try {
            const managerContract = new ethers.Contract(MANAGER_CONTRACT_ADDRESS, MANAGER_ABI, provider);
            const config = await managerContract.getBotConfig(walletAddress);
            if (config.minBetAmount === 0n) throw new Error("Not configured");

            return {
                minBet: config.minBetAmount,
                maxBet: config.maxBetAmount,
                frequency: Number(config.betFrequency),
                isActive: config.isActive,
                teamAWeight: Number(config.teamAWeight),
            };
        } catch (error) {
            // Silence manager errors
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
 * Place a bet for a specific wallet
 */
async function placeBetForWallet(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_ABI, wallet);
        const config = await getBotConfig(wallet.address);

        if (!config.isActive) return;

        // Check if betting is open OR if it's time to trigger a new session
        const isOpen = await gameContract.isBettingOpen();
        const sessionId = await gameContract.currentSessionId();

        let shouldTriggerNew = false;
        if (sessionId > 0) {
            const sessionData = await gameContract.sessions(sessionId);
            const endTime = Number(sessionData.endTime);
            if (Date.now() / 1000 >= endTime) {
                shouldTriggerNew = true;
                console.log(`⏰ [${wallet.address.substring(0, 6)}] Time to trigger new session!`);
            }
        }

        if (!isOpen && !shouldTriggerNew) {
            console.log(`⏸️ [${wallet.address.substring(0, 6)}] Betting closed.`);
            return;
        }

        // Check if wallet already committed to a team
        // Only check if we are NOT triggering a new session
        let currentTeamInt = 0;
        if (!shouldTriggerNew) {
            const result = await gameContract.getUserBet(sessionId, wallet.address);
            currentTeamInt = Number(result[0]);
        }
        let team;

        if (currentTeamInt === 1) {
            team = 'TeamA';
        } else if (currentTeamInt === 2) {
            team = 'TeamB';
        } else {
            // First bet: pick random team
            const randomVal = Math.random() * 100;
            team = randomVal < config.teamAWeight ? 'TeamA' : 'TeamB';
        }

        // Random amount between min and max
        const minEth = parseFloat(ethers.formatEther(config.minBet));
        const maxEth = parseFloat(ethers.formatEther(config.maxBet));
        const randomAmount = minEth + Math.random() * (maxEth - minEth);
        const betAmount = ethers.parseEther(randomAmount.toFixed(6));

        console.log(`🎲 [${wallet.address.substring(0, 6)}] Betting on ${team} (${randomAmount.toFixed(6)} ETH)`);

        let tx;
        if (team === 'TeamA') {
            tx = await gameContract.betOnTeamA({ value: betAmount });
        } else {
            tx = await gameContract.betOnTeamB({ value: betAmount });
        }
        await tx.wait();
        console.log(`✅ Transaction Done: ${tx.hash}`);

    } catch (error) {
        console.error(`❌ Error for wallet:`, error.message);
    }
}

/**
 * Main cycle for all wallets
 */
async function runBot() {
    if (isExecuting) return;

    const now = Date.now();
    // Use first wallet's frequency as master frequency (or you can customize)
    const config = await getBotConfig(new ethers.Wallet(BOT_PRIVATE_KEYS[0], provider).address);

    if (now - lastRunTime >= config.frequency * 1000) {
        isExecuting = true;
        console.log(`⏰ [${new Date().toLocaleString()}] Starting Multi-Wallet Cycle...`);

        try {
            for (const key of BOT_PRIVATE_KEYS) {
                await placeBetForWallet(key);
                // Slight delay between wallets to avoid nonce issues if using same wallet (not the case here but good practice)
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            lastRunTime = now;
        } finally {
            isExecuting = false;
            console.log('--- Cycle Finished ---');
        }
    }
}

// Initial run
runBot();

// Check every minute
cron.schedule('* * * * *', runBot);

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});
