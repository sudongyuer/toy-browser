function findChartA(str) {
    for (const c of str) {
        if (c === 'a') return true

    }
    return false;
}

console.log(findChartA('I am groot'))
