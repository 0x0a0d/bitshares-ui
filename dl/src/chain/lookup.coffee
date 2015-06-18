Promise = require '../common/Promise'
PublicKey = require '../ecc/key_public'

v = require '../chain/serializer_validation'
chain_config = require '../chain/config'
chain_types = require '../chain/chain_types'
api = require('../rpc_api/ApiInstances').instance()

### Makes account, key, assset instance ID lookups very easy. All functions
    return an object with an attribute 'resolved' ( ex: {resolve: 1} ).  The
    resolve value may not be available until after the resolve() promise
    is finished (ex: resolve().then(...) ).
###
class Lookup
    
    constructor:->
        @_private = new Private()
    
    ###*
    Resolve an account id from an account name.  An account id resolves unchanged. 
    ###
    account_id:(name_or_id)->
        return resolve: name_or_id if v.is_empty name_or_id
        # account instance or account id
        i = @_private.try_simple_resolve "account", name_or_id
        return i unless i is undefined
        account_name = name_or_id
        @_private.deferred_property "accountname", "id", account_name
    
    ###*
    Resolve an asset id from an asset name.  An asset id resolves unchanged. 
    ###
    asset_id:(name_or_id)->
        return resolve: name_or_id if v.is_empty name_or_id
        i = @_private.try_simple_resolve "asset", name_or_id
        return i unless i is undefined
        asset_name = name_or_id
        return resolve: 0 if (
            asset_name is "CORE" or
            asset_name is chain_config.address_suffix
        )
        @_private.deferred_property "assetname", "id", asset_name
    
    ###* 
    Resolve a memo key id from an account name or account id.  A key id
    resolves unchanged.
    ###
    memo_key_id:(name_or_id)->
        return resolve: name_or_id if v.is_empty name_or_id
        # key instance or key id
        i = @_private.try_simple_resolve "key", name_or_id
        return i unless i is undefined
        
        if name_or_id.indexOf("1.3.") is 0
            account_id = name_or_id
            return @_private.deferred_property "object", "memo_key", account_id
        
        account_name = name_or_id
        return @_private.deferred_property "accountname", "memo_key", account_name
    
    ###* 
    Resolves a memo public key from an account name or account id.  A key id or 
    public key resolves as expected.
    ###
    memo_public_key:(name_key_or_id)->
        
        return resolve: name_key_or_id if v.is_empty name_key_or_id
        return resolve: name_key_or_id if name_key_or_id.Q # typeof is PublicKey
        if name_key_or_id.indexOf(chain_config.address_prefix) is 0
            return resolve: PublicKey.fromBtsPublic name_key_or_id
        
        _private = @_private
        
        # key instance or key id
        key_id = _private.try_simple_resolve "key", name_key_or_id
        if key_id isnt undefined
            return _private.public_key key_id.resolve
        
        index_name = if name_key_or_id.indexOf("1.3.") is 0
            "object"
        else
            "accountname"
        
        promise_memo_key = new Promise (resolve)->
            _private.deferred_lookup index_name, name_key_or_id, (account)->
                resolve(account.options.memo_key)
        
        ret = resolve: undefined
        ((ret)->
            promise_memo_key.then (memo_key)->
                _private.public_key memo_key, ret
                return
            , (e)-> throw e
        )(ret)
        ret
    
    resolve:->
        @_private.resolve()

module.exports = Lookup

class Private
    
    ###
    WARNING: Lookup map is erased (re-pointed to an empty map) before callback 
    function are called.  This allows the resolve to find additional 
    dependencies (they will appear in the new lookup_map).
    ###
    constructor: ->
        @lookup_map = {}
    
    try_simple_resolve:(type, name_or_id)->
        # v.is_digits is true when name_or_id is what we needed
        return resolve: name_or_id if v.is_empty(name_or_id) or v.is_digits(name_or_id)
        type_id = chain_types.object_type[type]
        if name_or_id.indexOf("1.#{type_id}.") is 0
            return resolve: name_or_id
        return undefined
    
    get_group_by:(key, map = @lookup_map)->
        # use non-numeric index into 'map' (ensures key order)
        if (value = map[""+key]) isnt undefined
            return value
        map[key] = {}
    
    get_list:(key)->
        if (value = @lookup_map[key]) isnt undefined
            return value
        @lookup_map[key] = []
    
    deferred_property: (index_name, result_property_name, lookup_value)->
        ret = resolve: undefined
        ((ret, result_property_name)=>
            @deferred_lookup index_name, lookup_value, (result)->
                ret.resolve = result[result_property_name]
        )(ret, result_property_name)
        ret
    
    public_key: (key_id, ret = resolve: undefined)->
        @deferred_lookup "object", key_id, (key)->
            unless key.key_data[0] is 1
                throw new Error "missing public_key type 1: #{key.key_data}"
            ret.resolve = PublicKey.fromBtsPublic key.key_data[1]
            return
        ret
    
    deferred_lookup:(index_name, lookup_value, lookup_callback)->
        if lookup_value.resolve
            throw new Error "Invalid lookup value #{lookup_value}"
        index_group = @get_group_by index_name
        value_group = @get_group_by lookup_value, index_group
        #console.log('... index_name + lookup_value\t',index_name + "\t" + lookup_value)
        defers = @get_list(index_name + "\t" + lookup_value)
        defers.push lookup_callback
        #console.log '... defers', defers
        return
    
    resolve:()->
        db = api.db_api()
        lookup_map = null
        promises = null
        query=(index_name, api_call, unique_key)->
            paramMap = lookup_map[index_name]
            if paramMap
                params = Object.keys paramMap
                #console.log('... api_call',api_call)
                #console.log '... params', JSON.stringify params
                promise_call = db.exec( api_call, [params] )
                ((params,index_name,unique_key)->
                    promises.push promise_call.then (results)->
                        for i in [0...results.length] by 1
                            result = results[i]
                            for lookup_callback in lookup_map[ index_name + "\t" + params[i] ]
                                lookup_callback(result)
                        return
                    , (e)->
                        console.error(
                            "lookup_callback error"
                            JSON.stringify(api_call)
                            JSON.stringify(params)
                            index_name
                            unique_key
                        )
                        throw e
                )(params,index_name,unique_key)
            return
        
        _resolve= =>
            promises = []
            lookup_map = @lookup_map
            @lookup_map = {} # clean slate, captures dependencies
            query "accountname", "lookup_account_names", "name"
            query "assetname", "lookup_asset_symbols", "symbol"
            query "object", "get_objects", "id"
            Promise.all(promises).then ()=>
                #console.log('... Object.keys(@lookup_map).length',Object.keys(@lookup_map).length)
                if Object.keys(@lookup_map).length isnt 0
                    _resolve()
                else
                    @lookup_map = {}
                    Promise.resolve()
        _resolve()
