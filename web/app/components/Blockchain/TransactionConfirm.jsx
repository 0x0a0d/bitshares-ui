import React from "react";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import notify from "actions/NotificationActions";
import Transaction from "./Transaction";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import AccountStore from "stores/AccountStore";
import AssetStore from "stores/AssetStore";
import SettingsStore from "stores/SettingsStore";
import TransactionConfirmActions from "actions/TransactionConfirmActions";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import BaseComponent from "../BaseComponent";
import Icon from "../Icon/Icon";
import LoadingIndicator from "../LoadingIndicator";

class TransactionConfirm extends BaseComponent {
    
    constructor(props) {
        super(props, TransactionConfirmStore);
        this.state.broadcasting = false;
    }

    componentDidUpdate() {
        if(this.state.transaction || this.state.error || this.state.broadcasted) {
            ZfApi.publish("transaction_confim_modal", "open");
        } else {
            ZfApi.publish("transaction_confim_modal", "close");
        }
    }

    onConfirmClick(e) {
        e.preventDefault();
        TransactionConfirmActions.broadcast(this.state.transaction);
        this.setState({broadcasting: true});
    }

    onCloseClick(e) {
        e.preventDefault();
        this.state.broadcasting = false;
        TransactionConfirmActions.close();
    }

    render() {
        if ( !this.state.transaction) {return <div/>; }
        let assets = AssetStore.getState().assets;
        let account_id_to_name =  AccountStore.getState().account_id_to_name;
        let settings = SettingsStore.getState().settings;

        let button_group, header;
        if(this.state.error || this.state.broadcasted) {
            header = this.state.error ? (
                <div className="modal-header has-error">
                    <h3>Failed to broadcast transaction</h3>
                    <h6>{this.state.error}</h6>
                </div>
                ) :
                (
                <div className="modal-header">
                    <div className="float-right"><Icon name="checkmark-circle" size="4x" className="success"/></div>
                    <h3>Transaction was successfully broadcasted</h3>
                    <h6>#{this.state.trx_id}@{this.state.trx_block_num}</h6>
                </div>
            );
            button_group = (
                <div className="button-group">
                    <a href className="button" onClick={this.onCloseClick.bind(this)}>Close</a>
                </div>
            );
        } else if (this.state.broadcasting) {
            header = (
                <div className="shrink grid-block">
                    <h3>Broadcasting transaction..</h3>
                </div>
            );
            button_group = (
                <div className="button-group">
                    <LoadingIndicator type="circle"/> &nbsp; Broadcasting..
                </div>
            );
        } else {
            header = (
                <div className="shrink grid-block">
                    <Translate component="h3" content="transaction.confirm" />
                </div>
            );
            button_group = (
                <div className="button-group">
                    <a className="button" href onClick={this.onConfirmClick.bind(this)}><Translate content="transfer.confirm" /></a>
                    <a href className="secondary button" onClick={this.onCloseClick.bind(this)}><Translate content="account.perm.cancel" /></a>
                </div>
            );
        }

        return (
            <div ref="transactionConfirm">
                <Modal id="transaction_confim_modal" ref="modal" overlay={true}>
                    <Trigger close="">
                        <a href className="close-button">&times;</a>
                    </Trigger>
                    {header}
                    <div style={{maxHeight: "60vh"}}>
                        <Transaction
                            key={Date.now()}
                            trx={this.state.transaction.serialize()}
                            index={0}
                            account_id_to_name={account_id_to_name}
                            inverted={settings.get("inverseMarket")}
                            assets={assets} no_links={true}
                        />
                        <div className="grid-block shrink" style={{paddingTop: "1rem"}}>
                            {button_group}
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }
    
}

export default TransactionConfirm;

