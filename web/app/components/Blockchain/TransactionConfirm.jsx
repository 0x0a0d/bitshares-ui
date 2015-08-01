import React from "react";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import notify from "actions/NotificationActions";
import Transaction from "./Transaction";
import Translate from "react-translate-component";

export default class TransactionConfirm extends React.Component {
    
    constructor() {
        super();
        this.state = this._getInitialState();
    }

    componentDidMount() {
        this.props.cb(this.confirm_and_broadcast.bind(this));
    }
    
    _getInitialState() {
        return {tr: null, confirmed: false};
    }
    
    reset() {
        this.setState(this._getInitialState());
    }
    
    confirm_and_broadcast(tr, resolve, reject) {
        console.log("confirm_and_broadcast:", tr);
        // let {tr, resolve, reject} = this.props;
        var trx = tr.serialize();
        this.setState({tr, trx, resolve, reject});
        
        ZfApi.publish("transaction_confim_modal", "open");
    }
    
    render() {
        if ( !this.state.trx) {return <div/>; }
        var {assets, account_id_to_name} = this.props;
        
        return (
            <div ref="transactionConfirm" className="large">
            <Modal id="transaction_confim_modal" ref="modal" overlay={true}>
                <Trigger close="">
                    <a href className="close-button">&times;</a>
                </Trigger>
                <div className="grid-frame vertical">
                    <div className="shrink grid-block">
                        <h3>Please confirm transaction</h3>
                    </div>

                    <div className="grid-block">
                        {this.state.trx ?
                            <Transaction
                                key={0}
                                trx={this.state.trx}
                                index={0}
                                account_id_to_name={account_id_to_name}
                                assets={assets} no_links={true}
                            />
                            : null}
                    </div>
                    <div className="grid-block shrink" style={{paddingTop: "0.5rem"}}>
                        <div className="button-group">
                            <a className="button success" href onClick={this._confirmPress.bind(this)}>Confirm</a>
                            <Trigger close="transaction_confim_modal">
                                <a href className="secondary button"><Translate content="account.perm.cancel" /></a>
                            </Trigger>
                        </div>
                    </div>

                </div>
            </Modal>
            </div>
        );
    }
    
    _confirmPress() {
        ZfApi.publish("transaction_confim_modal", "close");
        this.state.tr.broadcast().then( ()=> {
            notify.success("Transaction broadcasted");
            this.state.resolve();
            this.reset();
        }).catch( error => {
            console.log("TransactionConfirm broadcast error", error);
            var message = error;
            notify.error("Transaction broadcast error: ", message);
            this.state.reject(error);
            this.reset();
        });
    }
    
    //_passwordChange(event) {
    //    this.setState({password: event.target.value})
    //}
    
    
}

