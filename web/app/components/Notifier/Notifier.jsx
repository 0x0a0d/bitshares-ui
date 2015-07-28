import React from "react";
import Notification from "react-foundation-apps/src/notification";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Operation from "../Blockchain/Operation";
import Immutable from "immutable";

class Notifier extends React.Component {

    componentWillReceiveProps(nextProps) {
        let name = nextProps.currentAccount ? nextProps.currentAccount.name : null;
        if (name) {
            let ch = this.props.accountHistories.get(name);
            let nh = nextProps.accountHistories.get(name);
            if (nh && ch && nh[0]) {
                if ((!ch[0] && nh[0].id) || (nh[0].id !== ch[0].id)) {
                    ZfApi.publish("account-notify", "open");
                    setTimeout(function() {ZfApi.publish("account-notify", "close"); }, 10000);
                }
            }
        }
    }

    shouldComponentUpdate(nextProps) {
        return (
                !Immutable.is(nextProps.accountHistories, this.props.accountHistories) ||
                (this.props.currentAccount && nextProps.currentAccount.id !== this.props.currentAccount.id) ||
                !Immutable.is(nextProps.assets, this.props.assets) ||
                !Immutable.is(nextProps.settings, this.props.settings)
            );
    }

    render() {

        let {assets, account_id_to_name, currentAccount, witnesses, witness_id_to_name} = this.props;

        if(!currentAccount) { return <div></div>; }

        let {id, name} = currentAccount,
            trx, info;

        if (this.props.accountHistories.get(name)) {
            trx = this.props.accountHistories.get(name)[0];
            if (trx) {
                info = <Operation
                            op={trx.op}
                            block={trx.block_num}
                            account_id_to_name={account_id_to_name}
                            assets={assets}
                            current={name}
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
