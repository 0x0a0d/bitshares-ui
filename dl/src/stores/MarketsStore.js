var Immutable = require("immutable");
var alt = require("../alt-instance");
var MarketsActions = require("../actions/MarketsActions");
var SettingsActions = require("../actions/SettingsActions");
var market_utils = require("../common/market_utils");
import utils from "common/utils";

import {
    LimitOrder,
    ShortOrder,
    CallOrder
}
from "./tcomb_structs";

class MarketsStore {
    constructor() {
        this.markets = Immutable.Map();
        this.asset_symbol_to_id = {};
        this.pendingOrders = Immutable.Map();
        this.activeMarketLimits = Immutable.Map();
        this.activeMarketCalls = Immutable.Map();
        this.activeMarketSettles = Immutable.Map();
        this.flat_bids = [];
        this.flat_asks = [];
        this.pendingCreateLimitOrders = [];
        this.pendingCancelLimitOrders = {};
        this.activeMarket = null;
        this.inverseMarket = true;
        this.quoteAsset = null;
        this.pendingCounter = 0;

        this.baseAsset = {
            id: "1.4.0",
            symbol: "CORE",
            precision: 5
        };

        this.bindListeners({
            onSubscribeMarket: MarketsActions.subscribeMarket,
            onGetMarkets: MarketsActions.getMarkets,
            onCreateLimitOrder: MarketsActions.createLimitOrder,
            onCancelLimitOrder: MarketsActions.cancelLimitOrder,
            onChangeBase: MarketsActions.changeBase,
            onInverseMarket: SettingsActions.changeSetting
        });
    }

    onInverseMarket(payload) {
        if (payload.setting === "inverseMarket") {
            this.inverseMarket = payload.value;

            // Handle market inversion
        } else {
            return false;
        }
    }

    onChangeBase(market) {
        this.baseAsset = market;
    }

    onSubscribeMarket(result) {

        if (result.market && (result.market !== this.activeMarket)) {
            console.log("switch active market from", this.activeMarket, "to", result.market);
            this.activeMarket = result.market;
            this.quoteAsset = {
                id: result.quote.id,
                precision: result.quote.precision
            };
            this.baseAsset = {
                id: result.base.id,
                symbol: result.base.symbol,
                precision: result.base.precision
            };
            this.activeMarketLimits = this.activeMarketLimits.clear();
            this.activeMarketCalls = this.activeMarketCalls.clear();
            this.activeMarketSettles = this.activeMarketSettles.clear();
        }

        if (result.limits) {
            result.limits.forEach(order => {
                
                // Loop over pending orders to remove temp order from orders map and remove from pending
                for (var i = this.pendingCreateLimitOrders.length - 1; i >= 0; i--) {
                    let myOrder = this.pendingCreateLimitOrders[i];
                    if (myOrder.seller === order.seller && myOrder.expiration === order.expiration) {
                        this.activeMarketLimits = this.activeMarketLimits.delete(myOrder.id);
                        this.pendingCreateLimitOrders.splice(i, 1);
                    }
                }

                if (this.pendingCreateLimitOrders.length === 0) {
                    this.pendingCounter = 0;
                }

                order.for_sale = parseInt(order.for_sale, 10);
                order.expiration = new Date(order.expiration);
                this.activeMarketLimits = this.activeMarketLimits.set(
                    order.id,
                    LimitOrder(order)
                );
            });
        }

        if (result.calls) {
            result.calls.forEach(call => {
                call.expiration = new Date(call.expiration);
                this.activeMarketCalls = this.activeMarketCalls.set(
                    call.id,
                    CallOrder(call)
                );
            });
        }

        if (result.settles) {
            result.settles.forEach(settle => {
                settle.expiration = new Date(settle.expiration);
                this.activeMarketSettles = this.activeMarketSettles.set(
                    settle.id,
                    ShortOrder(settle)
                );
            });
        }

        this._depthChart();


        // if (result.sub) {
        //     result.sub.forEach(newOrder => {
        //         let {order, orderType} = market_utils.parse_order(newOrder);

        //         switch (orderType) {
        //             case "limit_order":
        //                 this.activeMarketLimits = this.activeMarketLimits.set(
        //                     order.id,
        //                     LimitOrder(order)
        //                 );
        //                 break;

        //             case "short_order":
        //                 this.activeMarketShorts = this.activeMarketShorts.set(
        //                     order.id,
        //                     ShortOrder(order)
        //                 );
        //                 break;

        //             default:
        //                 break;
        //         }

        //     });

        // }
    }

    onCreateLimitOrder(e) {
        this.pendingCounter++;
        if (e.newOrder) { // Optimistic update
            e.newOrder.id = `${e.newOrder.seller}_${this.pendingCounter}`;
            this.pendingCreateLimitOrders.push({id: e.newOrder.id, seller: e.newOrder.seller, expiration: e.newOrder.expiration});
            e.newOrder.for_sale = parseInt(e.newOrder.for_sale, 10);
            e.newOrder.expiration = new Date(e.newOrder.expiration);
            this.activeMarketLimits = this.activeMarketLimits.set(
                e.newOrder.id,
                LimitOrder(e.newOrder)
            );
        }

        if (e.failedOrder) { // Undo order if failed
            let uid;
            for (var i = this.pendingCreateLimitOrders.length - 1; i >= 0; i--) {
                if (this.pendingCreateLimitOrders[i].expiration === e.failedOrder.expiration) {
                    console.log("found failed order to remove", this.pendingCreateLimitOrders[i]);
                    uid = this.pendingCreateLimitOrders[i].id;
                    this.pendingCreateLimitOrders.splice(i, 1);
                    this.activeMarketLimits = this.activeMarketLimits.delete(uid);
                    break;
                }
            }

            if (this.pendingCreateLimitOrders.length === 0) {
                this.pendingCounter = 0;
            }
        }

        this._depthChart();
    }

