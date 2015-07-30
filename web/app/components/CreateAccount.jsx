import React from "react";
import forms from "newforms";
import classNames from "classnames";
import AccountActions from "actions/AccountActions";
import AccountNameInput from "./Forms/AccountNameInput";
import PasswordInput from "./Forms/PasswordInput";
import WalletDb from "stores/WalletDb";
import notify from 'actions/NotificationActions';
import {Link} from "react-router";
import AccountImage from "./Account/AccountImage";


class CreateAccount extends React.Component {
    constructor() {
        super();
        this.state = {validAccountName: false, accountName: ""};
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.accountName !== this.state.accountName
               || nextState.validAccountName !== this.state.validAccountName;
    }

    onAccountNameChange(e) {
        let state = {validAccountName: e.valid};
        if(e.value || e.value === "") state.accountName = e.value;
        this.setState(state);
    }

    createAccount(name) {
        return AccountActions.createAccount(name).then(() => {
            notify.addNotification({
                message: `Successfully created account: ${name}`,
                level: "success",
                autoDismiss: 10
            });
            this.context.router.transitionTo("account_name", {name: name});
        }).catch(error => {
            // Show in GUI
            console.log("ERROR AccountActions.createAccount", error);
            notify.addNotification({
                message: `Failed to create account: ${name}`,
                level: "error",
                autoDismiss: 10
            });
        });
    }

    createWallet(account_name, password) {
        return WalletDb.onCreateWallet(
            account_name,
            password,
            null, //this.state.brainkey,
            true //unlock
        ).then(()=> {
            console.log("Congratulations, your wallet was successfully created.");
        }).catch(err => {
            console.log("CreateWallet failed:", err);
            notify.addNotification({
                message: `Failed to create wallet: ${err}`,
                level: "error",
                autoDismiss: 10
            })
        });
    }

    onSubmit(e) {
        e.preventDefault();
        let account_name = this.refs.account_name.value();

        if (WalletDb.getWallet()) {
            this.createAccount(account_name);
        } else {
            let password = this.refs.password.value();
            this.createWallet(account_name, password).then(() => this.createAccount(account_name));
        }
    }

    render() {
        let buttonClass = classNames("button", {disabled: !this.state.validAccountName});

        return (
            <div className="grid-block vertical">
                <div className="grid-content">
                    <div className="content-block center-content">
                        <h1>Welcome to Graphene</h1>
                        <h3>Please create an account</h3>
                        <br/>
                        <form className="medium-3" onSubmit={this.onSubmit.bind(this)} noValidate>
                            <AccountNameInput ref="account_name"
                                              onChange={this.onAccountNameChange.bind(this)}
                                              accountShouldNotExist={true}/>
                            {this.state.accountName && this.state.validAccountName ? <div><AccountImage account={this.state.accountName}/><br/><br/></div> : null}
                            {WalletDb.getWallet() ? null :
                                <PasswordInput ref="password" confirmation={true}/>
                            }
                            <button className={buttonClass}>Create Account</button>
                            <br/>
                            <br/>
                            <Link to="existing-account">Already have an account?</Link>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

CreateAccount.contextTypes = {router: React.PropTypes.func.isRequired};

export default CreateAccount;
