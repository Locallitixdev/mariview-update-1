# 📦 Mariview Data Storage Guide

## ✅ Apa yang Sudah Tersimpan

Sistem Mariview sekarang **menyimpan semua perubahan data secara otomatis** menggunakan **localStorage** browser.

### Data yang Disimpan:
- ✅ **Missions** - Semua mission yang dibuat/edit
- ✅ **Drones** - Data UAV & AUV assets
- ✅ **Vehicles** - Mobil operasional
- ✅ **Accessories** - Peralatan pendukung
- ✅ **Flights** - Riwayat flight data
- ✅ **Settings** - Konfigurasi aplikasi

## 🔄 Cara Kerja

### Auto-Save
Setiap kali Anda:
- ✅ Create mission baru
- ✅ Edit asset
- ✅ Delete data
- ✅ Update settings

**Data otomatis tersimpan** dan akan tetap ada setelah:
- ✅ Refresh page (F5)
- ✅ Close/reopen browser
- ✅ Restart komputer

### Notifikasi
Indikator "Data tersimpan" muncul di pojok kanan bawah setiap kali ada perubahan.

## 💾 Backup & Restore

### Export Data (Backup)
1. Buka **Settings** → Tab **Data**
2. Klik tombol **Export**
3. File JSON akan terdownload dengan format: `mariview-backup-YYYY-MM-DD.json`

### Import Data (Restore)
1. Buka **Settings** → Tab **Data**
2. Klik tombol **Import**
3. Pilih file backup JSON
4. Data akan ter-restore dan page akan refresh otomatis

### Clear All Data (Reset)
⚠️ **HATI-HATI**: Tindakan ini akan menghapus SEMUA data!

1. Buka **Settings** → Tab **Data**
2. Klik tombol **Clear All**
3. Confirm action
4. Data akan reset ke default

## ⚠️ Batasan localStorage

### Pros:
- ✅ Otomatis tersimpan
- ✅ Tidak perlu backend/database
- ✅ Cepat & simple
- ✅ Gratis

### Cons:
- ❌ **Hanya tersimpan di device ini** (tidak sync antar device)
- ❌ **Terbatas kapasitas** (~5-10MB, cukup untuk ribuan records)
- ❌ **Bisa hilang jika clear browser data** (gunakan Export untuk backup!)
- ❌ **Tidak ada user authentication** (semua user lihat data yang sama di device yang sama)

## 🎯 Best Practices

### Regular Backup
- Export data secara berkala (misalnya setiap minggu)
- Simpan file backup di safe place (Google Drive, OneDrive, dll)

### Before Important Changes
- Export data sebelum melakukan perubahan besar
- Export sebelum clear browser data
- Export sebelum ganti browser/device

### Multi-Device Workflow
Jika bekerja di beberapa device:
1. Export data dari Device A
2. Import data ke Device B
3. Lakukan perubahan di Device B
4. Export data dari Device B
5. Import kembali ke Device A

## 🔮 Future: Supabase Integration

Untuk fitur yang lebih advanced:
- ☁️ Cloud database (PostgreSQL)
- 🔄 Real-time sync antar device
- 👥 Multi-user dengan authentication
- 🔒 Data security & backup otomatis
- 📊 Unlimited storage

*Hubungi developer untuk implementasi Supabase.*

---

**Created**: January 2026  
**System**: Mariview Drone Operations Management  
**Version**: 1.0.0