    onCancelLimitOrder(e) {
        if (e.newOrderID) { // Optimistic update
            this.pendingCancelLimitOrders[e.newOrderID] = this.activeMarketLimits.get(e.newOrderID);
            this.activeMarketLimits = this.activeMarketLimits.delete(e.newOrderID);
        }

        if (e.failedOrderID) { // Undo removal if cancel failed
            this.activeMarketLimits = this.activeMarketLimits.set(
                e.failedOrderID,
                this.pendingCancelLimitOrders[e.failedOrderID]
            );

            delete this.pendingCancelLimitOrders[e.failedOrderID];
        }

        // Update depth chart
        this._depthChart();
    }

    onGetMarkets(markets) {
        markets.forEach(market => {
            this.markets = this.markets.set(
                market.id,
                market);
        });
    }

    _depthChart() {
        let quotePrecision = utils.get_asset_precision(this.quoteAsset.precision);
        let basePrecision = utils.get_asset_precision(this.baseAsset.precision);

        let bids = [], asks = [];
        if (this.activeMarketLimits) {
            this.activeMarketLimits
            .filter(a => {
                let isAskOrder = market_utils.isAsk(a, this.baseAsset);
                return !isAskOrder;
            })
            .sort((a, b) => {
                let {buy: a_buy, sell: a_sell} = market_utils.parseOrder(a, false);
                let {buy: b_buy, sell: b_sell} = market_utils.parseOrder(b, false);

                let a_price = (a_sell.amount / basePrecision) / (a_buy.amount / quotePrecision);
                let b_price = (b_sell.amount / basePrecision) / (b_buy.amount / quotePrecision);
                return a_price > b_price;
            }).map(order => {
                let {buy, sell} = market_utils.parseOrder(order, false);
                let price = (sell.amount / basePrecision) / (buy.amount / quotePrecision);

                // d3 format
                // bids.push({
                //     x: price,
                //     y: buy.amount / quotePrecision
                // });

                // highcharts format
                bids.push([price, buy.amount / quotePrecision]);
            });

            this.activeMarketLimits
            .filter(a => {
                let isAskOrder = market_utils.isAsk(a, this.baseAsset);
                return isAskOrder;
            })
            .sort((a, b) => {
                let {buy: a_buy, sell: a_sell} = market_utils.parseOrder(a, true);
                let {buy: b_buy, sell: b_sell} = market_utils.parseOrder(b, true);

                let a_price = (a_sell.amount / basePrecision) / (a_buy.amount / quotePrecision);
                let b_price = (b_sell.amount / basePrecision) / (b_buy.amount / quotePrecision);
                return a_price > b_price;
            }).map(order => {
                let {buy, sell} = market_utils.parseOrder(order, true);
                let price = (sell.amount / basePrecision) / (buy.amount / quotePrecision);

                // d3 format
                // asks.push({
                //     x: price,
                //     y: buy.amount / quotePrecision
                // });

                // highcharts format
                asks.push([price, buy.amount / quotePrecision]);

            });

            // Make sure the arrays are sorted properly
            asks.sort((a, b) => {
                return a[0] - b[0];
            })

            bids.sort((a, b) => {
                return a[0] - b[0];
            })


            let flat_bids = market_utils.flatten_orderbookchart_highcharts(bids, true, true, 1000);
            if (flat_bids.length > 0) {
                flat_bids.unshift([0, flat_bids[0][1]]);
            }
            let flat_asks = market_utils.flatten_orderbookchart_highcharts(asks, true, false, 1000);

            if (flat_asks.length > 0) {
                flat_asks.push([flat_asks[flat_asks.length - 1][0] * 1.5, flat_asks[flat_asks.length - 1][1]]);
            }

            // react-d3-components area chart hack
            // let bidsLength = flat_bids.length;
            // let asksLength = flat_asks.length;

            // for (let i = 0; i < asksLength; i++) {
            //     if (i === asksLength - 1) {
            //         flat_bids.push({x: flat_bids[i].x, y: 0});    
            //     }
            //     flat_bids.push({x: flat_asks[i].x, y: 0});
            // }

            // for (let i = bidsLength; i >= 0; i--) {
            //     flat_asks.unshift({x: flat_bids[i].x, y: 0});
            // }

            console.log(flat_bids);

            this.flat_asks = flat_asks;
            this.flat_bids = flat_bids;
        }



        // this.orderBook = this.orderBook.set(
        //     "bids",
        //     bids
        // );

        // this.orderBook = this.orderBook.set(
        //     "asks",
        //     asks
        // );
    }
}

module.exports = alt.createStore(MarketsStore, "MarketsStore");
