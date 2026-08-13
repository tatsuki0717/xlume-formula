/**
 * Integer-order Bessel functions.
 *
 * Polynomial approximations and recurrence relations are adapted from
 * SheetJS/bessel (Apache-2.0), which are in turn derived from standard
 * numerical tables (Abramowitz & Stegun / Cephes).
 */

function _horner(coeffs: number[], v: number): number {
  let z = 0;
  for (let i = 0; i < coeffs.length; ++i) {
    z = v * z + coeffs[i]!;
  }
  return z;
}

function _besselIter(x: number, n: number, f0: number, f1: number, sign: number): number {
  if (n === 0) return f0;
  if (n === 1) return f1;
  const tdx = 2 / x;
  let f2 = f1;
  for (let o = 1; o < n; ++o) {
    f2 = f1 * o * tdx + sign * f0;
    f0 = f1;
    f1 = f2;
  }
  return f2;
}

// ------------------------------------------------------------------
// Bessel J
// ------------------------------------------------------------------

const W = 0.636619772; // 2 / Math.PI truncated to match Excel-compatible reference

const j0A1a = [57568490574.0, -13362590354.0, 651619640.7, -11214424.18, 77392.33017, -184.9052456].reverse();
const j0A2a = [57568490411.0, 1029532985.0, 9494680.718, 59272.64853, 267.8532712, 1.0].reverse();
const j0A1b = [1.0, -0.1098628627e-2, 0.2734510407e-4, -0.2073370639e-5, 0.2093887211e-6].reverse();
const j0A2b = [-0.1562499995e-1, 0.1430488765e-3, -0.6911147651e-5, 0.7621095161e-6, -0.934935152e-7].reverse();

function besselJ0(x: number): number {
  const y = x * x;
  if (x < 8) {
    return _horner(j0A1a, y) / _horner(j0A2a, y);
  }
  const xx = x - 0.785398164;
  const z = 64 / y;
  const a1 = _horner(j0A1b, z);
  const a2 = _horner(j0A2b, z);
  return Math.sqrt(W / x) * (Math.cos(xx) * a1 - Math.sin(xx) * a2 * (8 / x));
}

const j1A1a = [72362614232.0, -7895059235.0, 242396853.1, -2972611.439, 15704.4826, -30.16036606].reverse();
const j1A2a = [144725228442.0, 2300535178.0, 18583304.74, 99447.43394, 376.9991397, 1.0].reverse();
const j1A1b = [1.0, 0.183105e-2, -0.3516396496e-4, 0.2457520174e-5, -0.240337019e-6].reverse();
const j1A2b = [0.04687499995, -0.2002690873e-3, 0.8449199096e-5, -0.88228987e-6, 0.105787412e-6].reverse();

function besselJ1(x: number): number {
  const y = x * x;
  const xx = Math.abs(x) - 2.356194491;
  if (Math.abs(x) < 8) {
    return x * _horner(j1A1a, y) / _horner(j1A2a, y);
  }
  const z = 64 / y;
  const a1 = _horner(j1A1b, z);
  const a2 = _horner(j1A2b, z);
  const a = Math.sqrt(W / Math.abs(x)) * (Math.cos(xx) * a1 - Math.sin(xx) * a2 * (8 / Math.abs(x)));
  return x < 0 ? -a : a;
}

