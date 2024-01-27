const WebSocket = require("ws");
const ws = new WebSocket("wss://ws.kraken.com");
const fs = require("fs");
const market = require("./paperMarket.js");
const algorithm = require("./alg2.js");

// config stuff
const min = (minutes) => minutes * 60000;
const pair = "USDT/USD";
let aggregator = new algorithm.DataAggregator(55 * 2, pair);
let previousTimestamp = 0;

//not used for live trading
let portfolio = {
	USD: 2000,
	USDT: 0,
};

// poor man's logger
const logFile = 'bot.log';
function writeToLogFile(message) {
	fs.appendFileSync(logFile, `${new Date().toLocaleString('en-US', { timeZone: 'EST' })} | ` + message + '\n', (err) => {
		if (err) throw err;
	});
}


const originalConsoleLog = console.log;
console.log = function(message) {
	originalConsoleLog(message);
	writeToLogFile(message);
};

//here is the start of the real code
ws.on("open", function open() {
	console.log("[MKT] >> Connected");
	const subscribeMessage = {
		event: "subscribe",
		pair: [pair],
		subscription: {
			name: "trade",
		},
	};

	ws.send(JSON.stringify(subscribeMessage));
});

ws.on("message", function incoming(data) {
	//delay check
	const currentTimestamp = Date.now();
	if (currentTimestamp - previousTimestamp < 1000) return;

	try {
		const jsonData = JSON.parse(data);
		if (jsonData.event && jsonData.event === "systemStatus") {
			console.log(
				`[WSS] >> Stream API ${jsonData.status} | Kraken API version ${jsonData.version}`
			);
		} else if (
			jsonData[2] === "trade" &&
			jsonData[3] === pair &&
			aggregator.ready === true
		) {
			previousTimestamp = currentTimestamp;
			const trades = jsonData[1];
			const trade = trades[trades.length - 1];
			const currentPrice = parseFloat(trade[0]);

			console.log(`[MKT] >> Current Price: ${currentPrice} USD`);

			const signal = algorithm.getSignal(aggregator);
			console.log(`[ALG] >> Signal: ${signal}`);

			// logic for buying and selling
			if (signal === "buy") {
				market.buyToken(currentPrice, portfolio);
			} else if (signal === "sell") {
				market.sellToken(currentPrice, portfolio);
			}
		}
	} catch (e) {
		console.log("Error:" + e);
	}
});

setInterval(() => {
	ws.ping();
}, 300000)

ws.on("close", function close() {
	console.log("[MKT] >> Disconnected");
});
