# TarikTambang Onchain 🚩

**"Pull Together, Win Together"**

TarikTambang Onchain adalah smart contract betting game revolusioner di jaringan Base yang menggabungkan transparansi blockchain dengan mekanik kompetisi tim. Berbeda dengan platform judi tradisional yang mengandalkan algoritma random (RNG), game ini sepenuhnya ditentukan oleh **kekuatan modal kolektif** para pemainnya.

---

## 📍 Infromasi Contract

- **Smart Contract Address**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd" target="_blank">0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd</a>
- **Network**: Base Sepolia (Testnet)
- **Block Explorer**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd#code" target="_blank">BaseScan Sepolia</a>

---

## 🛠 Penjelasan Teknis & Alur Kerja

Smart contract ini (`TarikTambangOnchain.sol`) dirancang untuk efisiensi gas dan keteraturan waktu. Berikut adalah bedah tuntas alur kerjanya:

### 1. Mekanisme Penyelarasan Waktu (Hourly Alignment)
Sistem tidak menggunakan interval waktu acak, melainkan menyinkronkan setiap sesi dengan jam dunia (jam dinding).
- **Logika Kode**: Menggunakan formula `(block.timestamp / 1 hours) * 1 hours`.
- **Hasil**: Jika seorang user memasang bet pada pukul 14:25, sistem akan secara matematis menarik garis awal sesi pada 14:00 dan berakhir pada 15:00. Ini memastikan jadwal game sangat terprediksi.

### 2. Pola Eksekusi "Lazy" (Lazy Execution)
Untuk menghemat biaya operasional, smart contract tidak melakukan finalisasi sesi sendiri (karena smart contract tidak bisa berjalan sendiri tanpa dipicu).
- **Alur**: Ketika user pertama memasang bet di jam baru, fungsi `_ensureCurrentSession()` akan dipanggil.
- **Tugas**: Fungsi ini secara otomatis memeriksa apakah sesi sebelumnya sudah berakhir. Jika ya, ia akan menjalankan fungsi `_finalizeSession()` untuk sesi lama dan sekaligus membuka `_createSession()` untuk jam yang baru.

### 3. Logika Penentuan Pemenang (Fund-Based)
Inilah inti dari TarikTambang. Pemenang ditentukan murni dari perbandingan total dana di kedua tim:
- **Winning Condition**: `totalTeamA > totalTeamB` maka Team A Menang.
- **Draw Condition**: `totalTeamA == totalTeamB` maka status menjadi Draw.
Sistem ini menghilangkan resiko manipulasi angka acak.

### 4. Matematika Pembagian Hadiah (Proportional Reward)
Pembagian hadiah dilakukan dengan prinsip keadilan proporsional terhadap kontribusi masing-masing user.

#### Skenario Ada Pemenang:
Total Pot dipotong biaya operasional terlebih dahulu:
- **Pemenang Pot**: 97% dari total pot.
- **House Fee**: 2.5% (untuk biaya maintenance/admin).
- **Finalizer Reward**: 0.5% (insentif bagi siapapun—user atau bot—yang memicu penutupan sesi).

**Rumus:** `reward = (Bet_User * Winner_Pot) / Total_Dana_Tim_Pemenang`

#### Skenario Draw (Seri):
Sebagai bentuk perlindungan terhadap user, saat terjadi seri:
- **No Fees**: Tidak ada biaya admin atau finalizer yang diambil.
- **100% Refund**: Semua dana dikembalikan utuh ke seluruh pengirim.

---

## 🤖 Bot Likuiditas & Pencegahan Sesi Kosong
Kami menggunakan bot otomatis untuk menjaga game tetap hidup 24/7. Bot ini berfungsi untuk:
1. **Memicu Transisi**: Memastikan sesi baru selalu terbuat tepat di awal jam.
2. **Menyediakan Likuiditas**: Mencegah sesi kosong agar pemain asli selalu memiliki lawan untuk bertanding.
3. **Pusat Kendali**: Menggunakan `AutoBetManager.sol` agar strategi bot bisa dipantau dan diatur secara on-chain.

- **Detail Bot**: [Baca Dokumentasi Strategi Bot (BOT_README.md)](BOT_README.md)

---

## 💻 Panduan Instalasi & Pengembangan

### Prasyarat
- Foundry / Forge
- Base Sepolia RPC

### Kompilasi & Test
```bash
# Compile contracts
forge build

# Run tests
forge test -vv
```

### Deployment (Script)
```bash
forge script script/DeployTarikTambang.s.sol:DeployTarikTambang --rpc-url <RPC_URL> --broadcast --verify
```

---

## 📄 Karakteristik Utama Solusi
- **Permissionless**: Siapapun bisa memicu finalisasi dan mendapatkan reward 0.5%.
- **Secure**: Menggunakan `ReentrancyGuard` untuk mencegah serangan double-withdraw.
- **Transparent**: Semua perhitungan hadiah dilakukan secara terbuka di atas blockchain (Open Source).

Developed for **UGM Blockchain Club Assignment**. 🚀🎯
