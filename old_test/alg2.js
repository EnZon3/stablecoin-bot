const WebSocket = require('ws');
const axios = require('axios');

class DataAggregator {
	dataArr = [];
	ready = false;
	dataArrLen = 0;

	constructor(min, pair) {
		this.pair = pair;
		this.ws = new WebSocket('wss://ws.kraken.com');
		this.ws.on('message', (async function incoming(data) {
			try {
				const jsonData = JSON.parse(data);

				if (jsonData[2] === 'trade' && jsonData[3] === this.pair) {
					const trades = jsonData[1];
					const trade = trades[trades.length - 1];
					const currentPrice = parseFloat(trade[0]);

					// Always keep the dataArr array with the latest prices, but no longer than dataArrLen
					this.dataArr.push(currentPrice);
					if (this.dataArr.length > min) {
						this.dataArr.shift(); // remove the oldest price
						this.ready = true;
					}

					if (this.ready === false) {
						console.log(`[ALG] >> tick ${this.dataArr.length}`);
					}
				}
			} catch (e) {
				console.log('Error in parsing to JSON', e);
			}
		}).bind(this));

		this.ws.on('open', (function open() {
			const subscribeMessage = {
				"event": "subscribe",
				"pair": [
					this.pair
				],
				"subscription": {
					"name": "trade"
				}
			}

			this.ws.send(JSON.stringify(subscribeMessage));
		}).bind(this));

		this.ws.on('ping', (function ping() {
			console.log('pong');
			this.ws.pong();
		}).bind(this));

		this.ws.on('open', (function open() {
			this.ws.ping();
			console.log('[ALG] >> Data aggregator running');
		}).bind(this));

		this.ws.on('close', (function close() {
			console.log('[ALG] >> Data Aggregator disconnected!');
			this.ws = new WebSocket('wss://ws.kraken.com');
		}).bind(this));
		
		setInterval(() => {
			this.ws.ping();
		}, 300000)
	}
}

const getThresholds = (data) => {
	// Define a function to calculate the average of an array
	const calculateAverage = (array) => array.reduce((sum, value) => sum + value, 0) / array.length;

	try {
		const averagePrice = calculateAverage(data);

		const halfData = data.slice(0, data.length / 2);

		// Filter for anything above the average price, then calculate the average of it.
		const highs = halfData.filter((value) => value > averagePrice);
		const highThresh = calculateAverage(highs);

		// Do the same for low.
		const lows = halfData.filter((value) => value < averagePrice);
		const lowThresh = calculateAverage(lows);

		// Return the pivot, high, and low values
		return { pivot: averagePrice, high: highThresh, low: lowThresh };
	} catch (error) {
		console.error("[ALG] >> Data Error:", error);
	}
};

const getSignal = (aggregator) => {
	//use only half of the array for the calculations under this
	const data = aggregator.dataArr.slice(0, aggregator.dataArr.length / 2);
	
	let thresholds = getThresholds(data);

	const highs = data.filter((value) => value > thresholds.high).length;
	const lows = data.filter((value) => value < thresholds.low).length;

	//get percentages based from indexes
	const highPercent = (highs / data.length) * 100;
	const lowPercent = (lows / data.length) * 100;
	console.log(`[ALG] >> High: ${highPercent}%, Low: ${lowPercent}%`)

	// if percentage on any side higher than x%, buy or sell
	const x = 65;
	const y = 55;
	if (highPercent > x) {
		return 'buy';
	} else if (lowPercent > y) {
		return 'sell';
	} else {
		return 'hold';
	}
};

module.exports = { DataAggregator, getThresholds, getSignal };