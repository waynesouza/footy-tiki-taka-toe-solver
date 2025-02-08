const runBtn = document.getElementById('run-btn');

let responses = {};
let data, playersData, famousPlayers;

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
                        data = jsonDataArray[0];
                        playersData = jsonDataArray[1];
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
        "databases/data.json",
        "databases/players.json",
        "databases/famous-players.json"
    ];

    return Promise.all(files.map(file => loadJSONData(file)));
}

function extractHTML() {
    return document.documentElement.outerHTML;
}

function processHTMLContent(htmlContent, jsonDataArray) {
    const headers = findHeaders(htmlContent);
    famousPlayers = loadFamousPlayers(jsonDataArray[2]);

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

    const images = doc.querySelectorAll('img[src*="/media/categories/"]');
    const numbers = [];

    images.forEach(img => {
        const src = img.getAttribute('src');
        const match = src.match(/\/media\/categories\/(\d+)\.webp/);
        if (match) {
            numbers.push(match[1]);
        }
    });

    return numbers;
}

function loadFamousPlayers(jsonData) {
    return jsonData.map(player => player.n);
}

function findPlayer(row, col) {
    responses[`${row}/${col}`] = [];

    for (const player of playersData) {

        const attr = 'v'

        if (player[attr].includes(parseInt(row)) && player[attr].includes(parseInt(col))) {
            responses[`${row}/${col}`].push(player['n']);
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
                response = response.sort((a) => famousPlayers.includes(a) ? -1 : 1);
                response = response.slice(0, 5);
                cell.innerHTML = response.join('\n').replace(/\n/g, '<br>');
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

    if (savedResults) {
        const results = JSON.parse(savedResults);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const key = `${savedRow[j]}/${savedCol[i]}`;
                let response = results[key];
                const cell = document.getElementById(`cell-${i}-${j}`);
                console.log(cell);

                if (response) {
                    cell.innerHTML = response.join('\n').replace(/\n/g, '<br>');  // Replacing \n with <br>
                } else {
                    cell.textContent = 'N/A';
                }
            }
        }
    }
});
