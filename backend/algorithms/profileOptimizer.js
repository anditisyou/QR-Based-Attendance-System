// algorithms/profileOptimizer.js

/**
 * Solves the 0/1 Knapsack problem using dynamic programming.
 * This can be used to suggest the best set of items (e.g., courses, certifications)
 * to maximize total value (e.g., profile boost) within a given weight limit (e.g., time, effort).
 *
 * @param {Array<Object>} items - An array of objects, where each object has:
 * - name (string): The name of the item.
 * - value (number): The value of the item (e.g., profile boost points).
 * - weight (number): The weight of the item (e.g., hours, difficulty score).
 * @param {number} capacity - The maximum total weight allowed (e.g., total available time).
 * @returns {Object} An object containing:
 * - maxValue: The maximum total value that can be achieved.
 * - selectedItems: An array of names of the items selected to achieve the maxValue.
 */
function knapsack(items, capacity) {
    const n = items.length;
    // dp[i][w] will store the maximum value that can be attained with the first 'i' items
    // and a knapsack capacity of 'w'.
    const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));

    // Build the dp table
    for (let i = 1; i <= n; i++) {
        const currentItem = items[i - 1];
        for (let w = 0; w <= capacity; w++) {
            if (currentItem.weight <= w) {
                // Option 1: Include the current item
                // Value of current item + max value of remaining capacity with previous items
                const valueIncluding = currentItem.value + dp[i - 1][w - currentItem.weight];
                // Option 2: Exclude the current item
                const valueExcluding = dp[i - 1][w];
                dp[i][w] = Math.max(valueIncluding, valueExcluding);
            } else {
                // Current item's weight is more than current capacity, so exclude it
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Reconstruct the selected items
    const selectedItems = [];
    let i = n;
    let w = capacity;
    while (i > 0 && w > 0) {
        // If the value at dp[i][w] is different from dp[i-1][w],
        // it means the i-th item (items[i-1]) was included.
        if (dp[i][w] !== dp[i - 1][w]) {
            const currentItem = items[i - 1];
            selectedItems.push(currentItem.name);
            w -= currentItem.weight; // Reduce capacity
        }
        i--; // Move to the previous item
    }

    // The maximum value is at dp[n][capacity]
    const maxValue = dp[n][capacity];

    // Reverse the selected items to get them in the original order (or any desired order)
    selectedItems.reverse();

    return { maxValue, selectedItems };
}

// Export the knapsack function
module.exports = knapsack;