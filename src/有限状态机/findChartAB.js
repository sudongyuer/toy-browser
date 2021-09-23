function findChartAB(str) {
    let foundA = false;
    for (const c of str) {
        if (c === 'a') {
            foundA = true;
        } else if (foundA && c === 'b') {
            return true;
        }
        else foundA=false
    }
    return false
}

console.log(findChartAB('I acbcd groot'))
