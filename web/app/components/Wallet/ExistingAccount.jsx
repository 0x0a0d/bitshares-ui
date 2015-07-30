import React from "react"

import PrivateKey from "ecc/key_private"

import Wallet from "components/Wallet/Wallet"
import BalanceClaim from "components/Wallet/BalanceClaim"
import ImportKeys from "components/Wallet/ImportKeys"
import FormattedAsset from "components/Utility/FormattedAsset"
import Apis from "rpc_api/ApiInstances"

import WalletActions from "actions/WalletActions"
import AccountStore from "stores/AccountStore"
import WalletDb from "stores/WalletDb"

import notify from 'actions/NotificationActions'
import cname from "classnames"
import lookup from "chain/lookup"
import v from "chain/serializer_validation"

var api = Apis.instance()

class ExistingAccount extends React.Component {
    
    constructor() {
        super()
        this.state = this._getInitialState()
    }
    
    _getInitialState() {
        return {
            keys:{
                wif_count:0,
                wifs_to_account: null,
                wif_to_balances: null
            },
            balance_by_asset:null,
            balance_claim_active: false,
            import_active: true,
            account_keycount: null,
            claim_account_name:null,
            wif_to_balances: null,
            wif_to_accounts: null,
            //blockchain_accounts: null,
            balances_known: false,
            accounts_known: false,
            import_keys_ref: Date.now()
        }
    }
    
    reset() {
        this.setState(this._getInitialState())
    }
    
    _importKeysChange(keys) {
        var wifs = Object.keys(keys.wifs_to_account)
        if( ! wifs.length) {
            this.reset()
            return
        }
        this.lookupBalances(wifs).then( wif_to_balances => {
            //this.lookupAccounts(wifs).then( blockchain_accounts => {
            //    this.setState({blockchain_accounts, accounts_known:true})
            //})
            
            var assetid_balance = this.balanceByAsset(wif_to_balances)
            var asset_ids = Object.keys(assetid_balance)
            var asset_symbol_precisions = []
            for(let asset_id of asset_ids) {
                asset_symbol_precisions.push(
                    lookup.asset_symbol_precision(asset_id)
                )
            }
            lookup.resolve().then(()=> {
                var balance_by_asset = []
                for(let i = 0; i < asset_ids.length; i++) {
                    var symbol = asset_symbol_precisions[i].resolve[0]
                    var precision = asset_symbol_precisions[i].resolve[1]
                    var asset_id = asset_ids[i]
                    var balance = assetid_balance[asset_id]
                    balance_by_asset.push({symbol, balance, precision})
                }
                this.state.keys.wif_to_balances = wif_to_balances
                this.setState({
                    keys,
                    wif_to_balances,
                    balance_by_asset,
                    balances_known: true,
                    account_keycount:
                        this.getImportAccountKeyCount(keys.wifs_to_account)
                })
            })
        })
    }
    
    render() {
        var has_keys = this.state.keys.wif_count ? true : false
        var import_ready = has_keys &&
            this.state.balances_known
        
        var balance_rows = null
        if(this.state.balance_by_asset) {
            balance_rows = []
            for(let asset_balance of this.state.balance_by_asset) {
                var {symbol, balance, precision} =asset_balance
                balance_rows.push(
                    <div>
                        <FormattedAsset color="info" amount={balance} asset={{symbol, precision}}/>
                    </div>
                )
            }
        }
        
        var account_rows = null
        if(this.state.account_keycount) {
            account_rows = []
            var account_keycount = this.state.account_keycount
            for(let account_name in account_keycount) {
                account_rows.push(<tr>
                    <td>{account_name}</td>
                    <td>{account_keycount[account_name]}</td>
                </tr>)
            }
        }
        
        return (
            <div id="existing-account" className="grid-block vertical">
                <div className="grid-container">
                    <div className="content-block center-content">
                        <Wallet>
                            {has_keys && !this.state.import_active ?
                                (<div>
                                    <BalanceClaim ref="balance_claim"
                                        claimActive={this.state.balance_claim_active}
                                        onActive={this._setClaimActive.bind(this)}
                                    />
                                </div>) : null
                            }
                            
                            { this.state.balance_claim_active ? null :
                            <div>
                                {this.state.import_active ? (
                                    <ImportKeys
                                    key={this.state.import_keys_ref}
                                    onChange={this._importKeysChange.bind(this)}
                                />) : null}
                                
                                {this.state.keys.wif_count ? <div>
                                    {account_rows ? <div>
                                        <div>
                                            {account_rows.length ? <div>
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{textAlign: "center"}}>Account</th>
                                                            <th style={{textAlign: "center"}}># of keys</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {account_rows}
                                                    </tbody>
                                                </table>
                                            </div> : "No Accounts"}
                                        </div>
                                    </div> : null}
                                    
                                    <br/>
                                    <h3>Unclaimed balances belonging to these keys:</h3>
                                    {balance_rows ? <div>
                                        <div>
                                            <label>Assets</label>
                                            {balance_rows.length ? balance_rows : "No Balances"}
                                        </div>
                                    </div> : null}
                                    <br/>
                                    {balance_rows.length ? 
                                        (<div className="button-group">
                                            <div className={cname("button success", {disabled:!import_ready})} onClick={this._saveImport.bind(this)} >
                                                Import
                                            </div>
                                            &nbsp; &nbsp;
                                            <div className="button secondary" onClick={this.reset.bind(this)}>
                                                Cancel
                                            </div>
                                        </div>): null}
                                </div> : null}
                            </div>}
                        </Wallet>
                    </div>
                </div>
            </div>
        );
    }
    
    getImportAccountKeyCount(wifs_to_account) {
        var account_keycount = {}
        for(let wif in wifs_to_account)
        for(let account_name of wifs_to_account[wif]) {
            account_keycount[account_name] =
                (account_keycount[account_name] || 0) + 1
        }
        return account_keycount
    }
    
    _setClaimActive(active) {
        this.setState({balance_claim_active: active})
        if(! active)
            this.refs.balance_claim.reset()
    }
    
    _saveImport() {
        if( WalletDb.isLocked()) {
            notify.error("Wallet is locked")
            return
        }
        for(let account_name in this.state.account_keycount) {
            AccountStore.onCreateAccount(account_name)
        }
        
        var wifs_to_account = this.state.keys.wifs_to_account
        var wif_to_balances = this.state.wif_to_balances
        var private_key_objs = []
        for(let wif of Object.keys(wifs_to_account)) {
            var import_account_names = wifs_to_account[wif]
            var import_balances = wif_to_balances[wif]
            private_key_objs.push({
                wif,
                import_account_names,
                import_balances
            })
        }
        WalletDb.importKeys( private_key_objs ).then( result => {
            var {import_count, duplicate_count, private_key_ids} = result
            try {
                if( ! import_count && ! duplicate_count) {
                    notify.warning(`There where no keys to import`)
                    return
                }
                if( ! import_count && duplicate_count) {
                    notify.warning(`${duplicate_count} duplicates (Not Imported)`)
                    return
                }
                var message = ""
                if (import_count)
                    message = `Successfully imported ${import_count} keys.`
                if (duplicate_count)
                    message += `  ${duplicate_count} duplicates (Not Imported)`
                
                if(duplicate_count)
                    notify.warning(message)
                else
                    notify.success(message)
                
                //if (import_count)
                //    this.refs.balance_claim.updateBalances()
            
            } finally {
                // this.reset()
                this.setState({import_active: false, balance_claim_active: true});
            }
            
        }).catch( error => {
            console.log(error)
            notify.error(`There was an error: ${error}`)
        })
    }

