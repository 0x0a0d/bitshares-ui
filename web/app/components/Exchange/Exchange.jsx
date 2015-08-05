import React from "react";
import {PropTypes} from "react";
import MarketsActions from "actions/MarketsActions";
import {MyOpenOrders} from "./MyOpenOrders";
import OrderBook from "./OrderBook";
import MarketHistory from "./MarketHistory";
import BuySell from "./BuySell";
// import Margin from "./Margin";
import utils from "common/utils";
import PriceChart from "./PriceChart";
import DepthHighChart from "./DepthHighChart";
import Tabs from "react-foundation-apps/src/tabs";
import debounce from "lodash.debounce";
import ConfirmModal from "../Modal/ConfirmModal";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import notify from "actions/NotificationActions";
import {Link} from "react-router";
import Wallet from "components/Wallet/Wallet";
import BlockchainStore from "stores/BlockchainStore";
import FormattedAsset from "../Utility/FormattedAsset";
import WalletDb from "stores/WalletDb";

require("./exchange.scss");

class Exchange extends React.Component {
    constructor() {
        super();

        this.state = {
            history: [],
            buyAmount: 0,
            buyPrice: 0,
            sellAmount: 0,
            sellPrice: 0,
            sub: null,
            activeTab: "buy",
            showBuySell: true
        };

        this._createLimitOrderConfirm = this._createLimitOrderConfirm.bind(this);
        this._setDepthLine = debounce(this._setDepthLine.bind(this), 500);
    }

    componentDidMount() {
        this._subToMarket(this.props);
    }

    componentWillReceiveProps(nextProps) {
        
        if (!this.state.sub && nextProps.assets.size > 0) {
            return this._subToMarket(nextProps);
        }

        if (nextProps.quote !== this.props.quote) {
            
            let currentSub = this.state.sub.split("_");
            MarketsActions.unSubscribeMarket(currentSub[0], currentSub[1]);
            return this._subToMarket(nextProps);
        }
    }

    componentWillUnmount() {
        let {quote, base, asset_symbol_to_id} = this.props;
        let quote_id = asset_symbol_to_id[quote];
        let base_id = asset_symbol_to_id[base];
        MarketsActions.unSubscribeMarket(quote_id, base_id);
    }

    _createLimitOrder(buyAsset, sellAsset, buyAssetAmount, sellAssetAmount) {
        if( WalletDb.isLocked()) {
            notify.error("Wallet is locked");
            return;
        }

        let expiration = new Date();
        expiration.setYear(expiration.getFullYear() + 5);
        MarketsActions.createLimitOrder(
            this.props.currentAccount.id,
            parseInt(sellAssetAmount * utils.get_asset_precision(sellAsset.precision), 10),
            sellAsset.id,
            parseInt(buyAssetAmount * utils.get_asset_precision(buyAsset.precision), 10),
            buyAsset.id,
            expiration.toISOString().slice(0, -7), // the seconds will be added in the actionCreator to set a unique identifer for this user and order
            false // fill or kill
        ).then(result => {
            if (!result) {
                notify.addNotification({
                    message: "Unknown error. Failed to place order for " + buyAssetAmount + " " + buyAsset.symbol,
                    level: "error"
                });
            }
        });
    }
    
    _createLimitOrderConfirm(buyAsset, sellAsset, buyAssetAmount, sellAssetAmount, balance, e) {
        e.preventDefault();

        if (sellAssetAmount > balance) {
            return notify.addNotification({
                message: "Insufficient funds to place order. Required: " + sellAssetAmount + " " + sellAsset.symbol,
                level: "error"
            });
        }

        if (!(sellAssetAmount > 0 && buyAssetAmount > 0)) {
            return notify.addNotification({
                message: "Please enter a valid amount and price",
                level: "error"
            });
        }

        // var callback = function() { this._createLimitOrder(buyAsset, sellAsset, buyAssetAmount, sellAssetAmount); }.bind(this);
        this._createLimitOrder(buyAsset, sellAsset, buyAssetAmount, sellAssetAmount);
        // let fee = BlockchainStore.getFee("limit_order_create");

        // if(this.props.settings.get("confirmMarketOrder")) // TODO: only show this confirmation modal if the user has not disabled it
        // {
        //     var content =
        //         <div className="grid-content no-overflow">
        //             {(this.props.quote === buyAsset.symbol) ?
        //             <Translate
        //                     component="p"
        //                     content="exchange.confirm_buy"
        //                     buy_amount={buyAssetAmount}
        //                     buy_symbol={buyAsset.symbol}
        //                     price_amount={sellAssetAmount / buyAssetAmount}
        //                     price_symbol={sellAsset.symbol + "/" + buyAsset.symbol}
        //             />
        //             :
        //             <Translate
        //                     component="p"
        //                     content="exchange.confirm_sell"
        //                     sell_amount={sellAssetAmount}
        //                     sell_symbol={sellAsset.symbol}
        //                     price_amount={buyAssetAmount / sellAssetAmount}
        //                     price_symbol={buyAsset.symbol + "/" + sellAsset.symbol}
        //             />}
        //             <Translate content="transfer.fee" />: <FormattedAsset color="fee" amount={fee} asset={this.props.assets.get("1.3.0")} />
        //         </div>

        //     this.refs.confirmModal.show(content, "Confirm Order", callback);
        // }
        // else
        // {
        //     callback();
        // }
    }

