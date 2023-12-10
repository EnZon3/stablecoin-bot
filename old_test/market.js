const fs = require("fs");
const crypto = require("crypto");
const qs = require("qs");
const axios = require("axios");

const api_url = "https://api.kraken.com";

const api_key = process.env['API_KEY'];
const api_secret = process.env['API_SECRET'];

const getMessageSignature = (path, request, secret, nonce) => {
	const message = qs.stringify(request);
	const secret_buffer = new Buffer(secret, 'base64');
	const hash = new crypto.createHash('sha256');
	const hmac = new crypto.createHmac('sha512', secret_buffer);
	const hash_digest = hash.update(nonce + message).digest('binary');
	const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');

	return hmac_digest;
};

const amountToBuy = 100;

// Variable to track purchase price
let lastPurchasePrice = null;

const krakenRequest = (uriPath, data, apiKey, apiSecret) => {
	const nonce = data.nonce;
	const headers = {
		"API-Key": apiKey,
		"API-Sign": getMessageSignature(uriPath, data, apiSecret, nonce),
	};
	return axios.post(api_url + uriPath, qs.stringify(data), {
		headers: headers,
	});
};

const trade = (type, volume) => {
	const data = {
		"pair": "USDTZUSD",
		"type": type,
		"ordertype": "limit",
		"volume": volume,
		"nonce": `${new Date().getTime() + 1}`,
	};
	return krakenRequest("/0/private/AddOrder", data, api_key, api_secret);
};

const buyToken = async (price) => {
	const balance = await krakenRequest(
		"/0/private/Balance",
		{
			nonce: `${new Date().getTime() + 1}`,
		},
		api_key,
		api_secret
	);
	const portfolio = balance.data.result;

	if (portfolio.ZUSD >= amountToBuy * price) {
		trade('buy', amountToBuy, price).then(response => {
			console.log(`[TRD] >> Bought USDT at ${price} USD\n`);
			console.log(response)
			// Update the last purchase price
			lastPurchasePrice = price;
		}).catch(error => {
			console.error('[TRD] >> Error buying USDT:', error.data);
		});
	} else {
		console.log("[TRD] >> Insufficient funds");
	}
};

const sellToken = async (price) => {
	const balance = await krakenRequest(
		"/0/private/Balance",
		{
			nonce: `${new Date().getTime() + 1}`,
		},
		api_key,
		api_secret
	);
	const portfolio = balance.data.result;

	if (portfolio.USDT > 0 && portfolio.USDT != null && price > lastPurchasePrice) {
		// Ensure current selling price is above the purchase price
		trade('sell', portfolio.USDT, price).then(response => {
			console.log(`[TRD] >> Sold all USDT at ${price} USD above purchase price of ${lastPurchasePrice} USD\n`);
		})
			.catch(error => console.error('[TRD] >> Error selling USDT:', error.data));
	} else if (price <= lastPurchasePrice) {
		console.log(`[TRD] >> Attempt to sell at ${price} USD which is not above the purchase price of ${lastPurchasePrice} USD. Aborting sell.`);
	}
};

module.exports = { buyToken, sellToken };