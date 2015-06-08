
var Aes = require('../ecc/aes')
var PrivateKey = require('../ecc/key_private')
var PublicKey = require('../ecc/key_public')
var ChainTypes = require('../chain/chain_types')
var chain_config = require('../chain/config')
var Long = require('../common/bytebuffer').Long

var helper = require('../chain/transaction_helper'),
    get_owner_private = helper.get_owner_private,
    get_active_private = helper.get_active_private

var tr_op = require('../chain/transaction_operations')

var so_type = require('../chain/serializer_operation_types'),
    signed_transaction_type = so_type.signed_transaction,
    transfer_type = so_type.transfer

var is_empty_user_input = require('../common/validation').
    is_empty_user_input
    
var api = require('./ApiInstances').instance()

class ApplicationApi {
    
    create_account_with_brain_key(
        brain_key,
        new_account_name,
        registrar_id,
        referrer_id = 0,
        referrer_percent = 100,
        expire_minutes = 10,
        signer_private_key_id,
        signer_private_key,
        broadcast = false
    ) {
        var owner_privkey = get_owner_private(brain_key)
        var active_privkey = get_active_private(owner_privkey)
        
        var owner_pubkey = owner_privkey.toPublicKey()
        var active_pubkey = active_privkey.toPublicKey()
        
        var tr = new tr_op.signed_transaction()
        tr.set_expire_minutes(expire_minutes)
        {
            var cop = new tr_op.account_create(
                tr_op.key_create.fromPublicKey(owner_pubkey),
                tr_op.key_create.fromPublicKey(active_pubkey)
            )
            cop.name = new_account_name
            cop.registrar = registrar_id
            cop.referrer = referrer_id
            cop.referrer_percent = referrer_percent
            tr.add_operation(cop)
        }
        return tr.finalize(
            signer_private_key_id,
            signer_private_key,
            broadcast
        )
    }
    
    transfer(
        from_account_id,
        to_account_id,
        amount, 
        asset_id, 
        memo_message,
        expire_minutes,
        signer_private_key_id,
        signer_private_key,
        broadcast = false
    ) {
        var memo = {}
        if( ! is_empty_user_input(memo_message)) {
            memo.from = from_account_id
            memo.from_privkey = signer_private_key
            memo.to = to_account_id
        }
        return this.transfer_extended(
            from_account_id,
            to_account_id,
            amount, 
            asset_id,
            memo_message,
            memo.from,
            memo.from_privkey,
            memo.to,
            expire_minutes,
            signer_private_key_id,
            signer_private_key,
            broadcast
        )
    }
    
    /**
        Plain-text memo is used unless memo_from_privkey is provided.
    */
    transfer_extended(
        from_account_id,
        to_account_id,
        amount, 
        asset, 
        memo_message,
        memo_from,
        memo_from_privkey,
        memo_to,
        expire_minutes,
        signer_private_key_id,
        signer_private_key,
        broadcast = false
    ) {
        var tr = new tr_op.signed_transaction()
        tr.set_expire_minutes(expire_minutes)
        {
            var top = new tr_op.transfer( memo_from_privkey )
            top.from = from_account_id
            top.to = to_account_id
            top.amount.amount = amount
            top.amount.asset_id = asset
            top.memo.from = memo_from
            top.memo.to = memo_to
            top.memo.message = memo_message
            tr.add_operation(top)
        }
        return tr.finalize(
            signer_private_key_id,
            signer_private_key,
            broadcast
        )
    }

    //account_name_for_id(account_ids) {
    //    if( ! Array.isArray(account_ids))
    //        account_ids = [account_ids]
    //    
    //    promise = api.database_api().exec("get_accounts", [account_ids]).then(response => {
    //        console.log("----- get_accounts response ----->\n", response)
    //        return response
    //    })
    //    
    //    return promise
    //}
    //return this.api.exec("lookup_account_names", [accounts]).then(response => {
    //        return response
    //    })
    
}
module.exports = ApplicationApi