    _cancelLimitOrder(orderID, e) {
        e.preventDefault();
        console.log("canceling limit order:", orderID);
        let {currentAccount} = this.props;
        MarketsActions.cancelLimitOrder(
            currentAccount.id,
            orderID // order id to cancel
        ).then(result => {
            if (!result) {
                notify.addNotification({
                        message: `Failed to cancel limit order ${orderID}`,
                        level: "error"
                    });
            }
        });
    }

    _changeBucketSize(size, e) {
        e.preventDefault();
        if (size !== this.props.bucketSize) { 
            MarketsActions.changeBucketSize(size);
            let currentSub = this.state.sub.split("_");
            MarketsActions.unSubscribeMarket(currentSub[0], currentSub[1]);
            this._subToMarket(this.props, size);
        }
    }

    _subToMarket(props, newBucketSize) {
        let {quote, base, asset_symbol_to_id, assets, bucketSize} = props;
        if (newBucketSize) {
            bucketSize = newBucketSize;
        }
        if (asset_symbol_to_id[quote] && asset_symbol_to_id[base]) {
            let quote_id = asset_symbol_to_id[quote];
            let base_id = asset_symbol_to_id[base];
            let baseAsset = assets.get(base_id);
            let quoteAsset = assets.get(quote_id);
            if (quoteAsset && baseAsset) {
                MarketsActions.subscribeMarket(baseAsset, quoteAsset, bucketSize);
                this.setState({sub: `${quote_id}_${base_id}`});
            }
        }
    }

    _depthChartClick(e) {
        e.preventDefault();
        // let base_id = this.props.asset_symbol_to_id[this.props.base];
        // let base = this.props.assets.get(base_id);
        // let precision = utils.get_asset_precision(base.precision);
        let value = e.xAxis[0].value;
        this.setState({
            buyPrice: value,
            sellPrice: value,
            depthLine: value
        });
    }

    _addZero(value) {
        console.log("value:", value);
        if (value.length === 1 && value === ".") {
            return "0.";
        }
        return value;
    }

    _setDepthLine(value) { this.setState({depthLine: value}); }

    _buyAmountChanged(e) { this.setState({buyAmount: this._addZero(e.target.value)}); }

    _buyPriceChanged(e) { this.setState({buyPrice: this._addZero(e.target.value)}); this._setDepthLine(e.target.value); }

    _sellAmountChanged(e) { this.setState({sellAmount: this._addZero(e.target.value)}); }

    _sellPriceChanged(e) { this.setState({sellPrice: this._addZero(e.target.value)}); this._setDepthLine(e.target.value); }

    _changeTab(value) {
        this.setState({activeTab: value});
    }

    _toggleBuySell() {
        this.setState({showBuySell: !this.state.showBuySell});
    }

    _orderbookClick(price, amount, type) {
        if (type === "bid") {
            this.setState({sellPrice: price, sellAmount: amount});
        } else if (type === "ask") {
            this.setState({buyPrice: price, buyAmount: amount});
        }
    }

