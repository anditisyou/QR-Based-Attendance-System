// algorithms/dijkstra.js

function findShortestPath(startNode, endNode, graphData) {
    console.log(`Dijkstra: Finding path from ${startNode} to ${endNode} using graph:`, JSON.stringify(graphData));

    if (!graphData || !graphData.nodes || !graphData.edges) {
        console.error("Dijkstra: Invalid graphData provided.");
        return { path: [], distance: Infinity, error: "Invalid graph data structure." };
    }

    if (!graphData.nodes.includes(startNode) || !graphData.nodes.includes(endNode)) {
        console.error(`Dijkstra: Start (${startNode}) or End (${endNode}) node not in graph.`);
        return { path: [], distance: Infinity, error: "Start or End node not found in graph." };
    }

    const distances = {}; // Stores the shortest distance from startNode to each node
    const previousNodes = {}; // Stores the previous node in the shortest path
    const priorityQueue = new Set(); // Acts as a min-priority queue (can be optimized)

    // Initialize distances
    for (const node of graphData.nodes) {
        distances[node] = Infinity;
        previousNodes[node] = null;
        priorityQueue.add(node);
    }
    distances[startNode] = 0;

    while (priorityQueue.size > 0) {
        // Get node with the smallest distance from the priority queue
        let currentNode = null;
        let smallestDistance = Infinity;
        for (const node of priorityQueue) {
            if (distances[node] < smallestDistance) {
                smallestDistance = distances[node];
                currentNode = node;
            }
        }

        if (currentNode === null || distances[currentNode] === Infinity) {
            // No path to remaining nodes or target if currentNode is endNode and distance is Infinity
            break; 
        }

        priorityQueue.delete(currentNode);

        if (currentNode === endNode) {
            // Found the shortest path to the end node
            break;
        }

        // Get neighbors of the current node
        const neighbors = graphData.edges.filter(edge => edge.from === currentNode || edge.to === currentNode);

        for (const edge of neighbors) {
            const neighborNode = edge.from === currentNode ? edge.to : edge.from;
            const weight = edge.weight;

            if (priorityQueue.has(neighborNode)) { // Only consider nodes still in the queue
                const altDistance = distances[currentNode] + weight;
                if (altDistance < distances[neighborNode]) {
                    distances[neighborNode] = altDistance;
                    previousNodes[neighborNode] = currentNode;
                }
            }
        }
    }

    // Reconstruct the path from endNode back to startNode
    const path = [];
    let u = endNode;
    if (distances[u] === Infinity) {
        console.log(`Dijkstra: No path found from ${startNode} to ${endNode}.`);
        return { path: [], distance: Infinity, message: `No path found from ${startNode} to ${endNode}.` }; // No path found
    }

    while (previousNodes[u] !== null) {
        path.unshift(u);
        u = previousNodes[u];
    }
    path.unshift(startNode); // Add the start node

    console.log(`Dijkstra: Path found: ${path.join(" -> ")}, Distance: ${distances[endNode]}`);
    return {
        path: path,
        distance: distances[endNode]
    };
}

module.exports = { findShortestPath };