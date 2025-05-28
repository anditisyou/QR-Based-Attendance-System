// algorithms/graphTraversal.js

/**
 * Implements Breadth-First Search (BFS) for graph traversal.
 * Finds the shortest path in terms of number of edges.
 *
 * @param {Object} graph - The graph represented as an adjacency list.
 * Example: { 'A': ['B', 'C'], 'B': ['A', 'D'], ... }
 * @param {string} startNode - The starting node for the traversal.
 * @returns {Object} An object containing:
 * - visited: A set of all visited nodes.
 * - distances: A map of distances (number of hops) from the startNode.
 * - parent: A map to reconstruct the shortest path.
 */
function bfs(graph, startNode) {
    const visited = new Set();
    const queue = []; // Queue for BFS
    const distances = {}; // Stores distance (number of hops) from startNode
    const parent = {}; // Stores parent node for path reconstruction

    // Initialize distances and parent for all nodes
    for (const node in graph) {
        distances[node] = Infinity;
        parent[node] = null;
    }

    // Start BFS from the startNode
    queue.push(startNode);
    visited.add(startNode);
    distances[startNode] = 0;

    while (queue.length > 0) {
        const currentNode = queue.shift(); // Dequeue the first node

        // Visit neighbors
        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                distances[neighbor] = distances[currentNode] + 1;
                parent[neighbor] = currentNode;
                queue.push(neighbor); // Enqueue unvisited neighbor
            }
        }
    }

    return { visited, distances, parent };
}

/**
 * Implements Depth-First Search (DFS) for graph traversal.
 * Explores as far as possible along each branch before backtracking.
 *
 * @param {Object} graph - The graph represented as an adjacency list.
 * Example: { 'A': ['B', 'C'], 'B': ['A', 'D'], ... }
 * @param {string} startNode - The starting node for the traversal.
 * @returns {Object} An object containing:
 * - visited: A set of all visited nodes.
 * - traversalPath: An array representing the order of nodes visited.
 */
function dfs(graph, startNode) {
    const visited = new Set();
    const traversalPath = []; // Stores the order of visited nodes

    /**
     * Recursive helper function for DFS.
     * @param {string} node - The current node to visit.
     */
    function dfsRecursive(node) {
        visited.add(node);
        traversalPath.push(node); // Add to traversal path

        // Visit neighbors
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                dfsRecursive(neighbor); // Recursively call DFS for unvisited neighbor
            }
        }
    }

    // Start DFS from the startNode
    dfsRecursive(startNode);

    return { visited, traversalPath };
}

// Export both BFS and DFS functions
module.exports = { bfs, dfs };
