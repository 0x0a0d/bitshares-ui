import alt from "alt-instance"
import { fromJS } from "immutable"

class BackupServerStore {
    
    constructor() {
        this.init = ()=> ({
            ui_status: "unknown"
        })
        this.state = this.init()
        this.exportPublicMethods({
            setWallet: this.setWallet.bind(this),
            update: this.update.bind(this),
        })
    }
    
    setWallet(wallet) {// try {
        this.state = this.init()
        
        if(this.wallet)
            this.wallet.unsubscribe(this.notify.bind(this))
        
        this.wallet = wallet
        this.notify()
        this.wallet.subscribe(this.notify.bind(this))
    }// catch(error) { console.error(error) }}
    
    update(state) {
        this.setState(state)
    }
    
    notify() {
        let { socket_status, remote_status, local_status } = this.wallet
        let { remote_url, remote_copy, remote_token } = this.wallet.storage.state.toJS()
        let weak_password  = this.wallet.wallet_object.get("weak_password")
        
        let ui_status = remote_copy != null ? "configure" : "unknown"
        
        this.setState({ 
            socket_status, remote_status, local_status,
            remote_url, remote_copy, remote_token,
            weak_password, 
            ui_status
        })
        console.log('BackupServerStore\tstate', this.state)
    }
    
    
}

export var AltBackupServerStore = alt.createStore(BackupServerStore, "BackupServerStore");
export default AltBackupServerStore
