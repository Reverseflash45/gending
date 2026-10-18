import { describe, expect, it } from "vitest";
import { BENTUK, CONTOH, NADA, frekuensi, genapkan, nadaTuju, ricikanPada, tulisBalungan, uraiBalungan } from "./teori";

describe("laras", () => {
  it("slendro lima nada, pelog tujuh nada", () => {
    expect(NADA.slendro).toEqual([1, 2, 3, 5, 6]);
    expect(NADA.pelog).toHaveLength(7);
  });

  it("tumbuk 6: nada 6 slendro dan pelog sama tinggi", () => {
    expect(frekuensi("pelog", 6)).toBeCloseTo(frekuensi("slendro", 6), 6);
  });

  it("oktaf menggandakan frekuensi", () => {
    expect(frekuensi("slendro", 1, 1)).toBeCloseTo(2 * frekuensi("slendro", 1), 6);
    expect(frekuensi("pelog", 5, -1)).toBeCloseTo(frekuensi("pelog", 5) / 2, 6);
  });

  it("nada naik berurutan di tiap laras", () => {
    for (const laras of ["slendro", "pelog"] as const) {
      const f = NADA[laras].map((n) => frekuensi(laras, n));
      for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
    }
  });
});

describe("notasi kepatihan", () => {
  it("mengurai angka, pin, dan tanda oktaf", () => {
    const { ketukan, galat } = uraiBalungan(".3.2 6,5'", "slendro");
    expect(galat).toEqual([]);
    expect(ketukan).toEqual([
      { nada: null, oktaf: 0 },
      { nada: 3, oktaf: 0 },
      { nada: null, oktaf: 0 },
      { nada: 2, oktaf: 0 },
      { nada: 6, oktaf: -1 },
      { nada: 5, oktaf: 1 },
    ]);
  });

  it("nada 4 dan 7 ditolak di slendro tetapi diterima di pelog", () => {
    expect(uraiBalungan("1247", "slendro").galat).toHaveLength(2);
    expect(uraiBalungan("1247", "pelog").galat).toHaveLength(0);
  });

  it("pemisah gatra diabaikan dan tulis-ulang mengelompokkan per empat", () => {
    const { ketukan } = uraiBalungan("2321|3216,\n2321", "pelog");
    expect(ketukan).toHaveLength(12);
    expect(tulisBalungan(ketukan)).toBe("2321 3216, 2321");
  });
});

describe("bentuk gending", () => {
  it("lancaran: t P t N per gatra, wela di ketukan 2, gong di 16", () => {
    expect(ricikanPada("lancaran", 1)).toEqual(["kethuk"]);
    expect(ricikanPada("lancaran", 2)).toEqual([]); // wela
    expect(ricikanPada("lancaran", 4)).toEqual(["kenong"]);
    expect(ricikanPada("lancaran", 6)).toEqual(["kempul"]);
    expect(ricikanPada("lancaran", 16)).toEqual(["gong", "kenong"]);
    expect(ricikanPada("lancaran", 17)).toEqual(["kethuk"]); // gongan berikutnya
  });

  it("ladrang: 32 ketukan, empat kenongan, tiga kempul", () => {
    const p = BENTUK.ladrang;
    expect(p.panjang).toBe(32);
    expect(p.kenong).toEqual([8, 16, 24, 32]);
    expect(p.kempul).toHaveLength(3);
    expect(p.kethuk).toEqual([2, 6, 10, 14, 18, 22, 26, 30]);
  });

  it("ketawang: dua kenongan dalam 16 ketukan", () => {
    expect(BENTUK.ketawang.kenong).toEqual([8, 16]);
    expect(ricikanPada("ketawang", 12)).toEqual(["kempul"]);
  });

  it("balungan digenapkan ke kelipatan satu gongan", () => {
    const { ketukan } = uraiBalungan("2321 3216", "pelog");
    expect(genapkan(ketukan, "lancaran")).toHaveLength(16);
    expect(genapkan(ketukan, "ladrang")).toHaveLength(32);
    expect(genapkan(uraiBalungan("1".repeat(20), "pelog").ketukan, "lancaran")).toHaveLength(32);
  });

  it("nada tuju melompati pin ke nada berikutnya, berputar ke awal", () => {
    const { ketukan } = uraiBalungan(".3.2", "slendro");
    expect(nadaTuju(ketukan, 0)?.nada).toBe(3);
    expect(nadaTuju(ketukan, 2)?.nada).toBe(2);
    expect(nadaTuju(uraiBalungan("1...", "slendro").ketukan, 1)?.nada).toBe(1);
  });

  it("semua contoh sah dan genap satu gongan atau lebih", () => {
    for (const c of CONTOH) {
      const { ketukan, galat } = uraiBalungan(c.balungan, c.laras);
      expect(galat).toEqual([]);
      expect(ketukan.length % BENTUK[c.bentuk].panjang).toBe(0);
    }
  });
});
