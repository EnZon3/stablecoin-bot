const WebSocket = require('ws');
const axios = require('axios');

class DataAggregator {
	dataArr = [];
	ready = false;
	dataArrLen = 0;

	constructor(readyPos, min) {
		this.readyPos = readyPos;
		this.ws = new WebSocket('wss://ws.kraken.com');
		this.ws.on('message', (async function incoming(data) {
			try {
				const jsonData = JSON.parse(data);

				if (jsonData[2] === 'trade' && jsonData[3] === 'USDT/EUR') {
					const trades = jsonData[1];
					const trade = trades[trades.length - 1];
					const currentPrice = parseFloat(trade[0]);

					if (!this.ready || this.dataArr.length < this.dataArrLen) {
						this.dataArr.push(currentPrice);
						this.dataArrLen = this.dataArr.length < min ? min : this.dataArr.length;
						console.log(`[ALG] >> tick ${this.dataArr.length}`);
					} else {
						if (this.dataArr.length > this.dataArrLen) {
							this.dataArr.shift();
							this.dataArr.push(currentPrice);
						}
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
					"USDT/EUR"
				],
				"subscription": {
					"name": "trade"
				}
			}

			this.ws.send(JSON.stringify(subscribeMessage));
			setTimeout(() => {
				this.ready = true;
				console.log('[ALG] >> Ready');
				console.log(this.dataArrLen)
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

		// filter for anything above the average price, then calculate the average of it
		const highs = data.filter((value) => value > averagePrice);
		const highThresh = calculateAverage(highs);

		// do the same for low
		const lows = data.filter((value) => value < averagePrice);
		const lowThresh = calculateAverage(lows);

		// return
		console.log({ pivot: averagePrice, high: highThresh, low: lowThresh })
		return { pivot: averagePrice, high: highThresh, low: lowThresh };
	} catch (error) {
		console.error("[ALG] >> Data Error:", error);
	}
};

module.exports = { DataAggregator, fetchData };