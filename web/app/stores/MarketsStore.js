var Immutable = require("immutable");
var alt = require("alt-instance");
import MarketsActions from "actions/MarketsActions";
import market_utils from "common/market_utils";
import ls from "common/localStorage";
import {ChainStore} from "graphenejs-lib";
import utils from "common/utils";
import {LimitOrder, CallOrder, FeedPrice, Asset, Price} from "common/MarketClasses";

import {
    SettleOrder
}
from "./tcomb_structs";

let marketStorage = new ls("__graphene__");

class MarketsStore {
    constructor() {
        this.markets = Immutable.Map();
        this.asset_symbol_to_id = {};
        this.pendingOrders = Immutable.Map();
        this.activeMarketLimits = Immutable.Map();
        this.activeMarketCalls = Immutable.Map();
        this.feedPrice = null;
        this.activeMarketSettles = Immutable.OrderedSet();
        this.activeMarketHistory = Immutable.OrderedSet();
        this.bids = [];
        this.asks = [];
        this.calls = [];
        this.flat_bids = [];
        this.flat_asks = [];
        this.flat_calls = [];
        this.totalBids = 0;
        this.totalCalls = 0;
        this.priceData = [];
        this.volumeData = [];
        this.pendingCreateLimitOrders = [];
        this.activeMarket = null;
        this.quoteAsset = null;
        this.pendingCounter = 0;
        this.buckets = [15,60,300,3600,86400];
        this.bucketSize = this._getBucketSize();
        this.priceHistory = [];
        this.lowestCallPrice = null;
        this.marketBase = "BTS";
        this.marketStats = Immutable.Map({
            change: 0,
            volumeBase: 0,
            volumeQuote: 0
        });
        this.marketReady = false;

        this.allMarketStats = Immutable.Map();
        this.lowVolumeMarkets = Immutable.Map();

        this.baseAsset = {
            id: "1.3.0",
            symbol: "BTS",
            precision: 5
        };

        this.coreAsset = {
            id: "1.3.0",
            symbol: "CORE",
            precision: 5
        };

        this.bindListeners({
            onSubscribeMarket: MarketsActions.subscribeMarket,
            onUnSubscribeMarket: MarketsActions.unSubscribeMarket,
            onChangeBase: MarketsActions.changeBase,
            onChangeBucketSize: MarketsActions.changeBucketSize,
            onCancelLimitOrderSuccess: MarketsActions.cancelLimitOrderSuccess,
            onCloseCallOrderSuccess: MarketsActions.closeCallOrderSuccess,
            onCallOrderUpdate: MarketsActions.callOrderUpdate,
            onClearMarket: MarketsActions.clearMarket,
            onGetMarketStats: MarketsActions.getMarketStats,
            onFeedUpdate: MarketsActions.feedUpdate,
            onSettleOrderUpdate: MarketsActions.settleOrderUpdate,
            onSwitchMarket: MarketsActions.switchMarket
        });
    }

    onGetCollateralPositions(payload) {
        this.borrowMarketState = {
            totalDebt: payload.totalDebt,
            totalCollateral: payload.totalCollateral
        };
    }

    _getBucketSize() {
        return parseInt(marketStorage.get("bucketSize", 4 * 3600));
    }

    _setBucketSize(size) {
        this.bucketSize = size;
        marketStorage.set("bucketSize", size);
    }

    onChangeBase(market) {
        this.marketBase = market;
    }

    onChangeBucketSize(size) {
        this._setBucketSize(size);
    }

    onUnSubscribeMarket(payload) {

        // Optimistic removal of activeMarket
        if (payload.unSub) {
            this.activeMarket = null;
        } else { // Unsub failed, restore activeMarket
            this.activeMarket = payload.market;
        }
    }

    onSwitchMarket() {
        console.log("onSwitchMarket:", false);
        this.marketReady = false;
    }

