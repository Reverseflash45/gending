/** Teori dasar karawitan Jawa yang dipakai Gending: laras, notasi kepatihan, dan bentuk gending. */

export type Laras = "slendro" | "pelog";

/** Nada yang ada di tiap laras (slendro tidak punya 4 dan 7). */
export const NADA: Record<Laras, number[]> = {
  slendro: [1, 2, 3, 5, 6],
  pelog: [1, 2, 3, 4, 5, 6, 7],
};

/**
 * Jarak tiap nada dari nada 1 dalam sen (1 oktaf = 1200 sen). Ini rata-rata kasar: setiap perangkat gamelan
 * punya embat (penalaan) sendiri. Slendro dibuat hampir rata, pelog memakai jarak tak rata yang lazim dikutip.
 */
export const SEN: Record<Laras, Record<number, number>> = {
  slendro: { 1: 0, 2: 240, 3: 480, 5: 720, 6: 960 },
  pelog: { 1: 0, 2: 120, 3: 270, 4: 540, 5: 675, 6: 785, 7: 950 },
};

/** Frekuensi nada 1 slendro (oktaf tengah saron). */
export const DASAR_SLENDRO = 280;
/**
 * Pelog disetel "tumbuk 6": nada 6 kedua laras sama tinggi, seperti pada banyak perangkat gamelan Jawa.
 */
export const DASAR_PELOG = DASAR_SLENDRO * 2 ** ((SEN.slendro[6] - SEN.pelog[6]) / 1200);

export function frekuensi(laras: Laras, nada: number, oktaf = 0): number {
  const dasar = laras === "slendro" ? DASAR_SLENDRO : DASAR_PELOG;
  return dasar * 2 ** (SEN[laras][nada] / 1200 + oktaf);
}

/* ---------- notasi kepatihan ---------- */
/** Satu ketukan balungan: nada 1–7 atau null (pin, ditulis "."). Oktaf -1 bawah, 0 tengah, 1 atas. */
export type Ketukan = { nada: number | null; oktaf: number };

export type HasilUrai = { ketukan: Ketukan[]; galat: string[] };

/**
 * Mengurai balungan dalam notasi kepatihan versi papan ketik: angka 1–7, "." untuk pin,
 * tanda ' sesudah angka untuk oktaf atas dan , untuk oktaf bawah. Spasi, garis miring, dan baris baru
 * hanya pemisah gatra.
 */
export function uraiBalungan(teks: string, laras: Laras): HasilUrai {
  const ketukan: Ketukan[] = [];
  const galat: string[] = [];
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (/[\s|/]/.test(c)) continue;
    if (c === ".") {
      ketukan.push({ nada: null, oktaf: 0 });
      continue;
    }
    if (/[1-7]/.test(c)) {
      const nada = Number(c);
      let oktaf = 0;
      while (teks[i + 1] === "'" || teks[i + 1] === ",") {
        oktaf += teks[i + 1] === "'" ? 1 : -1;
        i++;
      }
      oktaf = Math.max(-1, Math.min(1, oktaf));
      if (!NADA[laras].includes(nada)) galat.push(`Nada ${nada} tidak ada di laras ${laras} (ketukan ke-${ketukan.length + 1}).`);
      ketukan.push({ nada: NADA[laras].includes(nada) ? nada : null, oktaf });
      continue;
    }
    galat.push(`Tanda "${c}" tidak dikenal, diabaikan.`);
  }
  return { ketukan, galat };
}

/** Kebalikan uraiBalungan: dikelompokkan per gatra (empat ketukan). */
export function tulisBalungan(k: Ketukan[]): string {
  const sel = k.map((x) => (x.nada == null ? "." : `${x.nada}${x.oktaf > 0 ? "'" : x.oktaf < 0 ? "," : ""}`));
  const gatra: string[] = [];
  for (let i = 0; i < sel.length; i += 4) gatra.push(sel.slice(i, i + 4).join(""));
  return gatra.join(" ");
}

/* ---------- bentuk gending (struktur kolotomik) ---------- */
export type Bentuk = "lancaran" | "ketawang" | "ladrang";
export type Ricikan = "gong" | "kenong" | "kempul" | "kethuk";

type Pola = { panjang: number; gong: number[]; kenong: number[]; kempul: number[]; kethuk: number[]; wela: number[] };

const kelipatan = (dari: number, langkah: number, sampai: number) => Array.from({ length: Math.floor((sampai - dari) / langkah) + 1 }, (_, i) => dari + i * langkah);

/**
 * Posisi ketukan (mulai dari 1) dalam satu gongan. Wela adalah tempat kempul sengaja tidak dibunyikan,
 * yaitu di frasa pertama sesudah gong.
 */
export const BENTUK: Record<Bentuk, Pola> = {
  lancaran: { panjang: 16, gong: [16], kenong: [4, 8, 12, 16], kempul: [6, 10, 14], wela: [2], kethuk: kelipatan(1, 2, 15) },
  ketawang: { panjang: 16, gong: [16], kenong: [8, 16], kempul: [12], wela: [4], kethuk: kelipatan(2, 4, 14) },
  ladrang: { panjang: 32, gong: [32], kenong: [8, 16, 24, 32], kempul: [12, 20, 28], wela: [4], kethuk: kelipatan(2, 4, 30) },
};

/** Ricikan kolotomik yang berbunyi pada ketukan ke-n (1 = ketukan pertama gongan). */
export function ricikanPada(bentuk: Bentuk, n: number): Ricikan[] {
  const p = BENTUK[bentuk];
  const posisi = ((n - 1) % p.panjang) + 1;
  const hasil: Ricikan[] = [];
  if (p.gong.includes(posisi)) hasil.push("gong");
  if (p.kenong.includes(posisi)) hasil.push("kenong");
  if (p.kempul.includes(posisi)) hasil.push("kempul");
  if (p.kethuk.includes(posisi)) hasil.push("kethuk");
  return hasil;
}

/** Balungan dipanjangkan dengan pin sampai genap satu gongan atau kelipatannya. */
export function genapkan(k: Ketukan[], bentuk: Bentuk): Ketukan[] {
  const p = BENTUK[bentuk].panjang;
  const n = Math.max(p, Math.ceil(k.length / p) * p);
  return [...k, ...Array.from({ length: n - k.length }, () => ({ nada: null, oktaf: 0 }))];
}

/** Nada yang "dituju" pada ketukan i: nada itu sendiri atau nada berikutnya yang berbunyi (dipakai peking dan kenong). */
export function nadaTuju(k: Ketukan[], i: number): Ketukan | null {
  for (let j = 0; j < k.length; j++) {
    const x = k[(i + j) % k.length];
    if (x.nada != null) return x;
  }
  return null;
}

/* ---------- contoh pola ---------- */
export type Contoh = { nama: string; laras: Laras; bentuk: Bentuk; balungan: string; tempo: number };

/** Pola latihan yang disusun untuk Gending, bukan gending tradisional. */
export const CONTOH: Contoh[] = [
  { nama: "Lancaran, slendro", laras: "slendro", bentuk: "lancaran", balungan: ".3.2 .3.2 .5.3 .2.1  .6,.1 .6,.5, .1.2 .1.6,", tempo: 96 },
  { nama: "Ketawang, pelog", laras: "pelog", bentuk: "ketawang", balungan: "2321 3216, 2321 6532  5653 2165 3561 6532", tempo: 64 },
  { nama: "Ladrang, slendro", laras: "slendro", bentuk: "ladrang", balungan: "2123 5321 3532 1653 6532 3165 1653 2126", tempo: 60 },
];
