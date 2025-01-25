const runBtn = document.getElementById('run-btn');

let responses = {};
let playersData, trophiesData, countriesData, managersData, clubsData, teammatesData, famousPlayers;

if (runBtn) {
    runBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: extractHTML
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    const htmlContent = results[0].result;
                    loadAllJSONData().then(jsonDataArray => {
                        clubsData = jsonDataArray[0];
                        countriesData = jsonDataArray[1];
                        managersData = jsonDataArray[2];
                        playersData = jsonDataArray[3];
                        teammatesData = jsonDataArray[4];
                        trophiesData = jsonDataArray[5];
                        processHTMLContent(htmlContent, jsonDataArray);
                    });
                }
            });
        });
    });
} else {
    console.log('Element with ID "run-btn" not found');
}

function loadJSONData(fileName) {
    return fetch(chrome.runtime.getURL(fileName))
        .then(response => response.json())
        .catch(err => console.error(`Erro ao carregar ${fileName}:`, err));
}

function loadAllJSONData() {
    const files = [
        "databases/clubs.json",
        "databases/countries.json",
        "databases/managers.json",
        "databases/players.json",
        "databases/teammates.json",
        "databases/trophies.json",
        "databases/famous-players.json"
    ];

    return Promise.all(files.map(file => loadJSONData(file)));
}

function extractHTML() {
    return document.documentElement.outerHTML;
}

function processHTMLContent(htmlContent, jsonDataArray) {
    const headers = findHeaders(htmlContent);
    famousPlayers = loadFamousPlayers(jsonDataArray[6]);

    const row = headers.slice(0, 3);
    const col = headers.slice(3, 6);

    localStorage.setItem('ticTacToeRow', JSON.stringify(row));
    localStorage.setItem('ticTacToeCol', JSON.stringify(col));

    solveFootballTicTacToe(row, col);
    printShuffledResponses(row, col);
    document.getElementById('result').innerText = "Dados processados com sucesso!";
}

function findHeaders(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const divs = doc.querySelectorAll('div.font-bebas-neue.text-xl, div.mt-1.text-center.leading-none.font-bebas-neue');

    return Array.from(divs).map(div => div.textContent.replace(/[^A-Za-z\s]/g, '').trim());
}

function loadFamousPlayers(jsonData) {
    return jsonData.map(player => player.n);
}

function getData(name) {
    for (const club of clubsData) {
        if (club.short_code === name) {
            return { t: club.id };
        }
    }

    for (const manager of managersData) {
        if (manager.name === name) {
            return { m: manager.id };
        }
    }

    for (const teammate of teammatesData) {
        if (teammate.name === name) {
            return { s: teammate.id };
        }
    }

    for (const trophy of trophiesData) {
        if (trophy.name === name) {
            return { a: trophy.id };
        }
    }

    for (const country of countriesData) {
        if (country.name === name) {
            return { c: country.id };
        }
    }
}

function findPlayer(row, col) {
    responses[`${row}/${col}`] = [];

    const rowData = getData(row);
    const rowKey = Object.keys(rowData)[0];
    const rowValue = rowData[rowKey];

    const colData = getData(col);
    const colKey = Object.keys(colData)[0];
    const colValue = colData[colKey];

    for (const player of playersData) {
        if (rowKey === 'c' && colKey !== 'c' && player[rowKey] === rowValue && player[colKey] && player[colKey].includes(colValue)) {
            responses[`${row}/${col}`].push(player.n);
            continue;
        }

        if (colKey === 'c' && rowKey !== 'c' && player[colKey] === colValue && player[rowKey] && player[rowKey].includes(rowValue)) {
            responses[`${row}/${col}`].push(player.n);
            continue;
        }

        if (rowKey === 'c' && colKey === 'c' && player[rowKey] === rowValue && player[colKey] === colValue) {
            responses[`${row}/${col}`].push(player.n);
            continue;
        }

        if (rowKey !== 'c' && colKey !== 'c' && player[rowKey] && player[rowKey].includes(rowValue) && player[colKey] && player[colKey].includes(colValue)) {
            responses[`${row}/${col}`].push(player.n);
        }
    }
}

function solveFootballTicTacToe(rowInput, colInput) {
    for (let i = 0; i < rowInput.length; i++) {
        for (let j = 0; j < colInput.length; j++) {
            findPlayer(rowInput[i], colInput[j]);
        }
    }
}

function printShuffledResponses(rowData, colData) {
    const savedRow = JSON.parse(localStorage.getItem('ticTacToeRow'));
    const savedCol = JSON.parse(localStorage.getItem('ticTacToeCol'));

    const limit = 3;
    let results = {};

    for (let i = 0; i < limit; i++) {
        for (let j = 0; j < limit; j++) {
            let key;
            if (savedRow) {
                key = `${savedRow[i]}/${savedCol[j]}`;
            } else {
                key = `${rowData[i]}/${colData[j]}`;
            }

            let response = responses[key];

            const cell = document.getElementById(`cell-${i}-${j}`);

            if (response) {
                response = response.sort((a, b) => famousPlayers.includes(a) ? -1 : 1);
                response = response.slice(0, 5);
                cell.textContent = response.join(', ');
                results[key] = response;
            } else {
                cell.textContent = 'N/A';
            }
        }
    }

    localStorage.setItem('ticTacToeResults', JSON.stringify(results));
}

document.addEventListener('DOMContentLoaded', () => {
    const savedResults = localStorage.getItem('ticTacToeResults');
    const savedRow = JSON.parse(localStorage.getItem('ticTacToeRow'));
    const savedCol = JSON.parse(localStorage.getItem('ticTacToeCol'));
    console.log(savedRow);
    console.log(savedCol);

    if (savedResults) {
        const results = JSON.parse(savedResults);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const key = `${savedRow[j]}/${savedCol[i]}`;
                let response = results[key];
                const cell = document.getElementById(`cell-${i}-${j}`);
                console.log(cell);

                if (response) {
                    cell.textContent = response.join(', ');
                } else {
                    cell.textContent = 'N/A';
                }
            }
        }
    }
});
