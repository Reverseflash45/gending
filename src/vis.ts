import { BENTUK, type Bentuk, type Ketukan, type Laras, SEN, frekuensi, ricikanPada } from "./teori";

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/* ---------- saron ---------- */
export type Bilah = { nada: number; oktaf: number };

/** Susunan bilah saron barung: slendro 6̣ 1 2 3 5 6 1̇, pelog 1–7. */
export const BILAH: Record<Laras, Bilah[]> = {
  slendro: [
    { nada: 6, oktaf: -1 },
    { nada: 1, oktaf: 0 },
    { nada: 2, oktaf: 0 },
    { nada: 3, oktaf: 0 },
    { nada: 5, oktaf: 0 },
    { nada: 6, oktaf: 0 },
    { nada: 1, oktaf: 1 },
  ],
  pelog: [1, 2, 3, 4, 5, 6, 7].map((nada) => ({ nada, oktaf: 0 })),
};

/** Angka kepatihan dengan titik oktaf di atas atau di bawah. */
export const angkaHtml = (k: Ketukan | Bilah) =>
  k.nada == null ? `<span class="angka pin">.</span>` : `<span class="angka${k.oktaf > 0 ? " atas" : k.oktaf < 0 ? " bawah" : ""}">${k.nada}</span>`;

export function gambarSaron(wadah: HTMLElement, laras: Laras): void {
  const bilah = BILAH[laras];
  const f0 = frekuensi(laras, bilah[0].nada, bilah[0].oktaf);
  wadah.innerHTML = bilah
    .map((b, i) => {
      // Bilah lebih pendek untuk nada lebih tinggi (panjang sebanding akar frekuensi terbalik).
      const tinggi = Math.round(100 * Math.sqrt(f0 / frekuensi(laras, b.nada, b.oktaf)));
      return `<button type="button" class="bilah" data-i="${i}" style="--tinggi:${tinggi}%" aria-label="Nada ${b.nada}${b.oktaf > 0 ? " tinggi" : b.oktaf < 0 ? " rendah" : ""}"><span class="paku"></span>${angkaHtml(b)}<span class="paku"></span></button>`;
    })
    .join("");
}

/* ---------- lingkaran siklus gongan ---------- */
const URUT_RICIKAN = ["gong", "kenong", "kempul", "kethuk"] as const;
const JARI: Record<(typeof URUT_RICIKAN)[number], number> = { gong: 15, kenong: 9.5, kempul: 7, kethuk: 3.6 };

