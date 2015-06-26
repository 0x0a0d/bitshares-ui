import React from "react";
import Notification from "react-foundation-apps/src/notification";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Operation from "../Blockchain/Operation";
import Immutable from "immutable";

class Notifier extends React.Component {

    componentWillReceiveProps(nextProps) {
        let id = nextProps.currentAccount ? nextProps.currentAccount.id : null;
        let ch = this.props.accountHistories.get(id);
        let nh = nextProps.accountHistories.get(id);
        if (nh && ch && nh[0]) {
            if ((!ch[0] && nh[0].id) || (nh[0].id !== ch[0].id)) {
                ZfApi.publish("account-notify", "open");
                setTimeout(function() {ZfApi.publish("account-notify", "close"); }, 10000);
            }
        }
    }

    shouldComponentUpdate(nextProps) {
        return (
                !Immutable.is(nextProps.accountHistories, this.props.accountHistories) ||
                nextProps.currentAccount.id !== this.props.currentAccount.id ||
                !Immutable.is(nextProps.assets, this.props.assets) ||
                !Immutable.is(nextProps.settings, this.props.settings)
            );
    }

    render() {

        let {assets, account_id_to_name, currentAccount, witnesses, witness_id_to_name} = this.props;

        if(!currentAccount) { return <div></div>; }

        let id = currentAccount.id,
            trx, info;

        if (this.props.accountHistories.get(id)) {
            trx = this.props.accountHistories.get(id)[0];
            if (trx) {
                info = <Operation
                            op={trx.op}
                            block={trx.block_num}
                            accounts={account_id_to_name}
                            assets={assets}
                            current={currentAccount.name}
                            witnesses={witnesses}
                            witness_id_to_name={witness_id_to_name}
                            inverted={this.props.settings.get("inverseMarket")}/>;
            }
        }

        if(!trx) { return <div></div>; }

        return (
            <Notification.Static id='account-notify' title="New transaction" image="">
                <table className="table">
                    <tbody>
                        {info}
                    </tbody>
                </table>
            </Notification.Static>
        );
    }

}

export default Notifier;
