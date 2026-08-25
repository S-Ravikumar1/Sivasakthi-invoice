export function suffixLetters(n) {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export function makeInvoiceNo(base, suffix) {
  return suffix === 0 ? base : `${base}${suffixLetters(suffix)}`;
}

export function cleanBase(value) {
  return String(value ?? "").trim().replace(/[a-z]+$/i, "");
}