export function besselJ(x: number, n: number): number {
  n = Math.trunc(n);
  if (!Number.isFinite(x)) return Number.isNaN(x) ? x : 0;
  if (n < 0) return Number.NaN;
  if (n === 0) return besselJ0(x);
  if (n === 1) return besselJ1(x);
  if (x === 0) return 0;

  // For negative x, J_n(-x) = (-1)^n J_n(x)
  if (x < 0) return (n % 2 ? -1 : 1) * besselJ(-x, n);

  if (x > n) {
    return _besselIter(x, n, besselJ0(x), besselJ1(x), -1);
  }

  // Miller's downward recurrence for x <= n
  const m = 2 * Math.floor((n + Math.floor(Math.sqrt(40 * n))) / 2);
  let bj = 1.0;
  let bjm = 0.0;
  let bjp = 0.0;
  let sum = 0.0;
  let ret = 0.0;
  let jsum = false;
  const tox = 2 / x;
  for (let j = m; j > 0; --j) {
    bjm = j * tox * bj - bjp;
    bjp = bj;
    bj = bjm;
    if (Math.abs(bj) > 1e10) {
      bj *= 1e-10;
      bjp *= 1e-10;
      ret *= 1e-10;
      sum *= 1e-10;
    }
    if (jsum) sum += bj;
    jsum = !jsum;
    if (j === n) ret = bjp;
  }
  sum = 2.0 * sum - bj;
  return ret / sum;
}

// ------------------------------------------------------------------
// Bessel Y
// ------------------------------------------------------------------

const y0A1a = [-2957821389.0, 7062834065.0, -512359803.6, 10879881.29, -86327.92757, 228.4622733].reverse();
const y0A2a = [40076544269.0, 745249964.8, 7189466.438, 47447.2647, 226.1030244, 1.0].reverse();
const y0A1b = [1.0, -0.1098628627e-2, 0.2734510407e-4, -0.2073370639e-5, 0.2093887211e-6].reverse();
const y0A2b = [-0.1562499995e-1, 0.1430488765e-3, -0.6911147651e-5, 0.7621095161e-6, -0.934945152e-7].reverse();

function besselY0(x: number): number {
  const y = x * x;
  const xx = x - 0.785398164;
  if (x < 8) {
    return _horner(y0A1a, y) / _horner(y0A2a, y) + W * besselJ0(x) * Math.log(x);
  }
  const z = 64 / y;
  const a1 = _horner(y0A1b, z);
  const a2 = _horner(y0A2b, z);
  return Math.sqrt(W / x) * (Math.sin(xx) * a1 + Math.cos(xx) * a2 * (8 / x));
}

const y1A1a = [-0.4900604943e13, 0.1275274390e13, -0.5153438139e11, 0.7349264551e9, -0.4237922726e7, 0.8511937935e4].reverse();
const y1A2a = [0.2499580570e14, 0.4244419664e12, 0.3733650367e10, 0.2245904002e8, 0.1020426050e6, 0.3549632885e3, 1].reverse();
const y1A1b = [1.0, 0.183105e-2, -0.3516396496e-4, 0.2457520174e-5, -0.240337019e-6].reverse();
const y1A2b = [0.04687499995, -0.2002690873e-3, 0.8449199096e-5, -0.88228987e-6, 0.105787412e-6].reverse();

function besselY1(x: number): number {
  const y = x * x;
  const xx = x - 2.356194491;
  if (x < 8) {
    return x * _horner(y1A1a, y) / _horner(y1A2a, y) + W * (besselJ1(x) * Math.log(x) - 1 / x);
  }
  const z = 64 / y;
  const a1 = _horner(y1A1b, z);
  const a2 = _horner(y1A2b, z);
  return Math.sqrt(W / x) * (Math.sin(xx) * a1 + Math.cos(xx) * a2 * (8 / x));
}

export function besselY(x: number, n: number): number {
  n = Math.trunc(n);
  if (n < 0) return Number.NaN;
  if (x <= 0) return Number.NaN;
  if (n === 0) return besselY0(x);
  if (n === 1) return besselY1(x);
  return _besselIter(x, n, besselY0(x), besselY1(x), -1);
}

// ------------------------------------------------------------------
// Bessel I
// ------------------------------------------------------------------

const i0A = [1.0, 3.5156229, 3.0899424, 1.2067492, 0.2659732, 0.360768e-1, 0.45813e-2].reverse();
const i0B = [0.39894228, 0.1328592e-1, 0.225319e-2, -0.157565e-2, 0.916281e-2, -0.2057706e-1, 0.2635537e-1, -0.1647633e-1, 0.392377e-2].reverse();

