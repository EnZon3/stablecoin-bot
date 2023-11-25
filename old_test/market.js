const fs = require('fs');

const buyToken = async (price, portfolio) => {
	const amountToBuy = 1000;
	if (portfolio.USD >= amountToBuy * price) {
		portfolio.USD -= amountToBuy * price;
		portfolio.USDT += amountToBuy;

		console.log(`[TRD] >> Bought USDT at ${price} USD`);
		fs.writeFileSync('save.json', JSON.stringify(portfolio));
	} else {
		console.log('no money AAAAH')
	}
};

const sellToken = async (price, portfolio) => {
	if (portfolio.USDT > 0) {
		portfolio.USD += portfolio.USDT * price;

		console.log(`[TRD] >> Sold all USDT at ${price} USD`);
		portfolio.USDT = 0;
		fs.writeFileSync('save.json', JSON.stringify(portfolio));
	}
};

module.exports = { buyToken, sellToken };