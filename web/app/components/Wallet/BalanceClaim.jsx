import React, {Component, PropTypes} from "react";
import AltContainer from "alt/AltContainer"
import connectToStores from "alt/utils/connectToStores"

import alt from "alt-instance"
import WalletDb from "stores/WalletDb";
import PrivateKeyStore from "stores/PrivateKeyStore";
import BalanceClaimStore from "stores/BalanceClaimStore";
import ImportKeysStore from "stores/ImportKeysStore"
import BalanceClaimActions from "actions/BalanceClaimActions"
import FormattedAsset from "components/Utility/FormattedAsset";
import LoadingIndicator from "components/LoadingIndicator";
import ExistingAccountsAccountSelect from "components/Forms/ExistingAccountsAccountSelect";
import WalletActions from "actions/WalletActions";
import WalletUnlockActions from "actions/WalletUnlockActions";
import notify from "actions/NotificationActions";
import cname from "classnames";
import lookup from "chain/lookup";
import v from "chain/serializer_validation";


var TRACE = true

class BalanceClaim extends Component {

    constructor() {
        super();
        this.state = this._getInitialState();
    }
    
    _getInitialState() {
        return {
            claim_account_name: null,
            selected_balance_claims: null,
            checked: new Map()
        };
    }
    
    static getStores() {
        return [BalanceClaimStore]
    }
    
    static getPropsFromStores() {
        //DEBUG console.log('... BalanceClaimStore.getState()',BalanceClaimStore.getState())
        return BalanceClaimStore.getState()
    }
    
    componentWillMount() {
        //DEBUG console.log('... BalanceClaim componentWillMount')
        BalanceClaimActions.refreshBalanceClaims()
        BalanceClaimActions.loadMyAccounts()
    }
    
    componentWillReceiveProps() {
        console.log('... BalanceClaim componentWillReceiveProps')
        if(this.props.balance_claim_error) {
            console.log("BalanceClaim", balance_claim_error)
            notify.error(balance_claim_error)
        }
    }
    
    //loadAccounts() {
    //    console.log('... this.props.balance_by_account_asset',this.props.balance_by_account_asset)
    //    if(this.props.balance_by_account_asset.length)
    //        WalletUnlockActions.unlock().then(()=> {
    //            BalanceClaimActions.loadMyAccounts()
    //        })
    //}
    
    render() {
        //DEBUG
        console.log('... render balance_by_account_asset',this.props.balance_by_account_asset.length)
        if( ! this.props.balance_by_account_asset.length)
            return <div/>
        
        this.state.selected_balance_claims = []
        var unclaimed_balance_rows = []
        //, claimed_balance_rows = []
        let index = 0;
        var has_unclaimed = false
        var unclaimed_account_balances = {};
        var checked = this.state.checked
        for(let asset_balance of this.props.balance_by_account_asset) {
            var {accounts, asset_id, balance, balance_claims} =
                asset_balance
            
            if(balance.unvested.unclaimed || balance.vesting.unclaimed) {
                has_unclaimed = true
                var account_names = accounts.join(", ")
                unclaimed_balance_rows.push(
                    <tr key={index}>
                        <td>
                            <input type="checkbox"
                                checked={checked.get(index)}
                                onChange={this._checked.bind(this, index)}
                                />
                        </td>
                        <td style={{textAlign: "right"}}>
                            <FormattedAsset color="info"
                                _element_separator="</td><td>"
                                amount={balance.unvested.unclaimed}
                                asset={asset_id}/></td>
                        <td style={{textAlign: "right"}}>
                            <FormattedAsset
                                _element_separator="</td><td>"
                                amount={balance.vesting.unclaimed}
                                asset={asset_id}/></td>
                        <td> {account_names} </td>
                    </tr>
                );
                unclaimed_account_balances[account_names] = balance_claims
                if(checked.get(index)) {
                    for(let balance_claim of balance_claims) {
                        this.state.selected_balance_claims.push(balance_claim)
                    }
                }
                index++;
            }
            
            // Claimed balances are hidden from the witness API (removed from RAM).
            // Hide them here too so it will mimic the behaviour.
            //
            //if(balance.unvested.claimed || balance.vesting.claimed) {
            //    claimed_balance_rows.push(
            //        <tr key={index}>
            //            <td> <FormattedAsset amount={balance.unvested.claimed} asset={asset_id}/></td>
            //            <td> <FormattedAsset amount={balance.vesting.claimed} asset={asset_id}/></td>
            //            <td> {accounts.join(", ")} </td>
            //        </tr>
            //    );
            //    index++;
            //}
        }
        
        if( has_unclaimed && WalletDb.isLocked()){
            setTimeout(()=>WalletUnlockActions.unlock().then(), 250)
        }
        var claim_account_name = this.state.claim_account_name
        var has_account = claim_account_name ? true : false
        var has_checked = checked.size > 0
        var import_ready = has_account && has_checked
        var claim_balance_label = import_ready ?
                `Claim Balance to account: ${claim_account_name}` :
                "Claim Balance"

        return (
            <div>
                <hr/>
                <div className="content-block center-content">
                    <h3 className="no-border-bottom">Claim balances</h3>
                </div>
                <div>
                    {unclaimed_balance_rows.length ? <div>
                    <div className="center-content">
                        <div className="center-content">
                            <ExistingAccountsAccountSelect
                                account_names={this.props.my_accounts}
                                onChange={this._claimAccountSelect.bind(this)}
                                list_size={5}
                            />
                        </div>
                        {this.props.my_accounts_loading || this.props.balances_loading ? 
                            <LoadingIndicator type="circle"/> : <div/>}
                        <br></br>
                        <div className="button-group">
                            <div className={ cname("button success", {disabled: !import_ready}) }
                                onClick={this._claimBalances.bind(this, claim_account_name)}
                            >
                                {claim_balance_label}
                            </div>
                        </div>
                    </div>
                    </div> : "No Unclaimed Balances"}
                    
                    <br/>
                    
                    <div id="unclaimed_balance_rows">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>{ /* Checkbox */ }</th>
                                <th style={{textAlign: "center"}} colSpan="1">Unclaimed</th>
                                <th style={{textAlign: "center"}} colSpan="1">Unclaimed (vesting)</th>
                                <th style={{textAlign: "center"}}>Account</th>
                            </tr></thead><tbody>
                            {unclaimed_balance_rows}
                        </tbody></table>
                    </div>
                    
                    
                </div>
                    
            </div>
        );
    }
    
