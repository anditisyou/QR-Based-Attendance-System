class ConsistentHash {
  constructor(nodes = [], replicas = 3) {
    this.replicas = replicas;
    this.ring = new Map();
    this.sortedKeys = [];

    for (const node of nodes) {
      this.addNode(node);
    }
  }

  hashFn(str) {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  addNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const key = this.hashFn(node + ':' + i);
      this.ring.set(key, node);
      this.sortedKeys.push(key);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  removeNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const key = this.hashFn(node + ':' + i);
      this.ring.delete(key);
      this.sortedKeys = this.sortedKeys.filter(k => k !== key);
    }
  }

  getNode(key) {
    if (this.sortedKeys.length === 0) return null;

    const hash = this.hashFn(key);
    for (let k of this.sortedKeys) {
      if (hash <= k) return this.ring.get(k);
    }
    return this.ring.get(this.sortedKeys[0]); // Wrap around
  }
}

function consistentHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}