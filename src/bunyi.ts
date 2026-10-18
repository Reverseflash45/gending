/**
 * Sintesis bunyi gamelan dengan Web Audio, tanpa rekaman. Semua ricikan adalah jumlah gelombang sinus
 * (sintesis aditif) dengan selubung peluruhan; pasangan osilator yang sedikit berbeda frekuensinya memberi
 * "ombak", getaran pelan yang khas pada gamelan.
 */

export type Ricik = "saron" | "demung" | "peking" | "kenong" | "kempul" | "gong" | "kethuk";

export class Gamelan {
  readonly ctx: AudioContext;
  private keluar: GainNode;
  private basah: GainNode;
  private derau: AudioBuffer;
  volume = 0.8;

  constructor() {
    this.ctx = new AudioContext();
    const pemampat = this.ctx.createDynamicsCompressor();
    pemampat.threshold.value = -14;
    pemampat.ratio.value = 4;
    this.keluar = this.ctx.createGain();
    this.keluar.gain.value = this.volume;
    // Gaung ruang pendapa: tanggapan impuls sintetis dari derau yang meluruh.
    const gaung = this.ctx.createConvolver();
    gaung.buffer = this.impuls(2.2, 2.6);
    this.basah = this.ctx.createGain();
    this.basah.gain.value = 0.22;
    this.keluar.connect(pemampat);
    this.keluar.connect(gaung).connect(this.basah).connect(pemampat);
    pemampat.connect(this.ctx.destination);
    this.derau = this.bufferDerau(0.08);
  }

  setVolume(v: number) {
    this.volume = v;
    this.keluar.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  async mulai() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  private impuls(detik: number, peluruhan: number): AudioBuffer {
    const n = Math.floor(this.ctx.sampleRate * detik);
    const b = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** peluruhan;
    }
    return b;
  }

  private bufferDerau(detik: number): AudioBuffer {
    const n = Math.floor(this.ctx.sampleRate * detik);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /** Satu parsial sinus dengan selubung serang-luruh eksponensial. */
  private parsial(f: number, t: number, amp: number, luruh: number, serang = 0.003, geser = 0) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f, t);
    if (geser) o.frequency.exponentialRampToValueAtTime(f * (1 + geser), t + Math.min(1.2, luruh));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + serang);
    g.gain.exponentialRampToValueAtTime(0.0001, t + serang + luruh);
    o.connect(g).connect(this.keluar);
    o.start(t);
    o.stop(t + serang + luruh + 0.05);
  }

  /** Bunyi "tak" pemukul: derau singkat yang disaring di sekitar frekuensi tertentu. */
  private pukul(f: number, t: number, amp: number, lama = 0.03) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.derau;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = f;
    filter.Q.value = 1.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    s.connect(filter).connect(g).connect(this.keluar);
    s.start(t);
    s.stop(t + lama + 0.01);
  }

  /** Bilah logam (saron, demung, peking). Parsial bilah bebas: 1 : 2,76 : 5,40. */
  private bilah(f: number, t: number, kuat: number, luruh: number, terang: number) {
    const parsial: [number, number, number][] = [
      [1, 1, 1],
      [2.76, 0.32 * terang, 0.45],
      [5.4, 0.12 * terang, 0.25],
    ];
    for (const [r, a, l] of parsial) {
      this.parsial(f * r, t, kuat * a, luruh * l);
      // Kembaran sedikit lebih tinggi (sekitar 4 sen) memberi ombak.
      this.parsial(f * r * 1.0024, t, kuat * a * 0.5, luruh * l);
    }
    this.pukul(f * 3, t, kuat * 0.25);
  }

  /** Gong berpencu: frekuensi dasar kuat, parsial lemah, ombak pelan, dan nada yang sedikit turun. */
  private pencu(f: number, t: number, kuat: number, luruh: number, ombak: number) {
    this.parsial(f, t, kuat, luruh, 0.01, -0.006);
    this.parsial(f + ombak, t, kuat * 0.8, luruh, 0.01, -0.006);
    this.parsial(f * 2.01, t, kuat * 0.18, luruh * 0.45, 0.01);
    this.parsial(f * 2.98, t, kuat * 0.08, luruh * 0.3, 0.01);
    this.pukul(f * 2, t, kuat * 0.12, 0.05);
  }

  main(ricik: Ricik, f: number, t: number = this.ctx.currentTime, kuat = 1) {
    switch (ricik) {
      case "saron":
        return this.bilah(f, t, 0.16 * kuat, 1.4, 1);
      case "demung":
        return this.bilah(f / 2, t, 0.16 * kuat, 2.2, 0.7);
      case "peking":
        return this.bilah(f * 2, t, 0.07 * kuat, 0.7, 1.2);
      case "kenong":
        return this.pencu(f, t, 0.15 * kuat, 2.4, 2.2);
      case "kempul":
        return this.pencu(f / 2, t, 0.17 * kuat, 3.2, 1.4);
      case "gong":
        // Gong ageng: sekitar 45 Hz, dengung lebih dari enam detik.
        this.pencu(45, t, 0.42 * kuat, 6.5, 0.9);
        return this.parsial(90.6, t, 0.08 * kuat, 4);
      case "kethuk":
        // Dipukul lalu langsung diredam: bunyi "tuk" yang sangat pendek.
        this.parsial(f / 2, t, 0.14 * kuat, 0.12, 0.002);
        return this.pukul(f, t, 0.12 * kuat, 0.04);
    }
  }
}