    _claimAccountSelect(claim_account_name) {
        this.setState({claim_account_name})
        var checked = new Map()
        var index = -1
        for(let asset_balance of this.props.balance_by_account_asset) {
            index++
            var {accounts} = asset_balance
            if(accounts.length > 1)
                //Don't automate this case, let the user decide which account
                continue
            
            var account_name = accounts[0]
            if(account_name === claim_account_name)
                checked.set(index, true)
        }
        this.setState({checked})
    }
    
    _checked(index) {
        var checked = this.state.checked.get(index)
        if(checked)
            //delete reduces checked.size (0 for no selection) 
            this.state.checked.delete(index)
        else
            this.state.checked.set(index, true)
        
        if( ! this.state.claim_account_name) {
            var {accounts} = this.props.balance_by_account_asset[index]
            if(accounts.length == 1) {
                var claim_account_name = accounts[0]
                this.setState({claim_account_name})
            }
        }
        this.forceUpdate()
    }
    
    
    _claimBalances(claim_account_name) {
        
        var selected_balance_claims = this.state.selected_balance_claims
        var wif_to_balances = this.getWifToBalance(selected_balance_claims)
        
        //return
        WalletActions.importBalance(
            claim_account_name,
            wif_to_balances,
            true //broadcast
        ).then((result)=> {
            notify.success("Balance claimed to account: " + this.state.claim_account_name)
            if(result) {
                //DEBUG console.log("ExistingAccount._claimBalances", result, JSON.stringify(result));
            }
            this.context.router.transitionTo("account", {account_name: this.state.claim_account_name});
                
        }).catch((error)=> {
            console.log("_claimBalances", error)
            var message = error
            try { message = error.data.message } catch(e) {}
            notify.error("Error claiming balance: " + message)
            throw error
        })
    }
    
    getWifToBalance(balance_claims) {
        var privateid_to_balances = {}
        for(let balance_claim of balance_claims) {
            if(balance_claim.is_claimed) continue
            var chain_balance_record = balance_claim.chain_balance_record
            if(chain_balance_record.vesting) continue //TODO get_vested_balances
            var balences =
                privateid_to_balances[balance_claim.private_key_id] || []
            balences.push(chain_balance_record)
            privateid_to_balances[balance_claim.private_key_id] = balences
        }
        var wif_to_balances = {}
        var keys = PrivateKeyStore.getState().keys
        for(let private_key_id of Object.keys(privateid_to_balances)) {
            var balances = privateid_to_balances[private_key_id]
            var private_key_tcomb = keys.get(parseInt(private_key_id))
            var public_key_string = private_key_tcomb.pubkey
            var private_key = WalletDb.decryptTcomb_PrivateKey(private_key_tcomb)
            wif_to_balances[private_key.toWif()] = {balances, public_key_string}
        }
        return wif_to_balances
    }
}

BalanceClaim.contextTypes = {router: React.PropTypes.func.isRequired};

export default connectToStores(BalanceClaim)
