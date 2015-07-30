import BaseStore from "./BaseStore";
import alt from "../alt-instance";
import ChainActions from "../actions/ChainActions.js";

class ChainStore extends BaseStore
{
   constructor() {
      super();
      this.accounts_by_id   = new Map();
      this.accounts_by_name = new Map();
      this.assets_by_id     = new Map();
      this.assets_by_name   = new Map();


      this.bindListeners({
         onGetAccount: ChainActions.getAccount,
         onSetBalance: ChainActions.setBalance
      });
      this._export("getAccountByName","getAccountByID");
   }

   onSetBalance( balance_object )
   {
      console.log( "on set balance", balance_object );
      this.getAccountByID( balance_object.owner ).balances[ balance_object.asset_type ] = balance_object;
   }

   onGetAccount( full_account )
   {
     let {
         account, vesting_balances, statistics, call_orders, limit_orders, referrer_name, registrar_name, lifetime_referrer_name
     } = full_account

     account.balances = new Map;
     if( account.id )
     {
        console.log( "caching account", account );
        this.accounts_by_id.set( account.id, account );
        this.accounts_by_name.set( account.name, account );
     }
     else
     {
        console.log( "no account.id", account );
     }
     console.log( "store", this );
     console.log( "store json", JSON.stringify( this, null, 2 ) );
     console.log( this.getAccountByID( account.id ) );
     console.log( this.getAccountByName( account.name ) );
   }

   getAccountByName( name )
   {
      if( this.accounts_by_name.has(name) )
         return this.accounts_by_name.get(name);
      var new_account = { name : name };

      let subscription = (account, name, dispatch, result) => {
           console.log("sub result:", JSON.stringify(result, null, 2), new_account, JSON.stringify(account));

      };
      ChainActions.getAccount(name);
      return new_account;
   }

   getAccountByID( id )
   {
      if( this.accounts_by_id.has(id) )
      {
         console.log( "by id: ", id );
         return this.accounts_by_id.get(id);
      }
      var new_account = { id : id, balances : new Map };
      ChainActions.getAccount(id);
      return new_account;
   }
}

module.exports = alt.createStore(ChainStore, "ChainStore");
