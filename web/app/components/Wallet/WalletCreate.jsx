import React, {Component} from "react"

import WalletDb from "stores/WalletDb"
import NotificationSystem from 'react-notification-system'
import notify from 'actions/NotificationActions'

import key from "common/key_utils"
import cname from "classnames"

class WalletCreate extends Component {
    
    constructor() {
        super()
        this.state = { 
            wallet_public_name: "default",
            password: "",
            password_confirm: "",
            errors: {},
            isValid: false
        }
        this.validate()
    }
    
    render() {
        let state = this.state
        let errors = state.errors
        let submitDisabled = this.state.isValid ? "" : "disabled"
        
        if(WalletDb.getWallet() && this.props.children)
            return <div>{this.props.children}</div>
        
        return (
            <div className="content-block">
                <h3>Create Wallet</h3>
                <form
                    className="name-form"
                    onSubmit={this.onSubmit.bind(this)}
                    onChange={this.formChange.bind(this)} noValidate
                >
                    <div className={cname("grid-content", "no-overflow", {
                        "has-error": errors.password_match
                    })}>
                        <label>Password</label>
                        <input type="password" id="password"
                            value={this.state.password} />

                        <label>Password (confirm)</label>
                            <input type="password" id="password_confirm"
                                value={this.state.password_confirm}/>
                        <div>{errors.password_match}</div>
                        <br/>
                    </div>

                    <div className="grid-content">
                        <input type="submit" value="Create"
                            className={cname("button",{disabled:submitDisabled})}/>
                        <br/>
                    </div>
                </form>
            </div>
        )
    }
// Multiple wallets:
//                <div className={cname("grid-content", {"has-error": errors.from})}>
//                    <label>Name</label>
//                    <input type="text" id="wallet_public_name"
//                        value={this.state.wallet_public_name}
//                        disabled
//                    />
//                    <div>{errors.wallet_public_name}</div>
//                    <br/>
//                </div>

    validate() {
        let state = this.state
        let errors = state.errors
        let wallets = WalletDb.wallets
        
        errors.wallet_public_name = 
            !wallets.get(state.wallet_public_name) ? 
            null : `Wallet ${state.wallet_public_name.toUpperCase()} exists, please change the name`
        
        errors.password_match = null
        errors.password_match =
            state.password === state.password_confirm ||
            //don't report it until the confirm is populated
            (state.password === "" || state.password_confirm === "")
        ? null :
            "Passwords do not match"
        
        let password_unmatch =
            state.password !== state.password_confirm
        
        state.isValid = !(errors.wallet_public_name || password_unmatch)
    }
    
    formChange(event) {
        let key_id = event.target.id
        let value = event.target.value
        if(key_id === "wallet_public_name") {
            //case in-sensitive
            value = value.toLowerCase()
        }
        //TODO BrainKeyCreate.jsx
        //key.suggest_brain_key(key.browserEntropy() + secret_server_token)
        //if(key_id === "brainkey") {
        //    value = value.toUpperCase()
        //    value = value.split(/[\t\n\v\f\r ]+/).join(" ")
        //}
        
        this.state[key_id] = value
        this.validate()
        this.setState(this.state)
    }
    
    onSubmit(e) {
        e.preventDefault()
        WalletDb.onCreateWallet(
            null,//login_account_name
            this.state.password,
            null, //this.state.brainkey,
            true //unlock
        ).then( ()=> {
            notify.addNotification({
                message: `Wallet Created`,//: ${this.state.wallet_public_name}
                level: "success",
                autoDismiss: 10
            })
            this.forceUpdate()
        }).catch(err => {
            var error = err
            try { err = err.target.error } catch(e) {}
            console.log("CreateWallet failed:", error.name, error.message, err)
            notify.addNotification({
                message: `Failed to create wallet: ${error.message}`,
                level: "error",
                autoDismiss: 10
            })
        })
    }
    
}

export default WalletCreate
