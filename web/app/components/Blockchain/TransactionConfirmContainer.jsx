import React from "react";
import AccountStore from "stores/AccountStore";
import AssetStore from "stores/AssetStore";
import AltContainer from "alt/AltContainer";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import SettingsStore from "stores/SettingsStore";

import TransactionConfirm from "./TransactionConfirm";

class TransactionConfirmContainer extends React.Component {

    constructor() {
        super();
        this.state = {onConfirmFunction: null};
    }

    componentDidMount() {
        TransactionConfirmStore.listen(this._onTransactionConfirm.bind(this));
    }

    componentWillUnmount() {
        TransactionConfirmStore.unlisten(this._onTransactionConfirm);
    }

    _getConfirmFunction(func) {
        this.setState({onConfirmFunction: func});
    }

    _onTransactionConfirm() {
        var {tr, resolve, reject} = TransactionConfirmStore.getState();
        this.state.onConfirmFunction(tr, resolve, reject);
        // console.log('... _onTransactionConfirm',tr)
    }

    render() {

        return (
              <AltContainer 
                  stores={[AccountStore, AssetStore, TransactionConfirmStore, SettingsStore]}
                  inject={{
                    tr: () => {
                        return TransactionConfirmStore.getState().tr;
                    },
                    resolve: () => {
                        return TransactionConfirmStore.getState().resolve;
                    },
                    reject: () => {
                        return TransactionConfirmStore.getState().reject;
                    },
                    assets: () => {
                        return AssetStore.getState().assets;
                    },
                    account_id_to_name: () => {
                        return AccountStore.getState().account_id_to_name;
                    },
                    settings: () => {
                        return SettingsStore.getState().settings;
                    }
                  }} 
                  >
                <TransactionConfirm cb={this._getConfirmFunction.bind(this)} />
              </AltContainer>
        );
    }
}

export default TransactionConfirmContainer;
