import BaseStore from "./BaseStore";
import Immutable from "immutable";
import alt from "../alt-instance";
import AccountActions from "../actions/AccountActions";
import {
    Account
}
from "./tcomb_structs";
import iDB from "../idb-instance";
import PrivateKeyStore from "./PrivateKeyStore";

class AccountStore extends BaseStore {
    constructor() {
        super();
        this.currentAccount = null;
        this.cachedAccounts = Immutable.Map();
        this.linkedAccounts = Immutable.Set();
        this.myAccounts = Immutable.Set();
        this.payeeAccounts = Immutable.Set();
        this.searchAccounts = Immutable.Map();
        this.balances = Immutable.Map();
        this.accountHistories = Immutable.Map();
        this.account_name_to_id = {};
        this.account_id_to_name = {};
        this.bindListeners({
            onGetAllAccounts: AccountActions.getAllAccounts,
            onGetAccount: AccountActions.getAccount,
            onSetCurrentAccount: AccountActions.setCurrentAccount,
            onTransfer: AccountActions.transfer,
            onCreateAccount: AccountActions.createAccount,
            onUpgradeAccount: AccountActions.upgradeAccount,
            onGetAccounts: AccountActions.getAccounts,
            onLinkAccount: AccountActions.linkAccount,
            onUnlinkAccount: AccountActions.unlinkAccount,
            onAccountSearch: AccountActions.accountSearch
        });
        this._export("loadDbData", "tryToSetCurrentAccount", "onCreateAccount");
    }

    loadDbData() {
        return iDB.load_data("linked_accounts").then(data => {
            this.linkedAccounts = this.linkedAccounts.withMutations(set => {
                for (let a of data) {
                    set.add(a.name);
                }
            });
        });
    }

    onGetAccounts(accounts) {
        accounts.forEach(account => {
            this.account_id_to_name[account[1]] = account[0];
            this.account_name_to_id[account[0]] = account[1];
        });
    }

    onAccountSearch(accounts) {
        this.searchAccounts = this.searchAccounts.clear();
        accounts.forEach(account => {
            this.searchAccounts = this.searchAccounts.set(
                account[1],
                account[0]
            );
        });
    }

    onGetAllAccounts(accounts) {
        accounts.forEach(account => {
            this.account_id_to_name[account[1]] = account[0];
            this.account_name_to_id[account[0]] = account[1];
        });
    }

    onGetAccount(payload) {

        function parseBalances(balances) {
            let parsed = [];
            if (balances.length > 0) {
                balances.forEach(balance => {
                    parsed.push({
                        amount: parseInt(balance.balance, 10),
                        asset_id: balance.asset_type
                    });
                });
            } else {
                parsed = [{
                    amount: 0,
                    asset_id: "1.3.0"
                }];
            }
            return parsed;
        }

        let {
            account, vesting_balances, statistics, call_orders, limit_orders, referrer_name, registrar_name, lifetime_referrer_name
        } = payload.fullAccount;

        if (account.id) {
            account.vesting_balances = vesting_balances;
            account.stat_object = statistics;
            account.call_orders = call_orders;
            account.limit_orders = limit_orders;
            account.referrer_name = referrer_name;
            account.registrar_name = registrar_name;
            account.lifetime_referrer_name = lifetime_referrer_name;

            let my_account = false;
            for (let k of account.owner.key_auths) {
                if (PrivateKeyStore.hasKey(k[0])) {
                    my_account = true;
                    break;
                }
            }
            for (let k of account.active.key_auths) {
                if (PrivateKeyStore.hasKey(k[0])) {
                    my_account = true;
                    break;
                }
            }

            account.my_account = my_account;

            let AccountStruct = Account(payload.fullAccount.account);

            let balances = parseBalances(payload.fullAccount.balances);

            this.balances = this.balances.set(
                account.name,
                balances
            );

            this.account_name_to_id[account.name] = account.id;

            this.cachedAccounts = this.cachedAccounts.set(
                account.id,
                AccountStruct
            );

            this.accountHistories = this.accountHistories.set(
                account.id,
                payload.history
            );

            if (my_account) {
                this.myAccounts = this.myAccounts.add(AccountStruct.name);
            }
        }
    }

    tryToSetCurrentAccount() {
        if (this.linkedAccounts.size > 0) {
            this.setCurrentAccount(this.linkedAccounts.first());
        } else {
            let nathan_account = this.cachedAccounts.first();
            if (nathan_account && nathan_account.name === "nathan" &&
                nathan_account.owner.key_auths[0][0] === "GPH6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"
            ) {
                this.setCurrentAccount("nathan");
            }
        }
    }

    setCurrentAccount(name) {
        if (!name) {
            this.currentAccount = null;
        } else {
            this.currentAccount = {
                name: name,
                id: this.account_name_to_id[name]
            };
        }
    }

    onSetCurrentAccount(name) {
        this.setCurrentAccount(name);
    }

    onTransfer(result) {
        console.log("[AccountStore.js] ----- onTransfer ----->", result);
    }

    onCreateAccount(name_or_account) {
        var account = name_or_account;
        if (typeof account === "string") {
            account = {
                name: account
            };
        }

        iDB.add_to_store("linked_accounts", account).then(() => {
            console.log("[AccountStore.js] ----- Added account to store: ----->", name);
            this.linkedAccounts = this.linkedAccounts.add(account.name);
            if (this.linkedAccounts.size === 1) {
                this.setCurrentAccount(account.name);
            }
        });
    }

    onUpgradeAccount(account_id) {
        console.log("[AccountStore.js] ----- onUpgradeAccount ----->", account_id);
    }

    onLinkAccount(name) {
        iDB.add_to_store("linked_accounts", {
            name
        });
        this.linkedAccounts = this.linkedAccounts.add(name);
        if (this.linkedAccounts.size === 1) {
            this.setCurrentAccount(name);
        }
    }

    onUnlinkAccount(name) {
        iDB.remove_from_store("linked_accounts", name);
        this.linkedAccounts = this.linkedAccounts.remove(name);
        if (this.linkedAccounts.size === 0) {
            this.setCurrentAccount(null);
        }
    }

    onTransactUpdateAccount(account) {
        console.log("[AccountStore.js:154] ----- onTransactUpdateAccount ----->", account);
    }

}

module.exports = alt.createStore(AccountStore, "AccountStore");