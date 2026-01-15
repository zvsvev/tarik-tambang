# TarikTambang Auto-Bet Bot

**"Automated On-chain Strategy Manager"**

Bot ini adalah script off-chain berbasis Node.js yang berfungsi sebagai Liquidity Provider otomatis. Bot ini sangat krusial untuk memastikan ekosistem TarikTambang tetap hidup dengan melakukan transaksi taruhan secara otomatis berdasarkan aturan yang ditetapkan di Blockchain.

---
![](assets/bot-1)
## Mengapa Menggunakan Bot Ini?

Dalam sistem permainan berbasis waktu (Hourly Sessions) seperti TarikTambang Onchain, ada risiko terjadinya "Empty Sessions". Berikut adalah alasan utama mengapa bot ini diimplementasikan:

1.  **Mencegah Sesi Kosong**: Untuk menjamin game selalu berjalan di setiap jam, bot bertindak sebagai partisipan aktif yang memastikan selalu ada taruhan (minimal) di kedua tim, sehingga pemain asli selalu memiliki kompetisi.
2.  **Menjamin Kelangsungan Sesi (Lazy Trigger)**: Karena sistem dari TarikTambang Onchain ini menggunakan *Lazy Session Creation*, sesi baru hanya akan terbuat jika ada taruhan masuk. Bot memastikan transisi antar sesi terjadi tepat waktu tanpa menunggu pemain manual.
3.  **Memancing Aktivitas User**: Secara psikologis, user lebih tertarik bermain jika sudah ada volume dana di dalam pot. Bot berfungsi untuk memunculkan ketertarikan pemain asli dengan mengisi awal modal di setiap sesi.

---

## AutoBetManager Details

- **Manager Contract Address**: <a href="https://sepolia.basescan.org/address/0x07b8e3c89bd7d27b6df5dc06919282e786c2e466" target="_blank">0x07b8e3c89bd7d27b6df5dc06919282e786c2e466</a>
- **Fungsi Utama**: Menyimpan konfigurasi strategi bot secara on-chain agar transparan dan dapat dikendalikan jarak jauh.
![](assets/bot-2)
---

## Alur Kerja AutoBetManager.sol

Contract Manager bertindak sebagai "Pusat Kendali" bagi bot. Alur kerjanya adalah sebagai berikut:

1.  **Konfigurasi On-Chain**: Pemilik bot memasukkan parameter strategi ke dalam dApps/Explorer melalui fungsi `configureBotConfig`. Parameter meliputi:
    - `min/maxBet`: Batas nominal taruhan.
    - `frequency`: Jeda waktu antar taruhan (dalam detik).
    - `teamAWeight`: Preferensi tim (misal 70% arah Team A).
2.  **Health Check**: Bot akan melakukan request ke Manager setiap kali akan beraksi untuk mengecek fungsi `isBotActive`. Jika admin mematikan bot via blockchain, bot akan otomatis berhenti (pause).
3.  **Dynamic Updates**: Jika admin merubah frekuensi taruhan di Blockchain, bot akan langsung menyesuaikan perilakunya tanpa perlu restart script di server.
4.  **Multi-Bot Support**: Contract dirancang untuk bisa menangani banyak operator bot sekaligus dengan konfigurasi yang unik untuk masing-masing wallet.

---

## Mekanisme Staggered Betting (Anti-Spike)

Bot ini menggunakan logika **Staggered Execution** untuk menyebar transaksi agar tidak terjadi penumpukan (spike) gas fee dan terlihat lebih organik:

1.  **Cycle System**: Bot bekerja dalam siklus waktu (misal: setiap 60 menit). 
2.  **Random Window**: Di setiap awal siklus, bot menghitung waktu acak untuk setiap wallet di dalam jendela **10 menit**.
3.  **Spread Execution**: Transaksi tidak dikirim bersamaan, melainkan menyebar secara otomatis.
    *   *Contoh*: 
        *   Wallet 1: kirim tx di menit ke-2.
        *   Wallet 2: kirim tx di menit ke-5.
        *   Wallet 3: kirim tx di menit ke-8.
4.  **Min Bet**: Sesuai aturan kontrak, setiap taruhan wajib minimal **0.0001 ETH**.

---

## Panduan Setup Bot

### 1. Prasyarat
- Node.js v18.x (LTS) atau versi yang lebih tinggi.
- Smart Contract Access: Akun dengan saldo ETH yang memadai di jaringan Base Sepolia.
- Process Manager: Disarankan menggunakan PM2 (Process Manager 2) untuk memastikan persistensi proses, monitoring logs, dan pemulihan otomatis (auto-restart).
- **Infrastruktur Deployment (Pilihan):**
    - Remote Server (Recommended): Virtual Private Server (VPS) berbasis Linux untuk menjamin stabilitas dan uptime sistem 24/7. Dalam proyek ini, saya menggunakan droplet DigitalOcean dengan spesifikasi Ubuntu 24.04 (LTS) x64, 1 GB Memory / 25 GB Disk.
    - Local Machine: Perangkat lokal (macOS/Linux/Windows) 

### 2. Instalasi
```bash
git clone https://github.com/zvsvev/tarik-tambang.git
cd tarik-tambang
cp bot-package.json package.json
npm install
sudo npm install -g pm2
```

### 3. Konfigurasi (`.env`)
Buat file `.env` dan isi dengan detail berikut. Bot mendukung **Multi-Wallet** untuk menciptakan efek kompetisi antara Team A dan Team B secara otomatis.

```env
RPC_URL=https://base-sepolia.drpc.org
# Masukkan satu atau lebih private key dipisahkan dengan tanda koma (,)
BOT_PRIVATE_KEY=pk_wallet_1,pk_wallet_2,pk_wallet_3
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

## Monitoring
Aktivitas bot dapat dipantau secara real-time melalui:
- **PM2 Logs**: `pm2 logs tariktambang-bot`
- **Block Explorer**: Cek transaksi keluar pada wallet bot di <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd" target="_blank">BaseScan</a>

---

**Note**: Bot ini dirancang untuk tujuan edukasi dan penjagaan liquidity game dalam ekosistem TarikTambang Onchain.
