// Constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes)
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
function ROTR(n, x) {
  return (x >>> n) | (x << (32 - n));
}
function Σ0(x) { return ROTR(2, x) ^ ROTR(13, x) ^ ROTR(22, x); }
function Σ1(x) { return ROTR(6, x) ^ ROTR(11, x) ^ ROTR(25, x); }
function σ0(x) { return ROTR(7, x) ^ ROTR(18, x) ^ (x >>> 3); }
function σ1(x) { return ROTR(17, x) ^ ROTR(19, x) ^ (x >>> 10); }
function Ch(x, y, z) { return (x & y) ^ (~x & z); }
function Maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }

function toWords(msg) {
  const bytes = [];
  for (let i = 0; i < msg.length; i++) bytes.push(msg.charCodeAt(i));
  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) bytes.push(0x00);
  const bitLen = msg.length * 8;
  for (let i = 7; i >= 0; i--) bytes.push((bitLen >>> (i * 8)) & 0xff);
  const words = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push((bytes[i] << 24) | (bytes[i+1] << 16) | (bytes[i+2] << 8) | bytes[i+3]);
  }
  return words;
}

function sha256(msg) {
  const words = toWords(msg);
  let H = [
    0x6a09e667, 0xbb67ae85,
    0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19
  ];

  for (let i = 0; i < words.length; i += 16) {
    const W = [];
    for (let t = 0; t < 64; t++) {
      if (t < 16) W[t] = words[i + t] | 0;
      else W[t] = (σ1(W[t-2]) + W[t-7] + σ0(W[t-15]) + W[t-16]) | 0;
    }

    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const T1 = (h + Σ1(e) + Ch(e,f,g) + K[t] + W[t]) | 0;
      const T2 = (Σ0(a) + Maj(a,b,c)) | 0;
      h = g; g = f; f = e;
      e = (d + T1) | 0;
      d = c; c = b; b = a;
      a = (T1 + T2) | 0;
    }

    H = [
      (H[0] + a) | 0, (H[1] + b) | 0,
      (H[2] + c) | 0, (H[3] + d) | 0,
      (H[4] + e) | 0, (H[5] + f) | 0,
      (H[6] + g) | 0, (H[7] + h) | 0
    ];
  }

  return H.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
}
module.exports = sha256;