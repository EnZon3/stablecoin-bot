const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.kraken.com');
const market = require('./market.js');

const algorithm = require('./alg2.js');
const min = (minutes) => minutes * 60000;
const aggregator = new algorithm.DataAggregator(min(0.5), 9);

let portfolio = {
	USD: 2000,
	USDT: 0
};

let pivot;
let high;
let low;

ws.on('open', function open() {
	console.log('[TRD] >> Connected');
	const subscribeMessage = {
		"event": "subscribe",
		"pair": [
			"USDT/EUR"
		],
		"subscription": {
			"name": "trade"
		}
	};

	ws.send(JSON.stringify(subscribeMessage));
});

ws.on('message', function incoming(data) {
	try {
		const jsonData = JSON.parse(data);
		if (jsonData.event && jsonData.event === 'systemStatus') {
			console.log(`[WSS] >> Stream API ${jsonData.status} | Kraken API version ${jsonData.version}`)
		} else if (jsonData[2] === 'trade' && jsonData[3] === 'USDT/EUR' && aggregator.ready === true) {
			const trades = jsonData[1];
			const trade = trades[trades.length - 1];
			const currentPrice = parseFloat(trade[0]);

			console.log(`[TRD] >> Current Price: ${currentPrice} EUR`);

			[pivot, high, low] = Object.values(algorithm.fetchData(aggregator.dataArr));

			console.log(`[TRD] Action: ${currentPrice > high ? 'sell' : currentPrice < low ? 'buy' : 'hold'}`);
			console.log(`[TRD] >> Pivot: ${pivot} EUR\n[TRD] >> High: ${high} EUR\n[TRD] >> Low: ${low} EUR`)

			// logic for buying and selling
			if (currentPrice >= high.toFixed(4)) {
				market.sellToken(currentPrice, portfolio);
			} else if (currentPrice <= low.toFixed(4)) {
				market.buyToken(currentPrice, portfolio);
			}
		}
	} catch (e) {
		console.log('Error:' + e)
	}
});

ws.on('close', function close() {
	console.log('[TRD] >> Disconnected');
});