//    lookupAccounts(wifs){ 
//        return new Promise((resolve, reject)=> {
//            var public_key_parms = []
//            for(let wif of wifs){
//                var private_key = PrivateKey.fromWif(wif)
//                var public_key = private_key.toPublicKey()
//                public_key_parms.push(public_key.toBtsPublic())
//            }
//            var db = api.db_api()
//            if(db == null) {
//                notify.error("No witness node connection.")
//                resolve(undefined)
//                return
//            }
//            var p = db.exec("get_key_references", [public_key_parms]).then( result => {
//                //DEBUG console.log('... get_key_references',result)
//                var blockchain_accounts = []
//                for(let i = 0; i < result.length; i++) {
//                    for(let account_id of result[i]) {
//                        blockchain_accounts.push(lookup.object(account_id))
//                    }
//                }
//                return lookup.resolve().then(()=> {
//                    //DEBUG console.log('... blockchain_accounts',blockchain_accounts)
//                    for(let i = 0; i < blockchain_accounts.length; i++) {
//                        blockchain_accounts[i] = blockchain_accounts[i].resolve
//                    }
//                    return blockchain_accounts
//                })
//            })
//            resolve(p)
//        })
//    }
    
    lookupBalances(wif_keys) {
        return new Promise((resolve, reject)=> {
            var address_params = [], wif_owner = {}
            for(let wif of wif_keys) {
                var private_key = PrivateKey.fromWif(wif)
                var public_key = private_key.toPublicKey()
                var address_str = public_key.toBtsAddy()
                address_params.push( address_str )
                wif_owner[address_str] = wif
            }
            //DEBUG  console.log('... get_balance_objects', address_params)
            var db = api.db_api()
            if(db == null) {
                notify.error("No witness node connection.")
                resolve(undefined)
                return
            }
            var p = db.exec("get_balance_objects", [address_params]).then( result => {
                //DEBUG  console.log('... get_balance_objects',result)
                var wif_to_balances = {}
                for(let i = 0; i < result.length; i++) {
                    var balance = result[i]
                    var wif = wif_owner[balance.owner]
                    var balances = wif_to_balances[wif] || []
                    balances.push(balance)
                    wif_to_balances[wif] = balances
                }
                //DEBUG console.log('... wif_to_balances',wif_to_balances)
                this.setState({wif_to_balances})
                return wif_to_balances

            })
            resolve(p)
        })
    }
    
    balanceByAsset(wif_to_balances) {
        var asset_balance = {}
        if( ! wif_to_balances)
            return asset_balance
        for(let wif of Object.keys(wif_to_balances))
        for(let b of wif_to_balances[wif]) {
            var total = asset_balance[b.balance.asset_id] || 0
            //    if(b.vesting_policy)
            //        continue //todo
            //    //var total_claimed = "0"
            //    //if( ! b.vesting_policy)
            //    //    total_claimed = b.balance
            //    ////'else' Zero total_claimed is understood to mean that your
            //    ////claiming the vesting balance on vesting terms.
            //DEBUG 
            total += v.to_number(b.balance.amount)
            asset_balance[b.balance.asset_id] = total 
        }
        return asset_balance
    }


}

export default ExistingAccount
