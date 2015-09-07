import React from "react";
import {Link} from "react-router";
import FormattedAsset from "../Utility/FormattedAsset";
import FormattedPrice from "../Utility/FormattedPrice";
import Translate from "react-translate-component";

class MarketCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {newAccount: "", error: false};
    }

    render() {

        let {market, quote, base} = this.props;
        let marketID = market.quoteSymbol + "_" + market.baseSymbol;
        let marketName = market.quoteSymbol + " vs " + market.baseSymbol;

        return (
            <div style={{padding: "0.5em 0.5em"}} className="grid-content account-card">
                <div className="card">
                    <Link to="exchange" params={{marketID: marketID}}>
                        <div style={{padding: "5px"}}>
                        </div>
                        <div style={{color: "black"}} className="card-divider text-center">
                            <span>{marketName} { /* <span style={{zIndex:999}} onClick={this.props.removeMarket} className="badge float-right">-</span> */ }</span>
                        </div>
                        <div className="card-section">
                            <ul >
                                <li><Translate content="markets.core_rate" />: <FormattedPrice
                                                    style={{fontWeight: "bold"}}
                                                    quote_amount={quote.options.core_exchange_rate.quote.amount}
                                                    quote_asset={quote.id}
                                                    base_amount={quote.options.core_exchange_rate.base.amount}
                                                    base_asset={base.id} />
                                </li>
                                <li><Translate content="markets.supply" />: <FormattedAsset
                                                    style={{fontWeight: "bold"}}
                                                    amount={quote.dynamic_data.current_supply}
                                                    asset={quote.id}
                                                    />
                                </li>
                            </ul>
                        </div>
                    </Link>
                </div>
            </div>
        );
    }
}

export default MarketCard;