    onClearMarket() {
        this.activeMarket = null;
        this.activeMarketLimits = this.activeMarketLimits.clear();
        this.activeMarketCalls = this.activeMarketCalls.clear();
        this.feedPrice = null;
        this.activeMarketSettles = this.activeMarketSettles.clear();
        this.activeMarketHistory = this.activeMarketHistory.clear();
        this.bids = [];
        this.asks = [];
        this.calls = [];
        this.lowestCallPrice = null;
        this.pendingCreateLimitOrders = [];
        this.flat_bids = [];
        this.flat_asks = [];
        this.flat_calls = [];
        this.priceHistory =[];
        this.marketStats = Immutable.Map({
            change: 0,
            volumeBase: 0,
            volumeQuote: 0
        });
    }

    onSubscribeMarket(result) {
        if (result.switchMarket) {
            this.marketReady = false;
            return this.emitChange();
        }

        let limitsChanged = false, callsChanged = false;
        function didOrdersChange(newOrders, oldOrders) {
            let changed = oldOrders && (oldOrders.size !== newOrders.size);
            if (changed) return changed;

            newOrders.forEach((a, key) => {
                let oldOrder = oldOrders.get(key);
                if (!oldOrder) {
                    changed = true;
                } else {
                    changed = changed || a.ne(oldOrder);
                }
            });
            return changed;
        }

        // console.log("onSubscribeMarket:", result, this.activeMarket);
        this.invertedCalls = result.inverted;

        // Get updated assets every time for updated feed data
        this.quoteAsset = ChainStore.getAsset(result.quote.get("id"));
        this.baseAsset = ChainStore.getAsset(result.base.get("id"));

        const assets = {
            [this.quoteAsset.get("id")]: {precision: this.quoteAsset.get("precision")},
            [this.baseAsset.get("id")]: {precision: this.baseAsset.get("precision")}
        };

        if (result.market && (result.market !== this.activeMarket)) {
            console.log("switch active market from", this.activeMarket, "to", result.market);
            this.onClearMarket();
            this.activeMarket = result.market;
        }

        if (result.buckets) {
            this.buckets = result.buckets;
            if (result.buckets.indexOf(this.bucketSize) === -1) {
                this.bucketSize = result.buckets[result.buckets.length - 1];
            }
        }

        if (result.limits) {
            // Keep an eye on this as the number of orders increases, it might not scale well
            const oldActiveMarketLimits = this.activeMarketLimits;
            this.activeMarketLimits = this.activeMarketLimits.clear();
            // console.time("Create limit orders " + this.activeMarket);
            result.limits.forEach(order => {
                ChainStore._updateObject(order, false, false);
                if (typeof order.for_sale !== "number") {
                    order.for_sale = parseInt(order.for_sale, 10);
                }
                order.expiration = new Date(order.expiration);
                this.activeMarketLimits = this.activeMarketLimits.set(
                    order.id,
                    new LimitOrder(order, assets, this.quoteAsset.get("id"))
                );
            });

            limitsChanged = didOrdersChange(this.activeMarketLimits, oldActiveMarketLimits);

            // Loop over pending orders to remove temp order from orders map and remove from pending
            for (let i = this.pendingCreateLimitOrders.length - 1; i >= 0; i--) {
                let myOrder = this.pendingCreateLimitOrders[i];
                let order = this.activeMarketLimits.find(order => {
                    return myOrder.seller === order.seller && myOrder.expiration === order.expiration;
                });

                // If the order was found it has been confirmed, delete it from pending
                if (order) {
                    this.pendingCreateLimitOrders.splice(i, 1);
                }
            }

            // console.timeEnd("Create limit orders " + this.activeMarket);

            if (this.pendingCreateLimitOrders.length === 0) {
                this.pendingCounter = 0;
            }

            // console.log("time to process limit orders:", new Date() - limitStart, "ms");
        }

        if (result.calls) {
            const oldActiveMarketCalls = this.activeMarketCalls;
            this.activeMarketCalls = this.activeMarketCalls.clear();
            this._setFeed();

            // console.log("feed price: ", this.feedPrice.toReal(), "squeeze price: ", this.feedPrice.getSqueezePrice({real: true}));
            result.calls.forEach(call => {
                ChainStore._updateObject(call, false, false);
                let callOrder = new CallOrder(call, assets, this.quoteAsset.get("id"), this.feedPrice);
                if (callOrder.isMarginCalled()) {
                    this.activeMarketCalls = this.activeMarketCalls.set(
                        call.id,
                        new CallOrder(call, assets, this.quoteAsset.get("id"), this.feedPrice)
                    );
                }
            });

            callsChanged = didOrdersChange(this.activeMarketCalls, oldActiveMarketCalls);
        }

        this.updateSettleOrders(result);

        if (result.history) {
            this.activeMarketHistory = this.activeMarketHistory.clear();
            result.history.forEach(order => {
                order.op.time = order.time;
                this.activeMarketHistory = this.activeMarketHistory.add(
                    order.op
                );
            });
        }

        if (result.fillOrders) {
            result.fillOrders.forEach(fill => {
                // console.log("fill:", fill);
                this.activeMarketHistory = this.activeMarketHistory.add(
                    fill[0][1]
                );
            });
        }

        if (result.recent && result.recent.length) {

            let stats = this._calcMarketStats(result.recent, this.baseAsset, this.quoteAsset);

            this.marketStats = this.marketStats.set("change", stats.change);
            this.marketStats = this.marketStats.set("volumeBase", stats.volumeBase);
            this.marketStats = this.marketStats.set("volumeQuote", stats.volumeQuote);

            if (stats.volumeBase) {
                this.lowVolumeMarkets = this.lowVolumeMarkets.delete(result.market);
            }
        } else if (result.recent && !result.recent.length) {
            this.lowVolumeMarkets = this.lowVolumeMarkets.set(result.market, true);
        }

        // console.log("*** Limits changed:", limitsChanged, "*** Calls changed:", callsChanged);
        if (callsChanged || limitsChanged) {
            // Update orderbook
            this._orderBook(limitsChanged, callsChanged);

            // Update depth chart data
            this._depthChart();
        }

        // Update pricechart data
        if (result.price) {
            this.priceHistory = result.price;
            this._priceChart();
        }

        console.log("setting marketReady to true");
        this.marketReady = true;
        this.emitChange();
    }

