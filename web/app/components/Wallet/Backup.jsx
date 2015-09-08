import React, {PropTypes, Component} from "react"
import {Link} from "react-router";
import connectToStores from "alt/utils/connectToStores"
import WalletUnlockActions from "actions/WalletUnlockActions"
import WalletActions from "actions/WalletActions"
import WalletStore from "stores/WalletStore"
import BackupStore from "stores/BackupStore"
import WalletDb from "stores/WalletDb"
import BackupActions, {backup, restore, decryptWalletBackup} from "actions/BackupActions"
import notify from "actions/NotificationActions"
import {saveAs} from "filesaver.js"
import cname from "classnames"
import hash from "common/hash"
import { CurrentWallet } from "components/Wallet/Wallet"

class BackupBaseComponent extends Component {
    
    static getStores() {
        return [WalletStore, BackupStore]
    }
    
    static getPropsFromStores() {
        var wallet = WalletStore.getState()
        var backup = BackupStore.getState()
        return { wallet, backup }
    }
    
}

@connectToStores
export default class Backup extends BackupBaseComponent {
    
    constructor() {
        super()
        this.state = {}
    }
    
    componentWillMount() {
        BackupActions.reset()
    }
    
    render() {
        var is_default = this.props.wallet.current_wallet === "default"
        // var has_contents = !!this.props.backup.contents
        var current_operation = this.props.current_operation
        
        return <div className="grid-block vertical full-width-content">
            <div className="grid-content shrink no-overflow-padding">
            
                <h3>Backups</h3>
                
                <Link to="backup-create">
                <div className="button success">Create Backup</div></Link>
                
                <Link to="backup-verify">
                <div className="button success">Verify Prior Backup</div></Link>
                
                <Link to="backup-restore">
                <div className="button success">Restore Backup</div></Link>
                
            </div>
        </div>
    }
}

@connectToStores
export class BackupCreate extends BackupBaseComponent {
    render() {
        return <div className="grid-block vertical full-width-content">
            <div className="grid-content shrink no-overflow-padding">
                
                <h3>Create Backup</h3>
                
                <Create>
                    <NameSizeModified/>
                    <DecryptBackup>
                        <Download/>
                    </DecryptBackup>
                    <Reset/>
                </Create>
                
            </div>
        </div>
    }
}

@connectToStores
export class BackupVerify extends BackupBaseComponent {
    render() {
        return <div className="grid-block vertical full-width-content">
            <div className="grid-content shrink no-overflow-padding">
                
                <h3>Verify Prior Backup</h3>
                
                <Upload>
                    <NameSizeModified/>
                    <DecryptBackup>
                        <h4>Verified</h4>
                    </DecryptBackup>
                    <Reset/>
                </Upload>
            
            </div>
        </div>
    }
}


@connectToStores
export class BackupRestore extends BackupBaseComponent {
    
    constructor() {
        super()
        this.state = {
            newWalletName: null
        }
    }
    
    render() {
        
        return <div className="grid-block vertical full-width-content">
            <div className="grid-content shrink no-overflow-padding">
                
                <h3>Restore Backup</h3>
                
                <Upload>
                    <NameSizeModified/>
                    <DecryptBackup saveWalletObject={true}>
                        <NewWalletName>
                            <Restore>
                                <Link to="wallet">
                                    <span className="button success">
                                    Manage Wallets</span></Link>
                            </Restore>
                        </NewWalletName>
                    </DecryptBackup>
                    <Reset/>
                </Upload>
            
            </div>
        </div>
    }
    
}

@connectToStores
class Restore extends BackupBaseComponent {
    
    constructor() {
        super()
        this.state = {
            success: false
        }
    }
    
    render() {
        var new_wallet = this.props.wallet.new_wallet
        var has_new_wallet = this.props.wallet.wallet_names.has(new_wallet)
        
        if(has_new_wallet)
            return <span>
                <h4>Successfully restored <b>{new_wallet.toUpperCase()}</b></h4>
                <div>{this.props.children}</div>
            </span>
        
        return <span>
            <h3>Ready to Restore</h3>
            <div className="button success" 
                onClick={this.onRestore.bind(this)}>Restore ({new_wallet} Wallet)</div>
        </span>
    }
    
    onRestore() {
        WalletActions.restore(
            this.props.wallet.new_wallet,
            this.props.backup.wallet_object
        )
    }
    
}

@connectToStores
class NewWalletName extends BackupBaseComponent {
    
    constructor() {
        super()
        this.state = {
            new_wallet: null,
            accept: false
        }
    }
    
    componentWillMount() {
        var has_current_wallet = !!this.props.wallet.current_wallet
        if( ! has_current_wallet) {
            WalletStore.setNewWallet("default")
            this.setState({accept: true})
        }
        if( has_current_wallet && this.props.backup.name && ! this.state.new_wallet) {
            // begning of the file name might make a good wallet name
            var new_wallet = this.props.backup.name.match(/[a-z0-9_-]*/)[0]
            if( new_wallet )
                this.setState({new_wallet})
        }
    }
    
