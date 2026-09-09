# spelling.type

Aplikasi *Progressive Web App* (PWA) minimalis untuk melatih ejaan (*spelling*) bahasa Inggris, dirancang khusus dengan antarmuka modern bebas distraksi.

Proyek ini dibangun menggunakan 100% bantuan AI (Gemini 3.1 Pro). Saya bukan seorang *programmer*, tidak memiliki latar belakang *coding*, dan tidak familier dengan istilah *AI agent* atau *vibe coding*. Deskripsi ini pun ditulis dengan bantuan AI. Peran saya di sini murni sebagai pendefinisi masalah, perancang visi produk (UI/UX), dan penguji sistem, sementara AI bertindak sebagai penulis kodenya.

## Latar Belakang
Saya membuat aplikasi ini untuk diri saya sendiri. Meskipun saya memahami tata bahasa, memiliki kosakata yang luas, dan mampu berbicara bahasa Inggris dengan lancar, saya sebagai orang dewasa memiliki kendala yang sangat besar dalam hal menulis atau mengeja (*spelling*) sebuah kata. 

Saya merasa resah karena hampir semua aplikasi atau situs web belajar ejaan yang ada saat ini memiliki UI/UX yang terlihat jadul, kekanak-kanakan, tidak nyaman dipandang, dan ujung-ujungnya mengharuskan pengguna untuk berlangganan. Oleh karena itu, aplikasi ini lahir: 100% gratis, berfokus pada fungsi, dan dirancang khusus untuk orang Indonesia (seluruh antarmuka berbahasa Indonesia). Syukur jika ada orang lain yang memiliki kendala serupa dan terbantu dengan repositori ini.

## Fitur Utama
* **Antarmuka Ultraminimalis (Monkeytype-inspired):** Desain mode gelap (*dark mode*), tipografi monospasi, tanpa batas kotak (*borderless*), dan navigasi menu mengambang yang langsung merespons tanpa tombol muat ulang.
* **Algoritma Penguasaan Adaptif (Spaced Repetition):** Sistem mencatat akurasi setiap kata. Kata yang salah eja akan otomatis masuk ke kategori "⚡ Sulit" dan akan terus diulang hingga pengguna berhasil mengejanya dengan benar secara konsisten (persentase tuntas 100%).
* **Umpan Balik Multisensori (Zero-Latency):** 
  * **Audio:** Sintesis nada frekuensi tinggi (benar) dan rendah (salah) menggunakan *Web Audio API* murni tanpa memuat berkas .mp3 eksternal.
  * **Haptic:** Getaran mikroskopis saat mengetik benar, dan getaran ganda saat salah (*Vibration API*).
  * **Visual:** Mikro-animasi CSS berupa kilatan hijau (benar) atau guncangan layar ringan (salah).
* **Level Kustom & Bookmark:** Pengguna dapat membuat bank kata sendiri beserta terjemahannya, atau menandai kata tertentu dengan Bintang (⭐) untuk dilatih kembali.
* **100% Luring (Offline PWA):** Menggunakan *Service Worker*, aplikasi ini dapat diinstal ke layar utama (*Home Screen*) HP atau laptop dan berjalan sempurna tanpa koneksi internet. Semua data statistik tersimpan aman secara lokal di perangkat masing-masing (*localStorage*).

## Cara Penggunaan
Buka tautan GitHub Pages yang tersedia, pilih level bahasa (A1-C2) atau bank kata khusus di menu bagian atas, tentukan target jumlah kata, dan langsung ketik ejaan dari kata yang diucapkan. Gunakan tombol `Tab` untuk memutar ulang suara, dan `Enter` untuk mengevaluasi atau beralih ke kata selanjutnya.
