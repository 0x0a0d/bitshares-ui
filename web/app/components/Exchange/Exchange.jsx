import React from "react";
import MarketsActions from "actions/MarketsActions";
import MyOpenOrders from "./MyOpenOrders.jsx";
import utils from "common/utils";

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

class Exchange extends React.Component {
    constructor() {
        super();

        this.state = {
            orderBook: orderBook,
            history: history,
            buyAmount: 5,
            buyPrice: orderBook.asks[0].price,
            sellAmount: 5,
            sellPrice: orderBook.bids[orderBook.bids.length - 1].price
        };
    }

    createLimitOrder(buyID, sellID, amount, price) {
        let {account, assets, asset_symbol_to_id, quoteSymbol} = this.props;

        let quotePrecision = utils.get_asset_precision(assets.get(sellID).precision);
        amount = amount * quotePrecision;
        console.log("sell id:", sellID);
        MarketsActions.createLimitOrder(
            account.id, 
            amount * price,
            sellID,
            amount,
            buyID,
            "2020-01-01T00:00:00", // expiration
            false // fill or kill
        );
    }

    _cancelLimitOrder(orderID) {
        console.log("cancelling limit order:", orderID);
        let {account} = this.props;
        MarketsActions.cancelLimitOrder(
            account.id,
            orderID // order id to cancel
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
        let {account, limit_orders, short_orders, baseSymbol, quoteSymbol} = this.props;
        var spread = this.state.orderBook.bids.length > 0 && this.state.orderBook.asks.length > 0 ?
            this.state.orderBook.asks[0].price - this.state.orderBook.bids[this.state.orderBook.bids.length - 1].price :
            "N/A";

        var buyTotal = this.state.buyAmount * this.state.buyPrice;
        var sellTotal = this.state.sellAmount * this.state.sellPrice;

        let baseID = this.props.asset_symbol_to_id[baseSymbol];
        let quoteID = this.props.asset_symbol_to_id[quoteSymbol];
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

        limit_orders.map(order => {
            // console.log("real limit order:", order);
        });

        if (isMarketAsset) {
            short_orders.map(order => {
                // console.log("real short order:", order);
            });
        }

        return (
            <div className="grid-block vertical">
                <div classname="grid-block">
                </div>
                <div className="grid-block page-layout">
                    <div className="grid-block medium-3 left-column">
                        <div className="grid-content">
                            <p>MY OPEN ORDERS</p>
                            <MyOpenOrders
                                orders={limit_orders}
                                account={account.id}
                                baseSymbol={baseSymbol}
                                quoteSymbol={quoteSymbol}
                                onCancel={this._cancelLimitOrder.bind(this)} />
                            <p>OPEN ORDERS</p>
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Quantity ({quoteSymbol})</th>
                                    <th>Price ({baseSymbol})</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.orderBook.bids.map(orderBookEntry)
                                    }
                                    <tr><td colSpan="2" className="text-center">Spread: {spread} {baseSymbol}</td></tr>
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
                                <form onSubmit={this.createLimitOrder.bind(this, quoteID, baseID, this.state.buyAmount, this.state.buyPrice)}>
                                    <label>
                                        Quantity ({quoteSymbol}):
                                        <input type="text" id="buyAmount" value={this.state.buyAmount} onChange={this._buyAmountChanged.bind(this)} />
                                    </label>
                                    <label>
                                        Price: ({baseSymbol} per {quoteSymbol}):
                                        <input type="text" id="buyPrice" value={this.state.buyPrice} onChange={this._buyPriceChanged.bind(this)} />
                                    </label>
                                    <p>Total ({baseSymbol}): { buyTotal }</p>
                                    <input type="submit" className="button" value={"Buy " + quoteSymbol} />
                                </form>
                            </div>
                        </div>
                        <div className="grid-block medium-6 main-content">
                            <div className="grid-content">
                                <form onSubmit={this.createLimitOrder.bind(this, baseID, quoteID, this.state.sellAmount, this.state.sellPrice)}>
                                    <label>
                                        Quantity ({quoteSymbol}):
                                        <input type="text" id="sellAmount" value={this.state.sellAmount} onChange={this._sellAmountChanged.bind(this)} />
                                    </label>
                                    <label>
                                        Price: ({baseSymbol} per {quoteSymbol}):
                                        <input type="text" id="sellPrice" value={this.state.sellPrice} onChange={this._sellPriceChanged.bind(this)} />
                                    </label>
                                    <p>Total ({baseSymbol}): { sellTotal }</p>
                                    <input type="submit" className="button" value={"Sell " + quoteSymbol} />
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
