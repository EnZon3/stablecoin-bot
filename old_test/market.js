const fs = require("fs");
const crypto = require("crypto");
const qs = require("qs");
const axios = require("axios");

const api_url = "https://api.kraken.com";

const api_key = process.env['API_KEY'];
const api_secret = process.env['API_SECRET'];

const getMessageSignature = (path, request, secret, nonce) => {
	const message       = qs.stringify(request);
	const secret_buffer = new Buffer(secret, 'base64');
	const hash          = new crypto.createHash('sha256');
	const hmac          = new crypto.createHmac('sha512', secret_buffer);
	const hash_digest   = hash.update(nonce + message).digest('binary');
	const hmac_digest   = hmac.update(path + hash_digest, 'binary').digest('base64');

	return hmac_digest;
};

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
		"pair": "USDTZEUR",
		"type": type,
		"ordertype": "market",
		"volume": volume,
		"nonce": Math.floor(Math.random() * 1000000),
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
		trade('buy', amountToBuy).then(response => {
			console.log(`[TRD] >> Bought USDT at ${price} USD\n`, response.data.result.descr.order);
		}).catch(error => {
			console.error('[TRD] >> Error buying USDT:', error);
		});
	} else {
		console.log("no money AAAAH");
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
	
	if (portfolio.USDT > 0) {
		trade('sell', portfolio.USDT).then(response => {
			console.log(`[TRD] >> Sold all USDT at ${price} USD\n`, response.data.result.descr.order);
		})
		.catch(error => console.error('[TRD] >> Error selling USDT:', error));
	}
};

module.exports = { buyToken, sellToken };