    onCancelLimitOrderSuccess(cancellations) {

        if (cancellations && cancellations.length) {

            let didUpdate = false;
            cancellations.forEach(orderID => {
                if (orderID && this.activeMarketLimits.has(orderID)) {
                    didUpdate = true;
                    this.activeMarketLimits = this.activeMarketLimits.delete(orderID);
                }
            });

            if (this.activeMarketLimits.size === 0) {
                this.bids = [];
                this.flat_bids = [];
                this.asks = [];
                this.flat_asks = [];
            }

            if (didUpdate) {
                // Update orderbook
                this._orderBook(true, false);

                // Update depth chart data
                this._depthChart();
            }
        } else {
            return false;
        }
    }

    onCloseCallOrderSuccess(orderID) {
        if (orderID && this.activeMarketCalls.has(orderID)) {
            this.activeMarketCalls = this.activeMarketCalls.delete(orderID);
            if (this.activeMarketCalls.size === 0) {
                this.calls = [];
                this.flat_calls = [];
            }
            // Update orderbook
            this._orderBook(false, true);

            // Update depth chart data
            this._depthChart();
        } else {
            return false;
        }
    }

    onCallOrderUpdate(call_order) {
        if (call_order && this.quoteAsset && this.baseAsset) {
            if (call_order.call_price.quote.asset_id === this.quoteAsset.get("id") || call_order.call_price.quote.asset_id === this.baseAsset.get("id")) {

                const assets = {
                    [this.quoteAsset.get("id")]: {precision: this.quoteAsset.get("precision")},
                    [this.baseAsset.get("id")]: {precision: this.baseAsset.get("precision")}
                };
                let callOrder = new CallOrder(call_order, assets, this.quoteAsset.get("id"), this.feedPrice);
                console.log("**** onCallOrderUpdate ****", call_order, "isMarginCalled:", callOrder.isMarginCalled());

                if (callOrder.isMarginCalled()) {
                    this.activeMarketCalls = this.activeMarketCalls.set(
                        call_order.id,
                        callOrder
                    );

                    // Update orderbook
                    this._orderBook(false, true);

                    // Update depth chart data
                    this._depthChart();
                }

            }

        } else {
            return false;
        }
    }

