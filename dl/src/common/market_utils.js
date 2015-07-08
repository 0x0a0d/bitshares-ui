import utils from "./utils";
import {
    object_type
}
from "chain/chain_types";
var opTypes = Object.keys(object_type);

class MarketUtils {
    constructor() {
        this.order_type = this.order_type.bind(this);
    }

    // static parse_order(newOrder) {
    //     let o = newOrder[0][1];
    //     let orderType = this.order_type(newOrder[1][1]);
    //     let order = {};
    //     switch (orderType) {

    //         case "limit_order":
    //             o.expiration = new Date(o.expiration);
    //             console.log("new limit order:", orderType, newOrder);

    //             order = {
    //                 expiration: o.expiration,
    //                 for_sale: o.amount_to_sell.amount,
    //                 id: newOrder[1][1],
    //                 sell_price: {
    //                     base: {
    //                         amount: parseInt(o.min_to_receive.amount, 10) / parseInt(o.amount_to_sell.amount),
    //                         asset_id: o.min_to_receive.asset_id
    //                     },
    //                     quote: {
    //                         amount: 1,
    //                         asset_id: parseInt(o.amount_to_sell.asset_id, 10)

    //                     }
    //                 },
    //                 seller: o.seller
    //             };

    //             break;

    //         case "short_order":
    //             o.expiration = new Date(o.expiration);
    //             console.log("new short order:", orderType, newOrder);

    //             order = {
    //                 expiration: o.expiration,
    //                 for_sale: o.amount_to_sell.amount,
    //                 id: newOrder[1][1],
    //                 sell_price: {
    //                     base: {
    //                         amount: parseInt(o.min_to_receive.amount, 10) / parseInt(o.amount_to_sell.amount, 10),
    //                         asset_id: o.min_to_receive.asset_id
    //                     },
    //                     quote: {
    //                         amount: 1,
    //                         asset_id: o.amount_to_sell.asset_id
    //                     }
    //                 },
    //                 seller: o.seller
    //             };
    //             break;

    //         default:
    //             break;
    //     }

    //     return {
    //         order: order,
    //         orderType: orderType
    //     };
    // }

    static order_type(id) {
        if (typeof id !== "string") {
            return false;
        }
        var type = id.split(".")[1];
        return opTypes[type];
    }

    static isAsk(order, base) {
        return order.sell_price.quote.asset_id === base.id;
    }

    static isAskOp(op) {
        return op.amount_to_sell.asset_id !== op.fee.asset_id;
    }

    static parseOrder(order, base, quote) {
        let ask = this.isAsk(order, base);
        let quotePrecision = utils.get_asset_precision(quote.precision);
        let basePrecision = utils.get_asset_precision(base.precision);
        let buy = ask ? order.sell_price.base : order.sell_price.quote;
        let sell = ask ? order.sell_price.quote : order.sell_price.base;

        let price = {full: (sell.amount / basePrecision) / (buy.amount / quotePrecision)};
        let amount;

        // We need to figure out a better way to set the number of decimals
        let price_split = price.full.toFixed(4).split(".");
        price.int = price_split[0];
        price.dec = price_split[1];

        if (!ask) {
            amount = (buy.amount / sell.amount) * order.for_sale / quotePrecision;
        } else {
            amount = order.for_sale / quotePrecision;
        }

        let value = price.full * amount;

        return {
            value: value,
            price: price,
            amount: amount
        };
    }

    static flatten_orderbookchart(array, sumBoolean, inverse, precision) {
        inverse = inverse === undefined ? false : inverse;
        let orderBookArray = [];
        let maxStep, arrayLength = array.length;

        // Sum orders at same price
        // if (arrayLength > 1) {
        //     for (var i = arrayLength - 2; i >= 0; i--) {
        //         if (array[i].x === array[i + 1].x) {
        //             console.log("found order to sum");
        //             array[i].y += array[i + 1].y;
        //             array.splice(i + 1, 1);
        //         }
        //     }
        // }
        // arrayLength = array.length;

        if (inverse) {

            if (array && arrayLength) {
                arrayLength = arrayLength - 1;
                orderBookArray.unshift({x: array[arrayLength].x, y: array[arrayLength].y});
                if (array.length > 1) {
                    for (let i = array.length - 2; i >= 0; i--) {
                        maxStep = Math.min((array[i + 1].x - array[i].x) / 2, 0.1 / precision);
                        orderBookArray.unshift({x: array[i].x + maxStep, y: array[i + 1].y});
                        if (sumBoolean) {
                            array[i].y += array[i + 1].y;
                        }
                        orderBookArray.unshift({x: array[i].x, y: array[i].y});
                    }
                } else {
                    orderBookArray.unshift({x: 0, y: array[arrayLength].y});
                }
            }
        } else {
            if (array && arrayLength) {
                orderBookArray.push({x: array[0].x, y: array[0].y});
                if (array.length > 1) {
                    for (let i = 1; i < array.length; i++) {
                        maxStep = Math.min((array[i].x - array[i - 1].x) / 2, 0.1 / precision);
                        orderBookArray.push({x: array[i].x - maxStep, y: array[i - 1].y});
                        if (sumBoolean) {
                            array[i].y += array[i - 1].y;
                        }
                        orderBookArray.push({x: array[i].x, y: array[i].y});
                    }
                } else {
                    orderBookArray.push({x: array[0].x * 1.5, y: array[0].y});
                }
            }
        }
        return orderBookArray;
    }

    static flatten_orderbookchart_highcharts(array, sumBoolean, inverse, precision) {
        inverse = inverse === undefined ? false : inverse;
        let orderBookArray = [];
        let maxStep, arrayLength;

        if (inverse) {

            if (array && array.length) {
                arrayLength = array.length - 1;
                orderBookArray.unshift([array[arrayLength][0], array[arrayLength][1]]);
                if (array.length > 1) {
                    for (let i = array.length - 2; i >= 0; i--) {
                        maxStep = Math.min((array[i + 1][0] - array[i][0]) / 2, 0.1 / precision);
                        orderBookArray.unshift([array[i][0] + maxStep, array[i + 1][1]]);
                        if (sumBoolean) {
                            array[i][1] += array[i + 1][1];
                        }
                        orderBookArray.unshift([array[i][0], array[i][1]]);
                    }
                } else {
                    orderBookArray.unshift([0, array[arrayLength][1]]);
                }
            }
        } else {
            if (array && array.length) {
                orderBookArray.push([array[0][0], array[0][1]]);
                if (array.length > 1) {
                    for (var i = 1; i < array.length; i++) {
                        maxStep = Math.min((array[i][0] - array[i - 1][0]) / 2, 0.1 / precision);
                        orderBookArray.push([array[i][0] - maxStep, array[i - 1][1]]);
                        if (sumBoolean) {
                            array[i][1] += array[i - 1][1];
                        }
                        orderBookArray.push([array[i][0], array[i][1]]);
                    }
                } else {
                    orderBookArray.push([array[0][0] * 1.5, array[0][1]]);
                }
            }
        }
        return orderBookArray;
    }

}

export default MarketUtils;