    render() {
        if(this.state.accept)
            return <span>{this.props.children}</span>
        
        var has_wallet_name = !!this.state.new_wallet
        var has_wallet_name_conflict = has_wallet_name ?
            this.props.wallet.wallet_names.has(this.state.new_wallet) : false
        var name_ready = ! has_wallet_name_conflict && has_wallet_name
        
        return <span>
            <h5>New Wallet Name</h5>
            <input type="text" id="new_wallet"
                onChange={this.formChange.bind(this)}
                value={this.state.new_wallet} />
            <p>{ has_wallet_name_conflict ? "Wallet exists, choose a new name" : null}</p>
            <div className={cname("button success", {disabled: ! name_ready})}
                onClick={this.onAccept.bind(this)}>Accept</div>
        </span>
    }
    
    onAccept() {
        this.setState({accept: true})
        WalletStore.setNewWallet(this.state.new_wallet)
    }
    
    formChange(event) {
        var key_id = event.target.id
        var value = event.target.value
        if(key_id === "new_wallet") {
            //case in-sensitive
            value = value.toLowerCase()
            // Allow only valid file name characters
            if( /[^a-z0-9_-]/.test(value) ) return
        }
        var state = {}
        state[key_id] = value
        this.setState(state)
    }
    
}




@connectToStores
class Download extends BackupBaseComponent {
    
    componentWillMount() {
        try { this.isFileSaverSupported = !!new Blob; } catch (e) {}
    }
    
    componentDidMount() {
        if( ! this.isFileSaverSupported )
            notify.error("File saving is not supported")
    }
    
    render() {
        return <span className="button success"
            onClick={this.onDownload.bind(this)}>Download</span>
    }
    
    onDownload() {
        var blob = new Blob([ this.props.backup.contents ], {
            type: "application/octet-stream; charset=us-ascii"})
        
        if(blob.size !== this.props.backup.size)
            throw new Error("Invalid backup to download conversion")
        
        saveAs(blob, this.props.backup.name);
    }
}

@connectToStores
class Create extends BackupBaseComponent {
    
    render() {
        var has_backup = !!this.props.backup.contents
        if( has_backup ) return <div>{this.props.children}</div>
        
        var ready = WalletDb.getWallet() != null
        
        return <div onClick={this.onCreateBackup.bind(this)}
            className={cname("button success", {disabled: !ready})}>
            Create Backup ({this.props.wallet.current_wallet} Wallet)</div>
    }
    
    onCreateBackup() {
        var backup_pubkey = WalletDb.getWallet().password_pubkey
        backup(backup_pubkey).then( contents => {
            var name = this.props.wallet.current_wallet + ".bin"
            BackupActions.incommingBuffer({name, contents})
        })
    }
    
}

@connectToStores
class Upload extends BackupBaseComponent {
    
    render() {
        if(
            this.props.backup.contents &&
            this.props.backup.public_key
        )
            return <span>{this.props.children}</span>
        
        var is_invalid =
            this.props.backup.contents &&
            ! this.props.backup.public_key

        return <span>
            <input type="file" id="backup_input_file" style={{ border: 'solid' }}
                onChange={this.onFileUpload.bind(this)} />
            { is_invalid ? <h5>Invalid Format</h5> : null }
        </span>
    }
    
    onFileUpload(evt) {
        var file = evt.target.files[0]
        BackupActions.incommingWebFile(file)
        this.forceUpdate()
    }
}


@connectToStores
class NameSizeModified extends BackupBaseComponent {
    render() {
        return <span>
            <h5><b>{this.props.backup.name}</b> ({this.props.backup.size} bytes)</h5>
            {this.props.backup.last_modified ?
                <div>{this.props.backup.last_modified}</div> : null }
            <br/>
        </span>
    }
}

@connectToStores
class DecryptBackup extends BackupBaseComponent {
    
    static propTypes = {
        saveWalletObject: PropTypes.bool
    }
    
    constructor() {
        super()
        this.state = this._getInitialState()
    }
    
    _getInitialState() {
        return {
            backup_password: null,
            verified: false
        }
    }
    
    render() {
        if(this.state.verified) return <span>{this.props.children}</span>
        return <span>
            <label>Enter Password</label>
            <input type="password" id="backup_password"
                onChange={this.formChange.bind(this)}
                value={this.state.backup_password}/>
            <Sha1/>
            <span className="button success"
                onClick={this.onPassword.bind(this)}>Verify</span>
        </span>
    }
    
    onPassword() {
        var private_key = PrivateKey.fromSeed(this.state.backup_password || "")
        var contents = this.props.backup.contents
        decryptWalletBackup(private_key.toWif(), contents).then( wallet_object => {
            this.setState({verified: true})
            if(this.props.saveWalletObject)
                BackupStore.setWalletObjct(wallet_object)
            
        }).catch( error => {
            console.error("Error verifying wallet " + this.props.backup.name,
                error, error.stack)
            if(error === "invalid_decryption_key")
                notify.error("Invalid Password")
            else
                notify.error(""+error)
        })
    }
    
    formChange(event) {
        var state = {}
        state[event.target.id] = event.target.value
        this.setState(state)
    }
    
}

@connectToStores
export class Sha1 extends BackupBaseComponent {
    render() { 
        return <div>
            <pre className="no-overflow">{this.props.backup.sha1} * SHA1</pre>
            <br/>
        </div>
    }
}

@connectToStores
class Reset extends BackupBaseComponent {
    render() {
        return  <span className="button cancel"
            onClick={this.onReset.bind(this)}>Reset</span>
    }
    
    onReset() {
        BackupActions.reset()
    }
}