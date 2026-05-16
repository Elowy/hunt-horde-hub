// Magyar számból-betű konverter pénztári bizonylatokhoz.
// Forint-összegek: 0-tól ezermilliárdig (10^12-ig) támogatott, egész számokra.
// Helyesírás: a magyar szabály szerint 2000 felett a számjegycsoportokat
// kötőjellel választjuk el, kivéve a kerek ezreseket/milliósokat.

const ONES = [
  "", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc",
];
const TEENS = [
  "tíz", "tizenegy", "tizenkettő", "tizenhárom", "tizennégy",
  "tizenöt", "tizenhat", "tizenhét", "tizennyolc", "tizenkilenc",
];
const TWENTIES = [
  "húsz", "huszonegy", "huszonkettő", "huszonhárom", "huszonnégy",
  "huszonöt", "huszonhat", "huszonhét", "huszonnyolc", "huszonkilenc",
];
const TENS = [
  "", "", "", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven",
];

function under100(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 30) return TWENTIES[n - 20];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : TENS[t] + ONES[o];
}

function under1000(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = "";
  if (h > 0) {
    s += h === 1 ? "száz" : ONES[h] + "száz";
  }
  s += under100(rest);
  return s;
}

// Convert a non-negative integer into Hungarian words (without "forint" suffix).
function intToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "nulla";

  const trillion = Math.floor(n / 1_000_000_000_000);
  const billion = Math.floor((n % 1_000_000_000_000) / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (trillion > 0) parts.push((trillion === 1 ? "" : under1000(trillion)) + "billió");
  if (billion > 0) parts.push((billion === 1 ? "" : under1000(billion)) + "milliárd");
  if (million > 0) parts.push((million === 1 ? "" : under1000(million)) + "millió");
  if (thousand > 0) parts.push((thousand === 1 ? "" : under1000(thousand)) + "ezer");
  if (rest > 0) parts.push(under1000(rest));

  // Magyar szabály: 2000 felett kötőjellel kötjük a csoportokat,
  // KIVÉVE ha az összeg pontosan kerek ezer/millió/... (ekkor egybeírjuk).
  const useHyphen = n >= 2000 && rest !== 0 || (n >= 2000 && (thousand > 0 || million > 0 || billion > 0) && rest !== 0);
  // Egyszerűsítés: ha a teljes szám >= 2000 ÉS több csoport van ÉS nem kerek,
  // kötőjelezzünk minden csoport közt. Kerek esetnél (rest===0) egybeírjuk.
  if (n >= 2000 && parts.length > 1 && rest !== 0) {
    return parts.join("-");
  }
  return parts.join("");
}

export function numberToHungarianWords(amount: number, currency = "forint"): string {
  if (!Number.isFinite(amount)) return "";
  const sign = amount < 0 ? "mínusz " : "";
  const n = Math.abs(Math.round(amount));
  const words = intToWords(n);
  return sign + words + " " + currency;
}
