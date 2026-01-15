# TarikTambang Onchain

**"Pull Together, Win Together"**

TarikTambang Onchain adalah smart contract betting yang terinspirasi dari permainan tradisional tarik tambang, dideploy di jaringan Base (Sepolia Testnet) dengan menggabungkan transparansi blockchain dengan mekanik kompetisi tim. Berbeda dengan platform betting pada umumnya yang mengandalkan algoritma random (RNG), game ini sepenuhnya ditentukan oleh kekuatan modal kolektif para pemainnya.

---

## Informasi Contract

- **Smart Contract Address**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd" target="_blank">0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd</a>
- **Network**: Base Sepolia (Testnet)
- **Block Explorer**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd#code" target="_blank">BaseScan Sepolia</a>

---

## Penjelasan Teknis & Alur Kerja

Smart contract ini (`TarikTambangOnchain.sol`) dirancang untuk efisiensi gas dan keteraturan waktu. Berikut adalah alur kerjanya:

### 1. Mekanisme Penyelarasan Waktu (Hourly Alignment)
Sistem tidak menggunakan interval waktu acak, melainkan menyinkronkan setiap sesi dengan jam dunia (jam dinding).
- Menggunakan formula `(block.timestamp / 1 hours) * 1 hours`.
- Jika seorang user memasang bet pada pukul 14:25, sistem akan secara matematis menarik garis awal sesi pada 14:00 dan berakhir pada 15:00. Dengan sistem ini, jadwal game akan dapat lebih mudah terprediksi.

### 2. Pola Eksekusi "Lazy" (Lazy Execution)
Untuk menghemat biaya operasional, smart contract tidak melakukan finalisasi sesi sendiri (karena smart contract tidak bisa berjalan sendiri tanpa dipicu).
- Ketika user pertama memasang bet di jam baru, fungsi `_ensureCurrentSession()` akan dipanggil.
- Fungsi ini secara otomatis memeriksa apakah sesi sebelumnya sudah berakhir. Jika ya, ia akan menjalankan fungsi `_finalizeSession()` untuk sesi lama dan sekaligus membuka `_createSession()` untuk jam yang baru.

### 3. Logika Penentuan Pemenang (Fund-Based)
Ini adalah inti dari Game TarikTambang Onchain ini. Pemenang ditentukan berdasarkan hasil perbandingan total dana di kedua tim:
- **Winning Condition**: `totalTeamA > totalTeamB` maka Team A Menang.
- **Draw Condition**: `totalTeamA == totalTeamB` maka status menjadi Draw.

### 4. Proportional Reward
Sistem distribusi hadiah dirancang menggunakan metode Pro-rata, di mana total keuntungan (Total Pot yang telah dipotong fee) dibagikan kembali kepada para pemenang secara adil berdasarkan persentase kontribusi modal mereka di dalam tim.

#### Skenario Ada Pemenang:
Total Pot dipotong biaya operasional terlebih dahulu:
- **Pemenang Pot**: 97% dari total pot.
- **House Fee**: 2.5% (untuk biaya maintenance dan sumber revenue utama).
- **Finalizer Reward**: 0.5% (insentif bagi siapapun—user atau bot—yang melakukan tx penutupan sesi).

**Rumus:** `reward = (Bet_User * Winner_Pot) / Total_Dana_Tim_Pemenang`

#### Skenario Draw (Seri):
Sebagai bentuk perlindungan terhadap user, saat terjadi seri:
- **No Fees**: Tidak ada biaya admin (House) atau finalizer yang diambil dari dana user.
- **100% Refund**: Semua dana dikembalikan utuh ke seluruh pengirim.
- **Mekanisme "Pull-Based" Claim**: Refund dilakukan melalui fungsi klaim mandiri oleh user, **BUKAN melalui Airdrop otomatis**. 

**Mengapa menggunakan sistem Claim (Pull) bukannya Airdrop (Push)?**
Dalam pengembangan blockchain profesional, saya memilih pola *Pull-over-Push* karena beberapa alasan krusial:
1.  **Gas Efficiency**: Melakukan airdrop otomatis ke ratusan atau ribuan user dalam satu transaksi finalisasi akan memakan biaya gas yang sangat besar dan berisiko gagal karena melebihi *Block Gas Limit*.
2.  **Security (DOS Protection)**: Sistem airdrop otomatis rentan terhadap serangan DOS. Jika salah satu alamat penerima adalah smart contract yang dapat menolak transfer (`revert`), maka seluruh proses refund untuk semua user lain akan ikut terkunci dan gagal.
3.  **Cost Fairness**: User hanya membayar gas untuk transaksi mereka sendiri saat melakukan klaim.

User dapat memanggil fungsi `claim(sessionId)` kapan saja setelah sesi statusnya `finalized` dan `winner` adalah `None`.

---

## Bot Likuiditas & Pencegahan Sesi Kosong
Saya menggunakan bot otomatis untuk menjaga game tetap hidup 24/7. Bot ini berfungsi untuk:
1. **Memicu Transisi**: Memastikan sesi baru selalu terbuat tepat di awal jam.
2. **Menyediakan Likuiditas**: Mencegah sesi kosong agar pemain asli selalu memiliki lawan untuk bertanding.
3. **Pusat Kendali**: Menggunakan `AutoBetManager.sol` agar strategi bot bisa dipantau dan diatur secara on-chain.

- **Detail Bot**: [Baca Dokumentasi Bot (BOT_README.md)](BOT_README.md)

---


## Karakteristik Utama Solusi
- **Permissionless**: Siapapun bisa memicu finalisasi dan mendapatkan reward 0.5%.
- **Secure**: Menggunakan `ReentrancyGuard` untuk mencegah serangan double-withdraw.
- **Transparent**: Semua perhitungan hadiah dilakukan secara terbuka di atas blockchain (Open Source).