function besselI0(x: number): number {
  const ax = Math.abs(x);
  if (ax <= 3.75) return _horner(i0A, (ax * ax) / (3.75 * 3.75));
  return (Math.exp(ax) / Math.sqrt(ax)) * _horner(i0B, 3.75 / ax);
}

const i1A = [0.5, 0.87890594, 0.51498869, 0.15084934, 0.2658733e-1, 0.301532e-2, 0.32411e-3].reverse();
const i1B = [0.39894228, -0.3988024e-1, -0.362018e-2, 0.163801e-2, -0.1031555e-1, 0.2282967e-1, -0.2895312e-1, 0.1787654e-1, -0.420059e-2].reverse();

function besselI1(x: number): number {
  const ax = Math.abs(x);
  let r: number;
  if (ax < 3.75) {
    r = x * _horner(i1A, (ax * ax) / (3.75 * 3.75));
  } else {
    r = (x < 0 ? -1 : 1) * (Math.exp(ax) / Math.sqrt(ax)) * _horner(i1B, 3.75 / ax);
  }
  return r;
}

export function besselI(x: number, n: number): number {
  n = Math.trunc(n);
  if (n < 0) return Number.NaN;
  if (n === 0) return besselI0(x);
  if (n === 1) return besselI1(x);
  if (Math.abs(x) === 0) return 0;
  if (x === Infinity || x === -Infinity) return Infinity;

  let ret = 0.0;
  let bip = 0.0;
  let bi = 1.0;
  let bim = 0.0;
  const tox = 2 / Math.abs(x);
  const m = 2 * Math.round((n + Math.round(Math.sqrt(40 * n))) / 2);
  for (let j = m; j > 0; --j) {
    bim = j * tox * bi + bip;
    bip = bi;
    bi = bim;
    if (Math.abs(bi) > 1e10) {
      bi *= 1e-10;
      bip *= 1e-10;
      ret *= 1e-10;
    }
    if (j === n) ret = bip;
  }
  ret *= besselI0(x) / bi;
  return x < 0 && n % 2 ? -ret : ret;
}

// ------------------------------------------------------------------
// Bessel K
// ------------------------------------------------------------------

const k0A = [-0.57721566, 0.4227842, 0.23069756, 0.348859e-1, 0.262698e-2, 0.1075e-3, 0.74e-5].reverse();
const k0B = [1.25331414, -0.7832358e-1, 0.2189568e-1, -0.1062446e-1, 0.587872e-2, -0.25154e-2, 0.53208e-3].reverse();

function besselK0(x: number): number {
  if (x <= 2) return -Math.log(x / 2) * besselI0(x) + _horner(k0A, (x * x) / 4);
  return (Math.exp(-x) / Math.sqrt(x)) * _horner(k0B, 2 / x);
}

const k1A = [1.0, 0.15443144, -0.67278579, -0.18156897, -0.1919402e-1, -0.110404e-2, -0.4686e-4].reverse();
const k1B = [1.25331414, 0.23498619, -0.365562e-1, 0.1504268e-1, -0.780353e-2, 0.325614e-2, -0.68245e-3].reverse();

function besselK1(x: number): number {
  if (x <= 2) return Math.log(x / 2) * besselI1(x) + (1 / x) * _horner(k1A, (x * x) / 4);
  return (Math.exp(-x) / Math.sqrt(x)) * _horner(k1B, 2 / x);
}

export function besselK(x: number, n: number): number {
  n = Math.trunc(n);
  if (n < 0) return Number.NaN;
  if (x <= 0) return Number.NaN;
  if (n === 0) return besselK0(x);
  if (n === 1) return besselK1(x);
  return _besselIter(x, n, besselK0(x), besselK1(x), 1);
}
