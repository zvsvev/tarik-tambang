# TarikTambang Onchain

**"Pull Together, Win Together"**

TarikTambang Onchain adalah smart contract betting game berbasis waktu yang berjalan di jaringan Base (Sepolia Testnet). Game ini mensimulasikan kompetisi "Tarik Tambang" secara on-chain di mana pemenang ditentukan bukan oleh keberuntungan (random), melainkan oleh kekuatan modal tim (fund-based).

---

## Contract Details

- **Smart Contract Address**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd" target="_blank">0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd</a>
- **Block Explorer**: <a href="https://sepolia.basescan.org/address/0xc1bbd48cbb7c56da60c0077a1e9d081794ab3edd#readContract" target="_blank">BaseScan Sepolia</a>

---

## Alur Kerja TarikTambang Onchain

Game ini dirancang dengan mekanisme **Hourly Aligned Sessions** dan **Lazy Execution**.

1.  **Sesi Terpusat pada Jam**: Setiap sesi berlangsung tepat selama 1 jam dan sejajar dengan waktu dunia (misal: 09:00 - 10:00, 10:00 - 11:00).
2.  **Lazy Session Creation**: Sesi baru tidak dibuat oleh timer otomatis (untuk menghemat gas). Sesi baru akan otomatis terbuat ketika ada user pertama yang memasang bet setelah sesi sebelumnya berakhir.
3.  **Auto-Finalization**: Saat sesi baru dibuat, sistem akan otomatis melakukan "Finalisasi" pada sesi sebelumnya untuk menentukan pemenang.
4.  **Penentuan Pemenang (Fund-Based)**:
    - **Team A Menang**: Jika Total Dana Team A > Total Dana Team B.
    - **Team B Menang**: Jika Total Dana Team B > Total Dana Team A.
    - **Draw (Seri)**: Jika Total Dana Team A == Total Dana Team B.
5.  **Mekanisme Claim & Refund**: User harus memanggil fungsi `claim` secara manual untuk mengambil haknya setelah sesi difinalisasi.

---

## Pendekatan Solusi & Pembagian Hadiah

Kami memilih pendekatan **"Transparent Shared Pot"** untuk memastikan keadilan bagi seluruh pemain.

### Pembagian Hadiah (Jika Ada Pemenang)
Jika salah satu tim menang, total pot (gabungan dana Team A + Team B) akan dibagikan dengan aturan:
- **97% untuk Pemenang**: Dibagikan secara proporsional kepada semua user di tim pemenang.
- **2.5% House Fee**: Dikumpulkan untuk pemilik contract (Admin).
- **0.5% Finalizer Reward**: Diberikan kepada address yang melakukan tx finalisasi sesi.

**Rumus Proposional:**
`Hadiah User = (Bet User / Total Taruhan Tim Pemenang) * (Total Pot * 97%)`

### Penanganan Kondisi Seri (Draw)
Jika terjadi seri, sistem **tidak memungut fee apapun**.
- **100% Refund**: Semua user dari Team A dan Team B dapat mengklaim kembali dana mereka secara utuh (100%) tanpa potongan biaya admin atau finalizer. Ini memberikan rasa aman bagi pemain saat kompetisi berjalan seimbang.

---

## 📄 Lisensi
Distributed under the MIT License. See `LICENSE` for more information.
