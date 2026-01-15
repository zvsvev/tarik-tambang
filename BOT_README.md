# TarikTambang Auto-Bet Bot 🤖

**"Automated On-chain Strategy Manager"**

Bot ini adalah script off-chain berbasis Node.js yang bertugas menjaga aktivitas permainan agar tetap hidup dengan melakukan taruhan secara otomatis mengacu pada aturan yang ditetapkan di Blockchain.

---

## 📍 AutoBetManager Details

- **Manager Contract Address**: [`0x07b8e3c89bd7d27b6df5dc06919282e786c2e466`](https://sepolia.basescan.org/address/0x07b8e3c89bd7d27b6df5dc06919282e786c2e466)
- **Fungsi Utama**: Menyimpan konfigurasi strategi bot secara on-chain agar transparan dan dapat dikendalikan jarak jauh.

---

## 🚀 Alur Kerja AutoBetManager.sol

Contract Manager bertindak sebagai "Pusat Kendali" bagi bot. Alur kerjanya adalah sebagai berikut:

1.  **Konfigurasi On-Chain**: Pemilik bot memasukkan parameter strategi ke dalam dApps/Explorer melalui fungsi `configureBotConfig`. Parameter meliputi:
    - `min/maxBet`: Batas nominal taruhan.
    - `frequency`: Jeda waktu antar taruhan (dalam detik).
    - `teamAWeight`: Preferensi tim (misal 70% arah Team A).
2.  **Health Check**: Bot di VPS akan melakukan request ke Manager setiap kali akan beraksi untuk mengecek fungsi `isBotActive`. Jika admin mematikan bot via blockchain, bot di VPS akan otomatis berhenti (pause).
3.  **Dynamic Updates**: Jika admin merubah frekuensi taruhan di Blockchain, bot akan langsung menyesuaikan perilakunya tanpa perlu restart script di server.
4.  **Multi-Bot Support**: Contract dirancang untuk bisa menangani banyak operator bot sekaligus dengan konfigurasi yang unik untuk masing-masing wallet.

---

## 🛠 Panduan Setup Bot di VPS

### 1. Prasyarat
- Node.js v18+
- Akun Base Sepolia dengan saldo ETH.

### 2. Instalasi
```bash
git clone https://github.com/zvsvev/tarik-tambang.git
cd tarik-tambang
cp bot-package.json package.json
npm install
sudo npm install -g pm2
```

### 3. Konfigurasi (`.env`)
Buat file `.env` dan isi dengan alamat contract yang sudah dideploy:
```env
RPC_URL=https://base-sepolia.drpc.org
BOT_PRIVATE_KEY=your_private_key
GAME_CONTRACT_ADDRESS=0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd
MANAGER_CONTRACT_ADDRESS=0x07b8e3c89bd7d27b6df5dc06919282e786c2e466
```

### 4. Menjalankan Bot
Gunakan PM2 agar bot berjalan 24/7 di background:
```bash
pm2 start autoBet.js --name "tariktambang-bot"
pm2 save
pm2 startup
```

---

## 📊 Monitoring
Anda dapat memantau aktivitas bot secara real-time melalui:
- **PM2 Logs**: `pm2 logs tariktambang-bot`
- **Block Explorer**: Cek transaksi keluar pada wallet bot Anda di BaseScan.

---

**Note**: Bot ini dirancang untuk tujuan edukasi dan penjagaan likuiditas game dalam ekosistem TarikTambang Onchain.
