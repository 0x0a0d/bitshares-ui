import React from "react";
import Immutable from "immutable";
import classNames from "classnames";
import market_utils from "common/market_utils";
import {FormattedDate} from "react-intl";
import intlData from "../Utility/intlData";
import Ps from "perfect-scrollbar";
import utils from "common/utils";
import Translate from "react-translate-component";
import counterpart from "counterpart";

class TableHeader extends React.Component {
    shouldComponentUpdate() {
        return false;
    }

    render() {
        if (this.props.type === "buy") {
            return (
                <thead>
                    <tr>
                        <th style={{textAlign: "left"}}></th>
                        <th style={{textAlign: "right"}}><Translate content="transaction.expiration" /></th>
                        <th style={{textAlign: "right"}}><Translate content="exchange.value" /></th>
                        <th style={{textAlign: "right"}}><Translate content="transfer.amount" /></th>
                        <th style={{textAlign: "right"}}><Translate content="exchange.price" /></th>
                    </tr>
                </thead>
            );
        } else {
            return (
                <thead>
                    <tr>
                        <th style={{textAlign: "right"}}><Translate content="exchange.price" /></th>
                        <th style={{textAlign: "right"}}><Translate content="transfer.amount" /></th>
                        <th style={{textAlign: "right"}}><Translate content="exchange.value" /></th>
                        <th style={{textAlign: "right"}}><Translate content="transaction.expiration" /></th>
                        <th style={{textAlign: "right"}}></th>
                    </tr>
                </thead>
            );
        }
    }
}

class MyOpenOrders extends React.Component {
    shouldComponentUpdate(nextProps) {
        return (
                nextProps.currentAccount.id !== this.props.currentAccount.id ||
                !Immutable.is(nextProps.orders, this.props.orders)
            );
    }

    componentDidMount() {
        let orderContainer = React.findDOMNode(this.refs.orders);
        Ps.initialize(orderContainer);
    }

    render() {

        let {orders, currentAccount, base, quote, quoteSymbol, baseSymbol} = this.props;
        let bids = null, asks = null;

        if(orders.size > 0 && base && quote) {
            let cancel = counterpart.translate("account.perm.cancel");

            bids = orders.filter(a => {
                return (a.seller === currentAccount && a.sell_price.quote.asset_id !== base.id);
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, base, quote);
                let {price: b_price} = market_utils.parseOrder(b, base, quote);

                return b_price.full - a_price.full;
            }).map(order => {
                let {value, price, amount} = market_utils.parseOrder(order, base, quote);
                let isAskOrder = market_utils.isAsk(order, base);
                let tdClass = classNames({orderHistoryBid: !isAskOrder, orderHistoryAsk: isAskOrder});
                return (
                     <tr key={order.id}>
                         <td className="text-left">
                            <a style={{marginLeft: "0"}} className="tiny button outline order-cancel" onClick={this.props.onCancel.bind(this, order.id)}>
                                <span>{cancel}</span>
                            </a>
                        </td>
                        <td><FormattedDate
                            value={order.expiration}
                            formats={intlData.formats}
                            format="short"
                            />
                        </td>
                        <td>{utils.format_number(value, 3)}</td>
                        <td>{utils.format_number(amount, 3)}</td>
                        <td className={tdClass}>
                            <span className="price-integer">{price.int}</span>
                            .
                            <span className="price-decimal">{price.dec}</span>
                        </td>


                    </tr>
                    );
            }).toArray();

            asks = orders.filter(a => {
                return (a.seller === currentAccount && a.sell_price.quote.asset_id === base.id);
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, base, quote);
                let {price: b_price} = market_utils.parseOrder(b, base, quote);

                return a_price.full - b_price.full;
            }).map(order => {
                let {value, price, amount} = market_utils.parseOrder(order, base, quote);
                let isAskOrder = market_utils.isAsk(order, base);
                let tdClass = classNames({orderHistoryBid: !isAskOrder, orderHistoryAsk: isAskOrder});
                return (
                     <tr key={order.id}>
                        <td className={tdClass}>
                            <span className="price-integer">{price.int}</span>
                            .
                            <span className="price-decimal">{price.dec}</span>
                        </td>
                        <td>{utils.format_number(amount, 3)}</td>
                        <td>{utils.format_number(value, 3)}</td>
                        <td><FormattedDate
                            value={order.expiration}
                            formats={intlData.formats}
                            format="short"
                            />
                        </td>
                        <td className="text-right">
                            <a style={{marginRight: "0"}} className="tiny button outline order-cancel" onClick={this.props.onCancel.bind(this, order.id)}>
                            <span>{cancel}</span>
                            </a>
                        </td>

                    </tr>
                    );
            }).toArray();

        } else {
            return (
                <div className="grid-content text-center ps-container" ref="orders">
                </div>
            );
        }

        return (
            <div className="grid-content text-center ps-container" ref="orders">
                <table className="table order-table my-orders text-right table-hover">
                    <TableHeader type="buy" />
                    <tbody>
                        {bids}
                    </tbody>
                </table>

                <table className="table order-table my-orders text-right table-hover">
                    <TableHeader type="sell" />
                    <tbody>
                        {asks}
                    </tbody>
                </table>
            </div>
        );
    }
}

export default MyOpenOrders;
