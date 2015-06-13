import React from "react";
import Icon from "../Icon/Icon";
import Immutable from "immutable";

class MyOpenOrders extends React.Component {
    shouldComponentUpdate(nextProps) {
        return (
            nextProps.account.id !== this.props.account.id ||
            !Immutable.is(nextProps.orders, this.props.orders)
            );
    }

    render() {
        let {orders, account} = this.props;
        console.log("orders:", orders.toJS());
        let orderRows = null;

        if(orders.size > 0) {
            orderRows = orders.filter(a => {
                // console.log(account, a);
                return a.seller === account; 
            }).map(order => {
                return (
                     <tr key={order.id}>
                        <td>
                            <a onClick={this.props.onCancel.bind(this, order.id)}>
                                <Icon name="cross-circle" fillClass="fill-black" />
                            </a>
                        </td>
                        <td>{((order.for_sale * order.sell_price.quote.amount) / order.sell_price.base.amount) / this.props.quote.precision}</td>
                        <td>{order.sell_price.base.amount / order.sell_price.quote.amount }</td>
                        {/*TODO: add expiration data <td>{order.expiration}</td> */}
                    </tr>
                    );
            }).toArray();
        }
        return (
            <table className="table">
                <thead>
                <tr>
                    <th>{/* "Cancel button" column */}</th>
                    <th>Quantity ({this.props.quote.symbol})</th>
                    <th>Price ({this.props.base.symbol})</th>
                    <th>{/* "Buy/Sell" column */}</th>
                </tr>
                </thead>
                <tbody>
                    {orderRows}
                </tbody>
            </table>
        );
    }
}

export default MyOpenOrders;