    onFeedUpdate(asset) {
        if (!this.quoteAsset || !this.baseAsset) {
            return;
        }
        let needsUpdate = false;
        if (asset.get("id") === this.quoteAsset.get("id")) {
            this.quoteAsset = asset;
            needsUpdate = true;
        } else if (asset.get("id") === this.baseAsset.get("id")) {
            this.baseAsset = asset;
            needsUpdate = true;
        }

        if (needsUpdate) {
            // console.log("onFeedUpdate asset", asset.get("symbol"), "quote:", this.quoteAsset.get("symbol"), "base:", this.baseAsset.get("symbol"));
            // Update orderbook
            // this.calls = this.constructCalls(this.activeMarketCalls);
            // Update depth chart data
            // this._depthChart();
            this._setFeed();
        } else {
            return false;
        }
    }

    _setFeed() {
        const assets = {
            [this.quoteAsset.get("id")]: {precision: this.quoteAsset.get("precision")},
            [this.baseAsset.get("id")]: {precision: this.baseAsset.get("precision")}
        };
        const settlePrice =  this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "current_feed", "settlement_price"]);
        const sqr = this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "current_feed", "maximum_short_squeeze_ratio"]);
        this.feedPrice = new FeedPrice({
            priceObject: settlePrice,
            market_base: this.quoteAsset.get("id"),
            sqr,
            assets
        });
    }

    _priceChart() {
        let volumeData = [];
        let prices = [];


        let open, high, low, close, volume;

        for (let i = 0; i < this.priceHistory.length; i++) {
            let date = new Date(this.priceHistory[i].key.open + "+00:00").getTime();
            if (this.quoteAsset.get("id") === this.priceHistory[i].key.quote) {
                high = utils.get_asset_price(this.priceHistory[i].high_base, this.baseAsset, this.priceHistory[i].high_quote, this.quoteAsset);
                low = utils.get_asset_price(this.priceHistory[i].low_base, this.baseAsset, this.priceHistory[i].low_quote, this.quoteAsset);
                open = utils.get_asset_price(this.priceHistory[i].open_base, this.baseAsset, this.priceHistory[i].open_quote, this.quoteAsset);
                close = utils.get_asset_price(this.priceHistory[i].close_base, this.baseAsset, this.priceHistory[i].close_quote, this.quoteAsset);
                volume = utils.get_asset_amount(this.priceHistory[i].quote_volume, this.quoteAsset);
            } else {
                low = utils.get_asset_price(this.priceHistory[i].high_quote, this.baseAsset, this.priceHistory[i].high_base, this.quoteAsset);
                high = utils.get_asset_price(this.priceHistory[i].low_quote, this.baseAsset, this.priceHistory[i].low_base, this.quoteAsset);
                open = utils.get_asset_price(this.priceHistory[i].open_quote, this.baseAsset, this.priceHistory[i].open_base, this.quoteAsset);
                close = utils.get_asset_price(this.priceHistory[i].close_quote, this.baseAsset, this.priceHistory[i].close_base, this.quoteAsset);
                volume = utils.get_asset_amount(this.priceHistory[i].base_volume, this.quoteAsset);
            }


            function findMax(a, b) {
                if (a !== Infinity && b !== Infinity) {
                    return Math.max(a, b);
                } else if (a === Infinity) {
                    return b;
                } else {
                    return a;
                }
            }

            function findMin(a, b) {
                if (a !== 0 && b !== 0) {
                    return Math.min(a, b);
                } else if (a === 0) {
                    return b;
                } else {
                    return a;
                }
            }

            if (low === 0) {
                low = findMin(open, close);
            }

            if (isNaN(high) || high === Infinity) {
                high = findMax(open, close);
            }

            if (close === Infinity || close === 0) {
                close = open;
            }

            if (open === Infinity || open === 0) {
                open = close;
            }

            prices.push([date, open, high, low, close]);
            volumeData.push([date, volume]);
        }

        // max buckets returned is 200, if we get less, fill in the gaps starting at the first data point
        let priceLength = prices.length;
        if (priceLength > 0 && priceLength < 200) {
            let now = (new Date()).getTime();

            // ensure there's a final entry close to the current time
            let i = 1;
            while (prices[0][0] + i * this.bucketSize * 1000 < now) {
                i++;
            }
            let finalDate = prices[0][0] + (i - 1) * this.bucketSize * 1000;

            if (prices[priceLength - 1][0] !== finalDate) {
                if (priceLength === 1) {
                    prices.push([finalDate - this.bucketSize * 1000, prices[0][4], prices[0][4], prices[0][4], prices[0][4]]);
                    prices.push([finalDate, prices[0][4], prices[0][4], prices[0][4], prices[0][4]]);
                    volumeData.push([finalDate - this.bucketSize * 1000, 0]);
                } else {
                    prices.push([finalDate, prices[priceLength - 1][4], prices[priceLength - 1][4], prices[priceLength - 1][4], prices[priceLength - 1][4]]);
                }
                volumeData.push([finalDate, 0]);
            }

            // fill in
            for (let ii = 0; ii < prices.length - 1; ii++) {
                if (prices[ii+1][0] !== (prices[ii][0] + this.bucketSize * 1000)) {
                    if (prices[ii][0] + this.bucketSize * 1000 > now) {
                        break;
                    }
                    prices.splice(ii + 1, 0, [prices[ii][0] + this.bucketSize * 1000, prices[ii][4], prices[ii][4], prices[ii][4], prices[ii][4]]);
                    volumeData.splice(ii + 1, 0, [prices[ii][0] + this.bucketSize * 1000, 0]);
                }
            };
        }

        this.priceData = prices;
        this.volumeData = volumeData;
    }

    _orderBook(limitsChanged = true, callsChanged = false) {
        // Loop over limit orders and return array containing bids
        let constructBids = (orderArray) => {
            let bids = [];
            orderArray.filter(a => {
                return a.isBid();
            }).sort((a, b) => {
                return a.getPrice() - b.getPrice();
            }).forEach(order => {
                bids.push({
                    __tempOrder__: order
                });
            });

            // Sum bids at same price
            if (bids.length > 1) {
                for (let i = bids.length - 2; i >= 0; i--) {
                    if (bids[i].__tempOrder__.getPrice() === bids[i + 1].__tempOrder__.getPrice()) {
                        bids[i].__tempOrder__.sum(bids[i + 1].__tempOrder__);
                        bids.splice(i + 1, 1);
                    }
                }
            }

            return bids;
        };
        // Loop over limit orders and return array containing asks
        let constructAsks = (orderArray) => {
            let asks = [];

            orderArray.filter(a => {
                return !a.isBid();
            }).sort((a, b) => {
                return a.getPrice() - b.getPrice();
            }).map(order => {
                asks.push({
                    __tempOrder__: order
                });
            });

            // Sum asks at same price
            if (asks.length > 1) {
                for (let i = asks.length - 2; i >= 0; i--) {
                    if (asks[i].__tempOrder__.getPrice() === asks[i + 1].__tempOrder__.getPrice()) {
                        asks[i].__tempOrder__.sum(asks[i + 1].__tempOrder__);
                        asks.splice(i + 1, 1);
                    }
                }
            }

            return asks;
        };

        // Assign to store variables
        if (limitsChanged) {
            console.time("Construct limits " + this.activeMarket);
            this.bids = constructBids(this.activeMarketLimits);
            this.asks = constructAsks(this.activeMarketLimits);
            console.timeEnd("Construct limits " + this.activeMarket);
        }

        if (callsChanged) {
            console.time("Construct calls " + this.activeMarket);
            this.calls = this.constructCalls(this.activeMarketCalls);
            console.timeEnd("Construct calls " + this.activeMarket);
        }

        // console.log("time to construct orderbook:", new Date() - orderBookStart, "ms");
    }

    constructCalls (callsArray) {
        let calls = [];

        if (callsArray.size) {
            callsArray
            .sort((a, b) => {
                return a.getPrice() - b.getPrice();
            }).forEach(order => {
                if (this.invertedCalls) {
                    this.lowestCallPrice = !this.lowestCallPrice ? order.getPrice(false) : Math.max(this.lowestCallPrice, order.getPrice(false));
                } else {
                    this.lowestCallPrice = !this.lowestCallPrice ? order.getPrice(false) : Math.min(this.lowestCallPrice, order.getPrice(false));
                }

                calls.push({
                    __tempOrder__: order
                });
            });

            // Sum calls at same price
            if (calls.length > 1) {
                for (let i = calls.length - 2; i >= 0; i--) {
                    calls[i].__tempOrder__ = calls[i].__tempOrder__.sum(calls[i + 1].__tempOrder__);
                    calls.splice(i + 1, 1);
                }
            }
        }

        return calls;
    }

    _depthChart() {
        let bids = [], asks = [], calls= [], totalBids = 0, totalCalls = 0;
        let flat_bids = [], flat_asks = [], flat_calls = [];

        if (this.activeMarketLimits.size) {

            this.bids.forEach(order => {
                bids.push([order.__tempOrder__.getPrice(), order.__tempOrder__.amountToReceive().getAmount({real: true})]);
                totalBids += order.value;
            });

            this.asks.forEach(order => {
                asks.push([order.__tempOrder__.getPrice(), order.__tempOrder__.amountForSale().getAmount({real: true})]);
            });

            // Make sure the arrays are sorted properly
            asks.sort((a, b) => {
                return a[0] - b[0];
            });

            bids.sort((a, b) => {
                return a[0] - b[0];
            });

            // Flatten the arrays to get the step plot look
            flat_bids = market_utils.flatten_orderbookchart_highcharts(bids, true, true, 1000);

            if (flat_bids.length > 0) {
                flat_bids.unshift([0, flat_bids[0][1]]);
            }

            flat_asks = market_utils.flatten_orderbookchart_highcharts(asks, true, false, 1000);
            if (flat_asks.length > 0) {
                flat_asks.push([flat_asks[flat_asks.length - 1][0] * 1.5, flat_asks[flat_asks.length - 1][1]]);
            }
        }

        if (this.calls.length) {

            this.calls.forEach(order => {
                calls.push([order.__tempOrder__.getSqueezePrice(), order.__tempOrder__.amountToReceive().getAmount({real: true})]);
            });

            // Calculate total value of call orders
            calls.forEach(call => {
                if (this.invertedCalls) {
                    totalCalls += call[1];
                } else {
                    totalCalls += call[1] * call[0];
                }
            });

            // Make sure the array is sorted properly
            calls.sort((a, b) => {
                return a[0] - b[0];
            });

            // Flatten the array to get the step plot look
            if (this.invertedCalls) {
                flat_calls = market_utils.flatten_orderbookchart_highcharts(calls, true, false, 1000);
                if (flat_asks.length && (flat_calls[flat_calls.length - 1][0] < flat_asks[flat_asks.length - 1][0])) {
                    flat_calls.push([flat_asks[flat_asks.length - 1][0], flat_calls[flat_calls.length - 1][1]]);
                }
            } else {
                flat_calls = market_utils.flatten_orderbookchart_highcharts(calls, true, true, 1000);
                if (flat_calls.length > 0) {
                    flat_calls.unshift([0, flat_calls[0][1]]);
                }
            }
        }

        // Assign to store variables
        this.flat_asks = flat_asks;
        this.flat_bids = flat_bids;
        this.totalBids = totalBids;
        this.totalCalls = totalCalls;
        this.flat_calls = flat_calls;
    }

    _calcMarketStats(history, baseAsset, quoteAsset, recent) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday = yesterday.getTime();
        let volumeBase = 0,
            volumeQuote = 0,
            change = 0,
            last = {close_quote: null, close_base: null},
            invert,
            latestPrice,
            noTrades = true;

        if (history.length) {
            let first;
            history.forEach((bucket, i) => {
                let date = new Date(bucket.key.open + "+00:00").getTime();
                if (date > yesterday) {
                    noTrades = false;
                    if (!first) {
                        first = history[i > 0 ? i - 1 : i];
                        invert = first.key.base === baseAsset.get("id");
                    }
                    if (invert) {
                        volumeBase += parseInt(bucket.base_volume, 10);
                        volumeQuote += parseInt(bucket.quote_volume, 10);
                    } else {
                        volumeQuote += parseInt(bucket.base_volume, 10);
                        volumeBase += parseInt(bucket.quote_volume, 10);
                    }
                }
            });
            if (!first) {
                first = history[0];
            }
            last = history[history.length -1];
            let open, close;
            if (invert) {
                open = utils.get_asset_price(first.open_quote, quoteAsset, first.open_base, baseAsset, invert);
                close = utils.get_asset_price(last.close_quote, quoteAsset, last.close_base, baseAsset, invert);
            } else {
                open = utils.get_asset_price(first.open_quote, baseAsset, first.open_base, quoteAsset, invert);
                close = utils.get_asset_price(last.close_quote, baseAsset, last.close_base, quoteAsset, invert);
            }

            change = noTrades ? 0 : Math.round(10000 * (close - open) / open) / 100;
        }

        if (recent && recent.length && recent.length > 1) {
            let order = recent[1].op;
            let paysAsset, receivesAsset, isAsk = false;

            if (order.pays.asset_id === baseAsset.get("id")) {
                paysAsset = baseAsset;
                receivesAsset = quoteAsset;
                isAsk = true;
            } else {
                paysAsset = quoteAsset;
                receivesAsset = baseAsset;
            }
            let flipped = baseAsset.get("id").split(".")[2] > quoteAsset.get("id").split(".")[2];
            latestPrice = market_utils.parse_order_history(order, paysAsset, receivesAsset, isAsk, flipped).full;
        }

        let close = last.close_base && last.close_quote ? {
            quote: {
                amount: invert ? last.close_quote : last.close_base,
                asset_id: invert ? last.key.quote : last.key.base
            },
            base: {
                amount: invert ? last.close_base : last.close_quote,
                asset_id: invert ? last.key.base : last.key.quote
            }
        } : null;

        return {
            change: change.toFixed(2),
            volumeBase: utils.get_asset_amount(volumeBase, baseAsset),
            volumeQuote: utils.get_asset_amount(volumeQuote, quoteAsset),
            close: close,
            latestPrice
        };
    }

    onGetMarketStats(payload) {
        if (payload) {
            let stats = this._calcMarketStats(payload.history, payload.base, payload.quote, payload.last);
            this.allMarketStats = this.allMarketStats.set(payload.market, stats);
        }
    }

    onSettleOrderUpdate(result) {
        this.updateSettleOrders(result);
    }

    updateSettleOrders(result) {
        if (result.settles && result.settles.length) {
            this.activeMarketSettles = this.activeMarketSettles.clear();

            result.settles.forEach(settle => {
                // let key = settle.owner + "_" + settle.balance.asset_id;

                settle.settlement_date = new Date(settle.settlement_date);

                this.activeMarketSettles = this.activeMarketSettles.add(
                    SettleOrder(settle)
                );
            });
        }
    }
}

export default alt.createStore(MarketsStore, "MarketsStore");
