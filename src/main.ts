import "@fontsource/gloock/400.css";
import "@fontsource-variable/figtree";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./gaya.css";
import { Gamelan } from "./bunyi";
import { type Lapisan, Pemutar } from "./pemutar";
import { BENTUK, type Bentuk, CONTOH, DASAR_PELOG, DASAR_SLENDRO, type Ketukan, type Laras, frekuensi, genapkan, uraiBalungan } from "./teori";
import { BILAH, gambarLaras, gambarLingkar, gambarNotasi, gambarSaron, gambarTigaBentuk, sorotLingkar, sorotNotasi } from "./vis";

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

/* ---------- mesin bunyi (dibuat saat interaksi pertama) ---------- */
let gamelan: Gamelan | null = null;
let pemutar: Pemutar | null = null;
function mesin(): { g: Gamelan; p: Pemutar } {
  if (!gamelan) {
    gamelan = new Gamelan();
    pemutar = new Pemutar(gamelan);
    pemutar.saatKetuk = saatKetuk;
    salinKePemutar();
  }
  void gamelan.mulai();
  return { g: gamelan, p: pemutar! };
}

/* ---------- saron di pembuka ---------- */
let larasSaron: Laras = "slendro";
const saron = $("#saron");

function tabuhBilah(i: number) {
  const b = BILAH[larasSaron][i];
  if (!b) return;
  mesin().g.main("saron", frekuensi(larasSaron, b.nada, b.oktaf));
  const el = saron.querySelector<HTMLElement>(`[data-i="${i}"]`);
  el?.classList.remove("kena");
  void el?.offsetWidth;
  el?.classList.add("kena");
}

saron.addEventListener("pointerdown", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>(".bilah");
  if (!b) return;
  e.preventDefault();
  tabuhBilah(Number(b.dataset.i));
});
// Tombol Enter/Spasi pada bilah yang difokus.
saron.addEventListener("click", (e) => {
  if ((e as MouseEvent).detail !== 0) return;
  const b = (e.target as HTMLElement).closest<HTMLElement>(".bilah");
  if (b) tabuhBilah(Number(b.dataset.i));
});

function tabuhPencon(r: string) {
  const { g } = mesin();
  const l = larasSaron;
  if (r === "gong") g.main("gong", 0);
  else if (r === "kethuk") g.main("kethuk", frekuensi(l, 2, -1));
  else if (r === "kempul") g.main("kempul", frekuensi(l, 5));
  else if (r === "kenong") g.main("kenong", frekuensi(l, 6));
  const el = $(`[data-tabuh="${r}"]`);
  el.classList.remove("kena");
  void el.offsetWidth;
  el.classList.add("kena");
}
$$<HTMLButtonElement>("[data-tabuh]").forEach((b) => b.addEventListener("click", () => tabuhPencon(b.dataset.tabuh!)));

$$<HTMLButtonElement>("[data-laras-saron]").forEach((b) =>
  b.addEventListener("click", () => {
    larasSaron = b.dataset.larasSaron as Laras;
    $$<HTMLButtonElement>("[data-laras-saron]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    gambarSaron(saron, larasSaron);
  }),
);

document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
  if (/^[1-7]$/.test(e.key)) {
    const i = BILAH[larasSaron].findIndex((b) => b.nada === Number(e.key) && b.oktaf === 0);
    if (i >= 0) tabuhBilah(i);
  } else if (e.key.toLowerCase() === "g") tabuhPencon("gong");
});

/* ---------- penyusun balungan ---------- */
const hash = new URLSearchParams(location.hash.slice(1));
const awal = CONTOH[0];
let laras: Laras = hash.get("l") === "pelog" ? "pelog" : hash.get("l") === "slendro" ? "slendro" : awal.laras;
let bentuk: Bentuk = (["lancaran", "ketawang", "ladrang"] as const).find((b) => b === hash.get("b")) ?? awal.bentuk;
let tempo = Math.min(140, Math.max(40, Number(hash.get("t")) || awal.tempo));
let ketukan: Ketukan[] = [];
let gonganTampil = -1;

const kotak = $<HTMLTextAreaElement>("#balungan");
kotak.value = hash.get("n") ?? awal.balungan;

function simpanHash() {
  const p = new URLSearchParams({ l: laras, b: bentuk, t: String(tempo), n: kotak.value.trim().replace(/\s+/g, " ") });
  history.replaceState(null, "", `#${p}`);
}

function salinKePemutar() {
  if (!pemutar) return;
  pemutar.laras = laras;
  pemutar.bentuk = bentuk;
  pemutar.tempo = tempo;
  pemutar.ganti(ketukan);
}

