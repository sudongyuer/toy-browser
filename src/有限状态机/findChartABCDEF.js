function findChartABCDEF(str) {
    let foundA = false;
    let foundB = false;
    let foundC = false;
    let foundD = false;
    let foundE = false;
    let foundF = false;

    for (const c of str) {
        if (c === 'a') {
            foundA = true;
        }
        else if (foundA && c === 'b') {
            foundB = true;
        }
        else if (foundA && foundB && c === 'c') {
            foundC = true;
        }
        else if (foundA && foundB && foundC && c === 'd') {
            foundD = true;
        }
        else if (foundA && foundB && foundC && foundD && c === 'e') {
            foundE = true;
        }
        else if (foundA && foundB && foundC && foundD && foundE && c === 'f') {
            foundF = true;
        }
        else foundA=false;
    }
    return foundF
}

console.log(findChartABCDEF('I am abcdedabcdef'))
