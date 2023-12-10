const WebSocket = require("ws");
const ws = new WebSocket("wss://ws.kraken.com");
const market = require("./market.js");

const algorithm = require("./alg2.js");
const min = (minutes) => minutes * 60000;
const pair = "USDT/USD";
let aggregator = new algorithm.DataAggregator(min(5), 100, pair);
const delayAgo = new Date().getTime()

let portfolio = {
	USD: 2000,
	USDT: 0,
};

let pivot;
let high;
let low;

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
			const trades = jsonData[1];
			const trade = trades[trades.length - 1];
			const currentPrice = parseFloat(trade[0]);

			console.log(`[MKT] >> Current Price: ${currentPrice} USD`);

			const signal = algorithm.getSignal(aggregator);
			console.log(`[ALG] >> Signal: ${signal}`);

			// logic for buying and selling
			// if current time x seconds ago than delayAgo return
			if (new Date().getTime() - delayAgo < min(5)) { return; }
			if (signal === "buy") {
				market.buyToken(currentPrice);
			} else if (signal === "sell") {
				market.sellToken(currentPrice);
			}
		}
	} catch (e) {
		console.log("Error:" + e);
	}
});

ws.on("close", function close() {
	console.log("[MKT] >> Disconnected");
});
