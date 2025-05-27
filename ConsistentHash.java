
import java.util.*;
//Generate the consistent hash to Prevents duplicate device submissions
public class ConsistentHash {
    private final int replicas;
    private final TreeMap<Integer, String> ring;
    private final List<Integer> sortedKeys;

    public ConsistentHash(List<String> nodes, int replicas) {
        this.replicas = replicas;
        this.ring = new TreeMap<>();
        this.sortedKeys = new ArrayList<>();

        for (String node : nodes) {
            this.addNode(node);
        }
    }

    private int hashFn(String str) {
        int hash = 0;
        for (int i = 0; i < str.length(); i++) {
            hash = (hash * 31 + str.charAt(i)) & 0xFFFFFFFF;
        }
        return hash;
    }

    public void addNode(String node) {
        for (int i = 0; i < replicas; i++) {
            String replicaKey = node + ":" + i;
            int hash = hashFn(replicaKey);
            ring.put(hash, node);
            sortedKeys.add(hash);
        }
        Collections.sort(sortedKeys);
    }

    public void removeNode(String node) {
        for (int i = 0; i < replicas; i++) {
            String replicaKey = node + ":" + i;
            int hash = hashFn(replicaKey);
            ring.remove(hash);
            sortedKeys.removeIf(k -> k == hash);
        }
    }

    public String getNode(String key) {
        if (sortedKeys.isEmpty()) return null;

        int hash = hashFn(key);
        for (int k : sortedKeys) {
            if (hash <= k) return ring.get(k);
        }
        return ring.get(sortedKeys.get(0)); // Wrap around
    }

    public static String consistentHash(String input) {
        int hash = 0;
        for (int i = 0; i < input.length(); i++) {
            hash = (hash * 31 + input.charAt(i)) & 0xFFFFFFFF;
        }
        return String.format("%08x", hash); // Pad to 8 chars with leading zeros
    }
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java ConsistentHash <input_string>");
            System.exit(1);
        }
        String input = args[0];
        String hash = consistentHash(input);
        System.out.println(hash);
    }
}