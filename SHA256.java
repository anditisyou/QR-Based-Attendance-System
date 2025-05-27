//Generation of SHA 256 HASHES
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class SHA256 {
    // Constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes)
    private static final int[] K = {
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
    };

    private static int ROTR(int n, int x) {
        return (x >>> n) | (x << (32 - n));
    }

    private static int Σ0(int x) { return ROTR(2, x) ^ ROTR(13, x) ^ ROTR(22, x); }
    private static int Σ1(int x) { return ROTR(6, x) ^ ROTR(11, x) ^ ROTR(25, x); }
    private static int σ0(int x) { return ROTR(7, x) ^ ROTR(18, x) ^ (x >>> 3); }
    private static int σ1(int x) { return ROTR(17, x) ^ ROTR(19, x) ^ (x >>> 10); }
    private static int Ch(int x, int y, int z) { return (x & y) ^ (~x & z); }
    private static int Maj(int x, int y, int z) { return (x & y) ^ (x & z) ^ (y & z); }

    private static List<Integer> toWords(String msg) {
        List<Integer> bytes = new ArrayList<>();
        for (int i = 0; i < msg.length(); i++) {
            bytes.add((int) msg.charAt(i));
        }
        bytes.add(0x80);
        
        while ((bytes.size() + 8) % 64 != 0) {
            bytes.add(0x00);
        }
        
        long bitLen = msg.length() * 8L;
        for (int i = 7; i >= 0; i--) {
            bytes.add((int) ((bitLen >>> (i * 8)) & 0xff));
        }
        
        List<Integer> words = new ArrayList<>();
        for (int i = 0; i < bytes.size(); i += 4) {
            int word = (bytes.get(i) << 24) | 
                      (bytes.get(i+1) << 16) | 
                      (bytes.get(i+2) << 8) | 
                       bytes.get(i+3);
            words.add(word);
        }
        return words;
    }

    public static String sha256(String msg) {
        List<Integer> words = toWords(msg);
        int[] H = {
            0x6a09e667, 0xbb67ae85,
            0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c,
            0x1f83d9ab, 0x5be0cd19
        };

        for (int i = 0; i < words.size(); i += 16) {
            int[] W = new int[64];
            for (int t = 0; t < 64; t++) {
                if (t < 16) {
                    W[t] = words.get(i + t);
                } else {
                    W[t] = (σ1(W[t-2]) + W[t-7] + σ0(W[t-15]) + W[t-16]);
                }
            }

            int a = H[0], b = H[1], c = H[2], d = H[3];
            int e = H[4], f = H[5], g = H[6], h = H[7];

            for (int t = 0; t < 64; t++) {
                int T1 = (h + Σ1(e) + Ch(e, f, g) + K[t] + W[t]);
                int T2 = (Σ0(a) + Maj(a, b, c));
                h = g;
                g = f;
                f = e;
                e = (d + T1);
                d = c;
                c = b;
                b = a;
                a = (T1 + T2);
            }

            H[0] += a;
            H[1] += b;
            H[2] += c;
            H[3] += d;
            H[4] += e;
            H[5] += f;
            H[6] += g;
            H[7] += h;
        }

        StringBuilder hexString = new StringBuilder();
        for (int value : H) {
            String hex = Integer.toHexString(value);
            // Pad with leading zeros to ensure 8 characters
            while (hex.length() < 8) {
                hex = "0" + hex;
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
    public static void main(String[] args) {
    if (args.length < 1) {
        System.err.println("Usage: java SHA256 <input_string>");
        System.exit(1);
    }
    System.out.println(sha256(args[0]));
    }
}