import React, {PropTypes, Component} from "react"
import Translate from "react-translate-component"
import notify from "actions/NotificationActions"
import cname from "classnames"
import WalletDb from "stores/WalletDb"
import AuthInput from "components/Forms/AuthInput"
import WalletUnlock from "components/Wallet/WalletUnlock"
import LoadingIndicator from "components/LoadingIndicator"
import VerifyPassword from "components/Wallet/VerifyPassword"

export default class WalletChangePassword extends Component {
    
    constructor() {
        super()
        this.state = this.init_state = {
            loading: false,
            old_password: undefined,
            new_password: undefined
        }
    }
    
    componentWillUnmount() {
        this.setState(this.init_state)
    }
    
    render() {
        return <WalletUnlock>{ this.render_unlocked() }</WalletUnlock>
    }
    
    render_unlocked() {
        var ready = !!this.state.new_password && ! this.state.loading
        return <span>
            <h3><Translate content="wallet.change_password"/></h3>
            <VerifyPassword onValid={this.onOldPassword.bind(this)}>
                <form onSubmit={this.onAccept.bind(this)}>
                    <AuthInput onEnter={this.onNewPassword.bind(this)}/>
                </form>
                {this.state.loading ? <div className="center-content"><LoadingIndicator type="circle"/><br/></div>:null}
                <div className={cname("button success", {disabled: ! ready})}
                    onClick={this.onAccept.bind(this)}><Translate content="wallet.accept" /></div>
            </VerifyPassword>
            
            {this.state.loading ? null:<Reset/>}
            
        </span>
    }
    
    onAccept(e) {
        if(e) e.preventDefault()
        var {prev, next} = this.state
        this.setState({ loading: true }, ()=>{
            WalletDb.changePassword(prev, next)
            .then(()=> {
                this.setState(this.init_state)
                notify.success("Password changed")
                window.history.back()
            })
            .catch( error => {
                // Programmer or database error ( validation missed something? )
                // .. translation may be unnecessary
                console.error(error)
                notify.error("Unable to change password: " + error)
                this.setState(this.init_state)
            })
        })
    }
    onOldPassword({ email, username, password }) { this.setState({ prev: { email, username, password }}) }
    onNewPassword({ email, username, password }) { this.setState({ next: { email, username, password }}) }
}

class Reset extends Component {
    
    render() {
        var label = this.props.label || <Translate content="wallet.reset" />
        return  <span className="button cancel"
            onClick={this.onReset.bind(this)}>{label}</span>
    }
    
    onReset() {
        window.history.back()
    }
}
