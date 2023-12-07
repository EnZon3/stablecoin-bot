const WebSocket = require('ws');
const axios = require('axios');

class DataAggregator {
	dataArr = [];
	ready = false;
	dataArrLen = 0;

	constructor(readyPos, min, pair) {
		this.readyPos = readyPos;
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
					if (this.dataArr.length > this.dataArrLen) {
						this.dataArr.shift(); // remove the oldest price
					}
					// Update the dataArrLen after ensuring it's at least equal to 'min'.
					this.dataArrLen = Math.max(this.dataArr.length, min);
					
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
			setTimeout(() => {
				this.ready = true;
				console.log('[ALG] >> Ready');
				console.log(this.dataArrLen);
			}, this.readyPos);
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
		}).bind(this));
	}
}

const fetchData = (data) => {
	// Define a function to calculate the average of an array
	const calculateAverage = (array) => array.reduce((sum, value) => sum + value, 0) / array.length;

	try {
		const averagePrice = calculateAverage(data);

		// Filter for anything above the average price, then calculate the average of it.
		const highs = data.filter((value) => value > averagePrice);
		const highThresh = calculateAverage(highs);

		// Do the same for low.
		const lows = data.filter((value) => value < averagePrice);
		const lowThresh = calculateAverage(lows);

		// Return the pivot, high, and low values
		return { pivot: averagePrice, high: highThresh, low: lowThresh };
	} catch (error) {
		console.error("[ALG] >> Data Error:", error);
	}
};

module.exports = { DataAggregator, fetchData };