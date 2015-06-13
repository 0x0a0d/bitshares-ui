import React from "react";
import BaseComponent from "../BaseComponent";
import MarketsActions from "actions/MarketsActions";

require("./exchange.scss");

let orderBook = {
    bids: [
        {expiration: 0, amount: 5, price: 120},
        {expiration: 0, amount: 800, price: 130},
        {expiration: 0, amount: 12, price: 140},
        {expiration: 0, amount: 10, price: 154}
    ],
    asks: [
        {expiration: 0, amount: 10, price: 160},
        {expiration: 0, amount: 32, price: 170},
        {expiration: 0, amount: 400, price: 180},
        {expiration: 0, amount: 4, price: 190}
    ]
};

let history = {
    orders: [
        {timestamp: new Date(15,6,1,11,38,0,0), type: 0, amount: 5, price: 150},
        {timestamp: new Date(15,6,1,11,37,0,0), type: 0, amount: 10, price: 152},
        {timestamp: new Date(15,6,1,11,36,0,0), type: 1, amount: 1, price: 155},
        {timestamp: new Date(15,6,1,11,35,0,0), type: 1, amount: 80, price: 154},
        {timestamp: new Date(15,6,1,11,34,0,0), type: 1, amount: 1, price: 148},
        {timestamp: new Date(15,6,1,11,33,0,0), type: 0, amount: 1, price: 145}
    ]
};

class Exchange extends BaseComponent {
    constructor() {
        super();

        this.state = {
            orderBook: orderBook,
            history: history,
            assetA: "CORE",
            assetB: "BitUSD",
            buyAmount: 5,
            buyPrice: orderBook.asks[0].price,
            sellAmount: 5,
            sellPrice: orderBook.bids[orderBook.bids.length - 1].price
        };
    }

    buyClicked() {
        MarketsActions.createLimitOrder("0",
            "1.4.0",
            "1.3.11",
            this.state.buyAmount,
            "1.4.0",
            this.state.buyAmount * this.state.buyPrice,
            "1.4.1",
            "2020-01-01T00:00:00",
            false
        );
    }

    sellClicked() {
        MarketsActions.createLimitOrder("0",
            "1.4.0",
            "1.3.11",
            this.state.sellAmount,
            "1.4.1",
            this.state.sellAmount * this.state.sellPrice,
            "1.4.0",
            "2020-01-01T00:00:00",
            false
        );
    }

    componentDidMount() {
        let quoteID = this.props.asset_symbol_to_id[this.props.quoteSymbol];
        let mia = this.props.assets.get(quoteID).bitasset_data_id !== null;
        let baseID = this.props.asset_symbol_to_id[this.props.baseSymbol];
        MarketsActions.subscribeMarket(baseID, quoteID, mia);
    }

    componentWillUnmount() {
        let quoteID = this.props.asset_symbol_to_id[this.props.quoteSymbol];
        let baseID = this.props.asset_symbol_to_id[this.props.baseSymbol];
        MarketsActions.unSubscribeMarket(baseID, quoteID);
    }

    _buyAmountChanged(e) { this.setState({buyAmount: e.target.value }); }
    _buyPriceChanged(e) { this.setState({buyPrice: e.target.value }); }
    _sellAmountChanged(e) { this.setState({sellAmount: e.target.value }); }
    _sellPriceChanged(e) { this.setState({sellPrice: e.target.value }); }

    render() {
        var spread = this.state.orderBook.bids.length > 0 && this.state.orderBook.asks.length > 0 ?
            this.state.orderBook.asks[0].price - this.state.orderBook.bids[this.state.orderBook.bids.length - 1].price :
            "N/A";

        var buyTotal = this.state.buyAmount * this.state.buyPrice;
        var sellTotal = this.state.sellAmount * this.state.sellPrice;

        let quoteID = this.props.asset_symbol_to_id[this.props.quoteSymbol];
        let isMarketAsset = this.props.assets.get(quoteID).bitasset_data_id !== null;

        function orderBookEntry(order) {
            return (
                <tr>
                    <td>{order.amount}</td>
                    <td>{order.price}</td>
                </tr>
            );
        }

        function orderHistoryEntry(order) {
            let priceTrendCssClass = order.type === 1 ? "orderHistoryBid" : "orderHistoryAsk";
            return (
                <tr>
                    <td>{order.amount}</td>
                    <td className={priceTrendCssClass}>{order.price}</td>
                    <td>{order.timestamp.getHours()}:{order.timestamp.getMinutes()}</td>
                </tr>
            );
        }

        this.props.limit_orders.map(order => {
            console.log("real limit order:", order);
        });

        if (isMarketAsset) {
            this.props.short_orders.map(order => {
                console.log("real short order:", order);
            });
        }

        return (
            <div className="grid-block vertical">
                <div classname="grid-block">
                </div>
                <div className="grid-block page-layout">
                    <div className="grid-block medium-3 left-column">
                        <div className="grid-content">
                            <p>OPEN ORDERS</p>
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Quantity ({this.state.assetB})</th>
                                    <th>Price ({this.state.assetA})</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.orderBook.bids.map(orderBookEntry)
                                    }
                                    <tr><td colSpan="2" className="text-center">Spread: {spread} {this.state.assetA}</td></tr>
                                    {
                                        this.state.orderBook.asks.map(orderBookEntry)
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="grid-block medium-6 main-content">
                        <p>TRADE</p>
                        <div className="grid-block medium-6 main-content">
                            <div className="grid-content">
                                <form onSubmit={this.buyClicked.bind(this)}>
                                    <label>
                                        Quantity ({this.state.assetB}):
                                        <input type="text" id="buyAmount" value={this.state.buyAmount} onChange={this._buyAmountChanged.bind(this)} />
                                    </label>
                                    <label>
                                        Price: (per {this.state.assetB}):
                                        <input type="text" id="buyPrice" value={this.state.buyPrice} onChange={this._buyPriceChanged.bind(this)} />
                                    </label>
                                    <p>Total ({this.state.assetA}): { buyTotal }</p>
                                    <input type="submit" className="button" value={"Buy " + this.state.assetB} />
                                </form>
                            </div>
                        </div>
                        <div className="grid-block medium-6 main-content">
                            <div className="grid-content">
                                <form onSubmit={this.sellClicked.bind(this)}>
                                    <label>
                                        Quantity ({this.state.assetB}):
                                        <input type="text" id="sellAmount" value={this.state.sellAmount} onChange={this._sellAmountChanged.bind(this)} />
                                    </label>
                                    <label>
                                        Price: (per {this.state.assetB}):
                                        <input type="text" id="sellPrice" value={this.state.sellPrice} onChange={this._sellPriceChanged.bind(this)} />
                                    </label>
                                    <p>Total ({this.state.assetA}): { sellTotal }</p>
                                    <input type="submit" className="button" value={"Sell " + this.state.assetB} />
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="grid-block medium-3 right-column">
                        <div className="grid-content">
                            <p>ORDER HISTORY</p>
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Time</th>
                                </tr>
                                </thead>
                                <tbody>
                                {
                                    this.state.history.orders.map(orderHistoryEntry)
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Exchange;
