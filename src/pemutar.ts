import type { Gamelan, Ricik } from "./bunyi";
import { type Bentuk, type Ketukan, type Laras, frekuensi, nadaTuju, ricikanPada } from "./teori";

export type Lapisan = "saron" | "demung" | "peking" | "kolotomik";

/**
 * Penjadwal ketukan dengan pola "lihat ke depan": setiap 25 ms, ketukan yang jatuh dalam 120 ms ke depan
 * dijadwalkan pada jam audio, sehingga tempo tetap rapi walau tab sibuk. Tampilan diperbarui saat jam audio
 * benar-benar sampai di ketukan itu.
 */
export class Pemutar {
  ketukan: Ketukan[] = [];
  laras: Laras = "slendro";
  bentuk: Bentuk = "lancaran";
  tempo = 80;
  aktif: Record<Lapisan, boolean> = { saron: true, demung: true, peking: true, kolotomik: true };
  saatKetuk: (i: number) => void = () => {};

  private indeks = 0;
  private waktuBerikut = 0;
  private pewaktu = 0;
  private bingkai = 0;
  private antre: { i: number; t: number }[] = [];

  constructor(private g: Gamelan) {}

  get berjalan() {
    return this.pewaktu !== 0;
  }

  async mulai() {
    await this.g.mulai();
    if (this.berjalan || !this.ketukan.length) return;
    this.indeks = 0;
    this.waktuBerikut = this.g.ctx.currentTime + 0.12;
    this.pewaktu = window.setInterval(() => this.jadwal(), 25);
    this.jadwal();
    const gambar = () => {
      const kini = this.g.ctx.currentTime;
      while (this.antre.length && this.antre[0].t <= kini) this.saatKetuk(this.antre.shift()!.i);
      this.bingkai = requestAnimationFrame(gambar);
    };
    this.bingkai = requestAnimationFrame(gambar);
  }

  berhenti() {
    clearInterval(this.pewaktu);
    cancelAnimationFrame(this.bingkai);
    this.pewaktu = 0;
    this.antre = [];
  }

  /** Dipanggil saat balungan diubah sambil bermain: posisi tetap di dalam panjang yang baru. */
  ganti(k: Ketukan[]) {
    this.ketukan = k;
    if (this.indeks >= k.length) this.indeks = 0;
  }

  private jadwal() {
    const satu = 60 / this.tempo;
    while (this.waktuBerikut < this.g.ctx.currentTime + 0.12) {
      this.mainkan(this.indeks, this.waktuBerikut, satu);
      this.antre.push({ i: this.indeks, t: this.waktuBerikut });
      this.waktuBerikut += satu;
      this.indeks = (this.indeks + 1) % this.ketukan.length;
    }
  }

  private f(k: Ketukan) {
    return frekuensi(this.laras, k.nada!, k.oktaf);
  }

  /** Semua ricikan yang berbunyi pada ketukan ke-i. */
  private mainkan(i: number, t: number, satu: number) {
    const k = this.ketukan[i];
    const main = (r: Ricik, f: number, w = t, kuat = 1) => this.g.main(r, f, w, kuat);
    if (k.nada != null) {
      if (this.aktif.saron) main("saron", this.f(k));
      if (this.aktif.demung) main("demung", this.f(k));
    }
    // Peking menabuh nada yang dituju dua kali per ketukan (nacah), mendahului balungan.
    const tuju = nadaTuju(this.ketukan, i);
    if (this.aktif.peking && tuju) {
      main("peking", this.f(tuju), t, 0.9);
      main("peking", this.f(tuju), t + satu / 2, 0.7);
    }
    if (!this.aktif.kolotomik) return;
    const seleh = k.nada != null ? k : tuju;
    for (const r of ricikanPada(this.bentuk, i + 1)) {
      if (r === "gong") main("gong", 0);
      else if (r === "kethuk") main("kethuk", frekuensi(this.laras, 2, -1));
      else if (seleh) main(r, frekuensi(this.laras, seleh.nada!, 0));
    }
  }
}