    render() {
        let {asset_symbol_to_id, assets, currentAccount, limit_orders,
            base: baseSymbol, quote: quoteSymbol,
            balances, totalBids, flat_asks, flat_bids, bids, asks} = this.props;
        let {buyAmount, buyPrice, sellAmount, sellPrice} = this.state;
        let base = null, quote = null, accountBalance = null, quoteBalance = 0, baseBalance = 0;

        if (asset_symbol_to_id[quoteSymbol] && asset_symbol_to_id[baseSymbol]) {
            let quote_id = asset_symbol_to_id[quoteSymbol];
            let base_id = asset_symbol_to_id[baseSymbol];
            base = assets.get(base_id);
            quote = assets.get(quote_id);

            accountBalance = balances.get(currentAccount.name);

            if (accountBalance) {
                for (var i = 0; i < accountBalance.length; i++) {
                    if (accountBalance[i].asset_id === quote_id) {
                        quoteBalance = parseInt(accountBalance[i].amount, 10);
                    }
                    if (accountBalance[i].asset_id === base_id) {
                        baseBalance = parseInt(accountBalance[i].amount, 10);
                    }
                }
            } 
        }

        let tabTitles = {
            ph: counterpart.translate("exchange.price_history"),
            od: counterpart.translate("exchange.order_depth")
        };

        return (

                <div className="grid-block page-layout market-layout">
                {/* Main vertical block with content */}

                    {/* Left Column - Open Orders */}
                    <div className="grid-block left-column small-3 medium-2" style={{overflowY: "auto", justifyContent: "center"}}>
                        <div className="grid-block">
                            <OrderBook
                                orders={limit_orders}
                                bids={bids}
                                asks={asks}
                                base={base}
                                quote={quote}
                                baseSymbol={baseSymbol}
                                quoteSymbol={quoteSymbol}
                                onClick={this._orderbookClick.bind(this)}
                            />
                        </div>
                    </div>

                    {/* Center Column */}
                    <div className="block grid-block main-content no-overflow vertical small-9 medium-10 large-8">

                        {/* Top bar with info */}
                        <div className="grid-block shrink">
                            <span className="market-symbol">{`${baseSymbol} / ${quoteSymbol}`} <Link to="exchange" params={{marketID: `${baseSymbol}_${quoteSymbol}`}}>Flip</Link></span>
                            <ul className="market-stats stats">
                                <li className="stat">
                                    <span>
                                        <Translate component="span" content="exchange.latest" /><br/>
                                        <b className="value stat-primary">{utils.format_number(290, Math.max(5, quote ? quote.precision : 0))}</b><br/>
                                        <em>{baseSymbol}/{quoteSymbol}</em>
                                    </span>
                                </li>
                                <li className="stat">
                                    <span>
                                        <Translate component="span" content="exchange.call" /><br/>
                                        <b className="value stat-primary">{utils.format_number(312, Math.max(5, quote ? quote.precision : 0))}</b><br/>
                                        <em>{baseSymbol}/{quoteSymbol}</em>
                                    </span>
                                </li>
                                <li className="stat">
                                    <span>
                                        <Translate component="span" content="exchange.volume" /><br/>
                                        <b className="value stat-primary">{utils.format_number(23122, quote ? quote.precision : 2)}</b><br/>
                                        <em>{quoteSymbol}</em>
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Price history chart and depth chart inside tabs */}
                        <div className="grid-block" id="market-charts" style={{display: "inline-block", flexGrow: "0", minHeight: "350px" }} >

                            <Tabs>
                                <Tabs.Tab title={tabTitles.ph}>
                                    <div style={{position: "absolute", top: "-10px", right: "20px"}}>
                                        <div className="button bucket-button" onClick={this._changeBucketSize.bind(this, 15)}>15s</div>
                                        <div className="button bucket-button" onClick={this._changeBucketSize.bind(this, 60)}>60s</div>
                                        <div className="button bucket-button" onClick={this._changeBucketSize.bind(this, 300)}>5min</div>
                                        <div className="button bucket-button" onClick={this._changeBucketSize.bind(this, 3600)}>1hr</div>
                                        <div className="button bucket-button" onClick={this._changeBucketSize.bind(this, 86400)}>1d</div>
                                    </div>
                                    <PriceChart
                                        priceData={this.props.priceData}
                                        volumeData={this.props.volumeData}
                                        base={base}
                                        quote={quote}
                                        baseSymbol={baseSymbol}
                                        quoteSymbol={quoteSymbol}
                                        height={300}
                                    />
                                </Tabs.Tab>
                                <Tabs.Tab title={tabTitles.od}>
                                    <DepthHighChart
                                        orders={limit_orders}
                                        flat_asks={flat_asks}
                                        flat_bids={flat_bids}
                                        totalBids={totalBids}
                                        base={base}
                                        quote={quote}
                                        baseSymbol={baseSymbol}
                                        quoteSymbol={quoteSymbol}
                                        height={300}
                                        onClick={this._depthChartClick.bind(this)}
                                        plotLine={this.state.depthLine}
                                    />
                                </Tabs.Tab>
                            </Tabs>

                        </div>


                        {/* Buy/Sell forms */}
                        <div className="grid-block shrink" style={{ flexGrow: "0" }} >
                                    <ConfirmModal
                                        key="confirm_modal"
                                        modalId="confirm_modal"
                                        ref="confirmModal"
                                        setting="confirmMarketOrder"
                                        value={this.props.settings.get("confirmMarketOrder")}
                                    />

                                    {quote && base ?
                                    <BuySell
                                        className="small-6"
                                        type="buy"
                                        amount={buyAmount}
                                        price={buyPrice}
                                        quoteSymbol={quoteSymbol}
                                        baseSymbol={baseSymbol}
                                        amountChange={this._buyAmountChanged.bind(this)}
                                        priceChange={this._buyPriceChanged.bind(this)}
                                        balance={baseBalance / utils.get_asset_precision(base.precision)}
                                        onSubmit={this._createLimitOrderConfirm.bind(this, quote, base, buyAmount, buyAmount * buyPrice, baseBalance / utils.get_asset_precision(base.precision))}
                                        balancePrecision={base.precision}
                                        totalPrecision={base.precision}
                                    /> : null}
                                    {quote && base ?
                                    <BuySell
                                        className="small-6"
                                        type="sell"
                                        amount={sellAmount}
                                        price={sellPrice}
                                        quoteSymbol={quoteSymbol}
                                        baseSymbol={baseSymbol}
                                        amountChange={this._sellAmountChanged.bind(this)}
                                        priceChange={this._sellPriceChanged.bind(this)}
                                        balance={quoteBalance / utils.get_asset_precision(quote.precision)}
                                        onSubmit={this._createLimitOrderConfirm.bind(this, base, quote, sellAmount * sellPrice, sellAmount, quoteBalance / utils.get_asset_precision(quote.precision))}
                                        balancePrecision={quote.precision}
                                        totalPrecision={base.precision}
                                    /> : null}
                        </div>

                        <div className="grid-block no-overflow" style={{minHeight: "20rem"}}>
                            {limit_orders.size > 0 && base && quote ? <MyOpenOrders
                                key="open_orders"
                                orders={limit_orders}
                                currentAccount={currentAccount.id}
                                base={base}
                                quote={quote}
                                baseSymbol={baseSymbol}
                                quoteSymbol={quoteSymbol}
                                onCancel={this._cancelLimitOrder.bind(this)}
                            /> : null}
                        </div>

                    {/* End of Main Content Column */}
                    </div>


                    {/* Right Column - Market History */}
                    <div className="grid-block right-column  show-for-large large-2" style={{overflowY: "auto"}}>
                        {/* Market History */}
                        <MarketHistory
                            history={this.props.activeMarketHistory}
                            assets={assets}
                            base={base}
                            baseSymbol={baseSymbol}
                            quoteSymbol={quoteSymbol}/>
                    </div>

                {/* End of Second Vertical Block */}
                </div>
        );
    }
}

Exchange.defaultProps = {
    quote: null, 
    base: null, 
    limit_orders: [],
    balances: [], 
    totalBids: 0, 
    flat_asks: [], 
    flat_bids: [], 
    bids: [], 
    asks: [],
    asset_symbol_to_id: {}, 
    assets: {},
    setting: null,
    activeMarketHistory: {},
    settings: {},
    priceData: [],
    volumeData: []
};

Exchange.propTypes = {
    quote: PropTypes.string.isRequired, 
    base: PropTypes.string.isRequired, 
    limit_orders: PropTypes.array.isRequired, 
    balances: PropTypes.array.isRequired, 
    totalBids: PropTypes.number.isRequired, 
    flat_asks: PropTypes.array.isRequired,
    flat_bids: PropTypes.array.isRequired,
    bids: PropTypes.array.isRequired,
    asks: PropTypes.array.isRequired,
    asset_symbol_to_id: PropTypes.object.isRequired, 
    assets: PropTypes.object.isRequired,
    activeMarketHistory: PropTypes.object.isRequired,
    settings: PropTypes.object.isRequired,
    priceData: PropTypes.array.isRequired,
    volumeData: PropTypes.array.isRequired
};

export default Exchange;
