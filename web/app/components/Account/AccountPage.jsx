import React from "react";
import { RouteHandler } from "react-router";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import AssetStore from "stores/AssetStore";
import SettingsStore from "stores/SettingsStore";
import AltContainer from "alt/AltContainer";
import AccountLeftPanel from "./AccountLeftPanel";

class AccountPage extends React.Component {

    componentWillMount() {
        AccountActions.getAccount(this.props.params.account_name, true);
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.params.account_name !== this.props.params.account_name) {
            AccountActions.getAccount(nextProps.params.account_name, true);
        }
    }

    render() {
        let account_name = this.props.params.account_name;
        return (
            <div className="grid-block page-layout">
                <div className="grid-block medium-2 left-column no-padding">
                    <AltContainer
                        stores={[AccountStore]}
                        inject={{
                            account_name: () => {
                                return account_name;
                            },
                            account_name_to_id: () => {
                                return AccountStore.getState().account_name_to_id;
                            },
                            linkedAccounts: () => {
                                return AccountStore.getState().linkedAccounts;
                            },
                            myAccounts: () => {
                                return AccountStore.getState().myAccounts;
                            },
                            cachedAccounts: () => {
                                return AccountStore.getState().cachedAccounts;
                            }
                        }}>
                    <AccountLeftPanel/>
                    </AltContainer>
                </div>
                <div className="grid-block medium-10 main-content">
                    <AltContainer
                        stores={[AccountStore, AssetStore, SettingsStore]}
                        inject={{
                            account_name: () => {
                                return account_name;
                            },
                            cachedAccounts: () => {
                                return AccountStore.getState().cachedAccounts;
                            },
                            linkedAccounts: () => {
                                return AccountStore.getState().linkedAccounts;
                            },
                            accountBalances: () => {
                                return AccountStore.getState().balances;
                            },
                            accountHistories: () => {
                                return AccountStore.getState().accountHistories;
                            },
                            account_name_to_id: () => {
                                return AccountStore.getState().account_name_to_id;
                            },
                            account_id_to_name: () => {
                                return AccountStore.getState().account_id_to_name;
                            },
                            assets: () => {
                                return AssetStore.getState().assets;
                            },
                            settings: () => {
                                return SettingsStore.getState().settings;
                            }
                          }}
                        >
                        <RouteHandler account_name={account_name} />
                    </AltContainer>
                </div>
            </div>
        );
    }
}

AccountPage.contextTypes = {router: React.PropTypes.func.isRequired};

export default AccountPage;
