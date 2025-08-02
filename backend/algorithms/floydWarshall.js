// algorithms/floydWarshall.js
/**
 * Implements the Floyd-Warshall algorithm to find the shortest paths
 * between all pairs of vertices in a weighted graph.
 *
 * @param {Array<Array<number>>} graph - The adjacency matrix representation of the graph.
 * Infinity (or a very large number) should represent no direct edge.
 * Example: [[0, 3, Infinity, 7], [8, 0, 2, Infinity], ...]
 * @returns {Object} An object containing:
 * - dist: A matrix where dist[i][j] is the shortest distance from vertex i to vertex j.
 * - next: A matrix to reconstruct the shortest path. next[i][j] stores the next vertex
 * in the shortest path from i to j.
 */
function floydWarshall(graph) {
    const numVertices = graph.length;
    const dist = Array.from({ length: numVertices }, () => Array(numVertices).fill(Infinity));
    const next = Array.from({ length: numVertices }, () => Array(numVertices).fill(null));

    // Initialize dist and next matrices
    for (let i = 0; i < numVertices; i++) {
        for (let j = 0; j < numVertices; j++) {
            if (i === j) {
                dist[i][j] = 0; // Distance to self is 0
            } else if (graph[i][j] !== Infinity) {
                dist[i][j] = graph[i][j]; // Direct edge weight
                next[i][j] = j; // Next vertex is j
            }
        }
    }

    // Main Floyd-Warshall loop
    // k is the intermediate vertex
    for (let k = 0; k < numVertices; k++) {
        // i is the source vertex
        for (let i = 0; i < numVertices; i++) {
            // j is the destination vertex
            for (let j = 0; j < numVertices; j++) {
                // If path through k is shorter than current path
                if (dist[i][k] !== Infinity && dist[k][j] !== Infinity &&
                    dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k]; // Update next vertex for path reconstruction
                }
            }
        }
    }

    return { dist, next };
}

/**
 * Reconstructs the shortest path from a source to a destination using the 'next' matrix.
 * @param {Array<Array<number>>} next - The 'next' matrix from Floyd-Warshall.
 * @param {number} start - The starting vertex index.
 * @param {number} end - The ending vertex index.
 * @returns {Array<number>|null} An array of vertex indices representing the path, or null if no path exists.
 */
function reconstructPath(next, start, end) {
    if (next[start][end] === null) {
        return null; // No path exists
    }
    const path = [start];
    let current = start;
    while (current !== end) {
        current = next[current][end];
        if (current === null) { // Should not happen if next[start][end] is not null
            return null;
        }
        path.push(current);
    }
    return path;
}

// Export the main function and path reconstruction helper
module.exports = { floydWarshall, reconstructPath };