function titik(c: number, r: number, pos: number, n: number): [number, number] {
  const a = (2 * Math.PI * pos) / n - Math.PI / 2;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

/** Penanda ricikan di satu posisi: gong dan kenong yang bersamaan digambar bertumpuk. */
function penanda(bentuk: Bentuk, pos: number, x: number, y: number, skala = 1): string {
  const ada = ricikanPada(bentuk, pos);
  if (!ada.length) return `<circle class="kosong" cx="${x}" cy="${y}" r="${2 * skala}"/>`;
  return ada
    .slice()
    .sort((a, b) => JARI[b] - JARI[a])
    .map((r) => `<circle class="t-${r}" cx="${x}" cy="${y}" r="${JARI[r] * skala}"/>`)
    .join("");
}

export function gambarLingkar(wadah: HTMLElement, ketukan: Ketukan[], bentuk: Bentuk, gonganKe: number): void {
  const ukuran = Math.min(Math.max(280, wadah.clientWidth), 460);
  const c = ukuran / 2;
  const R = c - 46;
  const n = BENTUK[bentuk].panjang;
  const jumlahGongan = Math.max(1, Math.ceil(ketukan.length / n));
  const awal = gonganKe * n;
  const isi: string[] = [];
  for (let pos = 1; pos <= n; pos++) {
    const [x, y] = titik(c, R, pos, n);
    const [ax, ay] = titik(c, R + 27, pos, n);
    const k = ketukan[awal + pos - 1] ?? { nada: null, oktaf: 0 };
    isi.push(`<g class="pos" data-pos="${pos}">${penanda(bentuk, pos, x, y)}`);
    if (k.nada == null) isi.push(`<text class="digit pin" x="${ax}" y="${ay + 5}" text-anchor="middle">·</text>`);
    else {
      isi.push(`<text class="digit" x="${ax}" y="${ay + 6}" text-anchor="middle">${k.nada}</text>`);
      if (k.oktaf) isi.push(`<circle class="titik-oktaf" cx="${ax}" cy="${ay + (k.oktaf > 0 ? -11 : 11)}" r="1.8"/>`);
    }
    isi.push(`</g>`);
  }
  wadah.innerHTML = `<svg viewBox="0 0 ${ukuran} ${ukuran}" width="${ukuran}" height="${ukuran}">
    <circle class="cincin" cx="${c}" cy="${c}" r="${R}"/>
    <line class="jarum" x1="${c}" y1="${c}" x2="${c}" y2="${c - R}" data-jarum/>
    ${isi.join("")}
    <circle class="sorot-pos" r="20" cx="-50" cy="-50" data-sorot/>
    <text class="tengah-besar" x="${c}" y="${c - 2}" text-anchor="middle">${bentuk[0].toUpperCase() + bentuk.slice(1)}</text>
    <text class="tengah-kecil" x="${c}" y="${c + 20}" text-anchor="middle">${jumlahGongan > 1 ? `gongan ${gonganKe + 1} dari ${jumlahGongan}` : `${n} ketukan`}</text>
  </svg>`;
  wadah.setAttribute("aria-label", `Siklus ${bentuk}: ${n} ketukan per gongan, gong di ketukan ${n}, kenong di ketukan ${BENTUK[bentuk].kenong.join(", ")}.`);
  wadah.dataset.ukuran = String(ukuran);
}

/** Memindahkan jarum ke ketukan ke-i (indeks dalam seluruh balungan); null untuk menyembunyikan. */
export function sorotLingkar(wadah: HTMLElement, bentuk: Bentuk, i: number | null): void {
  const svg = wadah.querySelector("svg");
  if (!svg) return;
  const ukuran = Number(wadah.dataset.ukuran);
  const c = ukuran / 2;
  const R = c - 46;
  const n = BENTUK[bentuk].panjang;
  const jarum = svg.querySelector<SVGLineElement>("[data-jarum]")!;
  const sorot = svg.querySelector<SVGCircleElement>("[data-sorot]")!;
  if (i == null) {
    jarum.setAttribute("x2", String(c));
    jarum.setAttribute("y2", String(c - R));
    sorot.setAttribute("cx", "-50");
    return;
  }
  const pos = (i % n) + 1;
  const [x, y] = titik(c, R, pos, n);
  jarum.setAttribute("x2", String(x));
  jarum.setAttribute("y2", String(y));
  sorot.setAttribute("cx", String(x));
  sorot.setAttribute("cy", String(y));
  sorot.classList.remove("denyut");
  void sorot.getBoundingClientRect();
  sorot.classList.add("denyut");
}

/* ---------- notasi per gatra ---------- */
const HURUF: Record<string, string> = { gong: "G", kenong: "N", kempul: "P", kethuk: "t" };

export function gambarNotasi(wadah: HTMLElement, ketukan: Ketukan[], bentuk: Bentuk): void {
  const n = BENTUK[bentuk].panjang;
  const gongan: string[] = [];
  for (let g = 0; g * n < ketukan.length; g++) {
    const gatra: string[] = [];
    for (let a = 0; a < n; a += 4) {
      const sel = [0, 1, 2, 3].map((b) => {
        const i = g * n + a + b;
        const tanda = ricikanPada(bentuk, i + 1)
          .map((r) => `<b class="h-${r}">${HURUF[r]}</b>`)
          .join("");
        return `<span class="sel" data-i="${i}">${angkaHtml(ketukan[i])}<span class="tanda">${tanda || "&nbsp;"}</span></span>`;
      });
      gatra.push(`<span class="gatra">${sel.join("")}</span>`);
    }
    gongan.push(`<div class="gongan"><span class="label">Gongan ${g + 1}</span><div class="baris-gatra">${gatra.join("")}</div></div>`);
  }
  wadah.innerHTML = gongan.join("");
}

export function sorotNotasi(wadah: HTMLElement, i: number | null): void {
  wadah.querySelector(".sel.kini")?.classList.remove("kini");
  if (i != null) wadah.querySelector(`.sel[data-i="${i}"]`)?.classList.add("kini");
}

/* ---------- tiga bentuk, berdampingan ---------- */
export function gambarTigaBentuk(wadah: HTMLElement): void {
  const ukuran = 210;
  const c = ukuran / 2;
  const R = c - 22;
  wadah.innerHTML = (Object.keys(BENTUK) as Bentuk[])
    .map((bentuk) => {
      const p = BENTUK[bentuk];
      const isi: string[] = [];
      for (let pos = 1; pos <= p.panjang; pos++) {
        const [x, y] = titik(c, R, pos, p.panjang);
        isi.push(penanda(bentuk, pos, x, y, p.panjang > 16 ? 0.62 : 0.8));
      }
      return `<figure>
        <svg viewBox="0 0 ${ukuran} ${ukuran}" width="${ukuran}" height="${ukuran}" role="img" aria-label="${bentuk}: ${p.panjang} ketukan, ${p.kenong.length} kenong, ${p.kempul.length} kempul">
          <circle class="cincin" cx="${c}" cy="${c}" r="${R}"/>${isi.join("")}
          <text class="tengah-kecil" x="${c}" y="${c + 5}" text-anchor="middle">${p.panjang} ketukan</text>
        </svg>
        <figcaption><strong>${bentuk[0].toUpperCase() + bentuk.slice(1)}</strong>${p.kenong.length} kenong, ${p.kempul.length} kempul, ${p.kethuk.length} kethuk per gongan</figcaption>
      </figure>`;
    })
    .join("");
}

/* ---------- grafik laras ---------- */
const NAMA_PIANO = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function gambarLaras(wadah: HTMLElement, tabuh: (sen: number, laras: Laras | "piano") => void): void {
  const lebar = Math.max(300, wadah.clientWidth);
  const hp = lebar < 560;
  const m = { kiri: hp ? 64 : 92, kanan: 22 };
  const baris = 64;
  const tinggi = baris * 3 + 34;
  const x = (sen: number) => m.kiri + (sen / 1200) * (lebar - m.kiri - m.kanan);
  const y = (b: number) => 26 + b * baris;
  type Titik = { sen: number; label: string; laras: Laras | "piano"; baris: number; kecil?: boolean; atas?: boolean };
  const semua: Titik[] = [
    ...NAMA_PIANO.map((n, i) => ({ sen: i * 100, label: n, laras: "piano" as const, baris: 0, kecil: n.includes("♯") })),
    { sen: 1200, label: "C", laras: "piano", baris: 0 },
    ...Object.entries(SEN.slendro).map(([n, s]) => ({ sen: s, label: n, laras: "slendro" as const, baris: 1 })),
    { sen: 1200, label: "1", laras: "slendro", baris: 1, atas: true },
    ...Object.entries(SEN.pelog).map(([n, s]) => ({ sen: s, label: n, laras: "pelog" as const, baris: 2 })),
    { sen: 1200, label: "1", laras: "pelog", baris: 2, atas: true },
  ];
  const kisi = [0, 200, 400, 600, 800, 1000, 1200]
    .map((s) => `<line class="kisi" x1="${x(s)}" x2="${x(s)}" y1="${y(0) - 16}" y2="${y(2) + 16}"/><text class="sumbu" x="${x(s)}" y="${tinggi - 4}" text-anchor="${s === 1200 ? "end" : "middle"}">${s}${s === 1200 ? " sen" : ""}</text>`)
    .join("");
  const nama = ["Piano", "Slendro", "Pelog"]
    .map((n, b) => `<text class="nama-baris" x="${m.kiri - 16}" y="${y(b) + 5}" text-anchor="end">${n}</text><line class="garis-baris" x1="${m.kiri}" x2="${lebar - m.kanan}" y1="${y(b)}" y2="${y(b)}"/>`)
    .join("");
  const tombolNada = semua
    .map(
      (t, i) =>
        `<g class="titik-nada ${t.laras}${t.kecil ? " kecil" : ""}" data-i="${i}" tabindex="0" role="button" aria-label="${t.laras} ${t.label}, ${t.sen} sen">
          <circle cx="${x(t.sen)}" cy="${y(t.baris)}" r="${t.kecil ? 7 : 12}"/>
          ${t.kecil && hp ? "" : `<text x="${x(t.sen)}" y="${y(t.baris) + (t.kecil ? -12 : 4.5)}" text-anchor="middle">${t.label}</text>`}
          ${t.atas ? `<circle class="oktaf-atas" cx="${x(t.sen)}" cy="${y(t.baris) - 7}" r="1.4"/>` : ""}
        </g>`,
    )
    .join("");
  wadah.innerHTML = `<svg viewBox="0 0 ${lebar} ${tinggi}" width="${lebar}" height="${tinggi}">${kisi}${nama}${tombolNada}</svg>`;
  const bunyikan = (el: Element | null) => {
    const g = el?.closest<SVGGElement>(".titik-nada");
    if (!g) return;
    const t = semua[Number(g.dataset.i)];
    g.classList.remove("denyut");
    void g.getBoundingClientRect();
    g.classList.add("denyut");
    tabuh(t.sen, t.laras);
  };
  const svg = wadah.querySelector("svg")!;
  svg.addEventListener("pointerdown", (e) => bunyikan(e.target as Element));
  svg.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      bunyikan(e.target as Element);
    }
  });
}
