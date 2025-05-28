// algorithms/mst.js

/**
 * Implements Prim's algorithm to find the Minimum Spanning Tree (MST) of a connected, undirected graph.
 *
 * @param {Object} graph - The graph represented as an adjacency list with weights.
 * Example: { 'A': { 'B': 1, 'C': 4 }, 'B': { 'A': 1, 'C': 2, 'D': 5 }, ... }
 * @returns {Array<Object>} An array of edges representing the MST, each edge is { from, to, weight }.
 * Returns an empty array if the graph is empty or not connected (only finds MST for connected components).
 */
function prims(graph) {
    const mst = []; // Stores the edges of the MST
    const visited = new Set(); // Stores nodes already included in the MST
    const minHeap = new PriorityQueue(); // Priority queue for edges (min-heap)

    // Handle empty graph
    const nodes = Object.keys(graph);
    if (nodes.length === 0) {
        return mst;
    }

    // Start Prim's from the first node in the graph
    const startNode = nodes[0];
    visited.add(startNode);

    // Add all edges from the startNode to the min-heap
    for (const neighbor in graph[startNode]) {
        minHeap.enqueue({ from: startNode, to: neighbor, weight: graph[startNode][neighbor] }, graph[startNode][neighbor]);
    }

    while (!minHeap.isEmpty()) {
        // Get the edge with the smallest weight
        const { element: { from, to, weight } } = minHeap.dequeue();

        // If the 'to' node is already visited, skip this edge (it forms a cycle)
        if (visited.has(to)) {
            continue;
        }

        // Add the edge to the MST
        mst.push({ from, to, weight });
        visited.add(to); // Mark the 'to' node as visited

        // Add all edges from the newly visited node to the min-heap
        for (const neighbor in graph[to]) {
            if (!visited.has(neighbor)) {
                minHeap.enqueue({ from: to, to: neighbor, weight: graph[to][neighbor] }, graph[to][neighbor]);
            }
        }
    }

    // Optional: Check if all nodes are visited to confirm a connected graph MST
    // If (visited.size !== nodes.length), it means the graph is not connected
    // and this MST only covers one connected component.

    return mst;
}

/**
 * A simple Priority Queue implementation for Prim's algorithm.
 * Elements are stored as { element, priority } and dequeued based on priority.
 * (A more efficient implementation would use a min-heap)
 */
class PriorityQueue {
    constructor() {
        this.values = [];
    }

    /**
     * Adds an element to the priority queue.
     * @param {*} element - The element to add.
     * @param {number} priority - The priority of the element (lower value = higher priority).
     */
    enqueue(element, priority) {
        this.values.push({ element, priority });
        this.sort(); // Sort the queue after adding
    }

    /**
     * Removes and returns the element with the highest priority (lowest priority value).
     * @returns {Object} The element with its priority.
     */
    dequeue() {
        return this.values.shift(); // Remove the first element (highest priority)
    }

    /**
     * Checks if the priority queue is empty.
     * @returns {boolean} True if empty, false otherwise.
     */
    isEmpty() {
        return this.values.length === 0;
    }

    /**
     * Sorts the elements in the priority queue by their priority.
     */
    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }
}

// Export the prims function
module.exports = prims;