function perbarui() {
  const { ketukan: k, galat } = uraiBalungan(kotak.value, laras);
  ketukan = genapkan(k, bentuk);
  const p = BENTUK[bentuk].panjang;
  const pesan = [...galat];
  if (k.length % p !== 0) pesan.push(`${k.length} ketukan; ditambah pin sampai genap ${ketukan.length} (${bentuk} = ${p} ketukan per gongan).`);
  $("[data-galat]").textContent = pesan.slice(0, 3).join(" ");
  gonganTampil = 0;
  gambarLingkar($("#lingkar"), ketukan, bentuk, 0);
  gambarNotasi($("#notasi"), ketukan, bentuk);
  $$<HTMLButtonElement>("[data-laras]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.laras === laras)));
  $$<HTMLButtonElement>("[data-bentuk]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bentuk === bentuk)));
  $<HTMLInputElement>("#tempo").value = String(tempo);
  $("[data-tempo]").textContent = `${tempo} ketukan/menit`;
  salinKePemutar();
  simpanHash();
}

function saatKetuk(i: number) {
  const g = Math.floor(i / BENTUK[bentuk].panjang);
  if (g !== gonganTampil) {
    gonganTampil = g;
    gambarLingkar($("#lingkar"), ketukan, bentuk, g);
  }
  sorotLingkar($("#lingkar"), bentuk, i);
  sorotNotasi($("#notasi"), i);
}

let tundaKetik = 0;
kotak.addEventListener("input", () => {
  clearTimeout(tundaKetik);
  tundaKetik = window.setTimeout(perbarui, 150);
});
$$<HTMLButtonElement>("[data-laras]").forEach((b) =>
  b.addEventListener("click", () => {
    laras = b.dataset.laras as Laras;
    perbarui();
  }),
);
$$<HTMLButtonElement>("[data-bentuk]").forEach((b) =>
  b.addEventListener("click", () => {
    bentuk = b.dataset.bentuk as Bentuk;
    perbarui();
  }),
);
$<HTMLInputElement>("#tempo").addEventListener("input", (e) => {
  tempo = Number((e.target as HTMLInputElement).value);
  $("[data-tempo]").textContent = `${tempo} ketukan/menit`;
  salinKePemutar();
  simpanHash();
});

const pilihContoh = $<HTMLSelectElement>("#contoh");
pilihContoh.innerHTML = `<option value="">Tulis sendiri</option>` + CONTOH.map((c, i) => `<option value="${i}">${c.nama}</option>`).join("");
pilihContoh.value = hash.get("n") ? "" : "0";
pilihContoh.addEventListener("change", () => {
  const c = CONTOH[Number(pilihContoh.value)];
  if (!c) return;
  laras = c.laras;
  bentuk = c.bentuk;
  tempo = c.tempo;
  kotak.value = c.balungan;
  perbarui();
});
kotak.addEventListener("input", () => (pilihContoh.value = ""));

const tombolPutar = $<HTMLButtonElement>("#putar");
tombolPutar.addEventListener("click", async () => {
  const { p } = mesin();
  if (p.berjalan) {
    p.berhenti();
    sorotLingkar($("#lingkar"), bentuk, null);
    sorotNotasi($("#notasi"), null);
    tombolPutar.textContent = "▶ Putar";
    tombolPutar.setAttribute("aria-pressed", "false");
  } else {
    salinKePemutar();
    await p.mulai();
    tombolPutar.textContent = "■ Berhenti";
    tombolPutar.setAttribute("aria-pressed", "true");
  }
});

$$<HTMLInputElement>("[data-lapisan]").forEach((c) =>
  c.addEventListener("change", () => {
    if (pemutar) pemutar.aktif[c.dataset.lapisan as Lapisan] = c.checked;
  }),
);

$("#bagikan").addEventListener("click", async () => {
  const b = $<HTMLButtonElement>("#bagikan");
  try {
    await navigator.clipboard.writeText(location.href);
    b.textContent = "Tautan tersalin";
  } catch {
    b.textContent = "Salin dari bilah alamat";
  }
  setTimeout(() => (b.textContent = "Salin tautan"), 2000);
});

/* ---------- laras ---------- */
function gambarGrafikLaras() {
  gambarLaras($("#grafik-laras"), (sen, l) => {
    const dasar = l === "pelog" ? DASAR_PELOG : DASAR_SLENDRO;
    mesin().g.main("saron", dasar * 2 ** (sen / 1200));
  });
}

/* ---------- ukuran layar ---------- */
let lebarTerakhir = 0;
new ResizeObserver(([e]) => {
  const w = Math.round(e.contentRect.width);
  if (!lebarTerakhir) {
    lebarTerakhir = w;
    return;
  }
  if (w === lebarTerakhir) return;
  lebarTerakhir = w;
  gambarLingkar($("#lingkar"), ketukan, bentuk, Math.max(0, gonganTampil));
  gambarGrafikLaras();
}).observe(document.querySelector("main")!);

/* ---------- mulai ---------- */
gambarSaron(saron, larasSaron);
gambarTigaBentuk($("[data-tiga-bentuk]"));
gambarGrafikLaras();
perbarui();
kotak.value = kotak.value.trim();
