import React from "react";
import Router from "react-router";

const { Route, RouteHandler, DefaultRoute } = Router;

import IntlStore from "stores/IntlStore"; // This needs to be initalized here even though IntlStore is never used
import Apis from "rpc_api/ApiInstances";
import DashboardContainer from "./components/Dashboard/DashboardContainer";
import Discover from "./components/Discover/DiscoverContainer";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import AccountContainer from "./components/Account/AccountContainer";
import Wallet from "./components/Wallet/Wallet";
import Accounts from "./components/Wallet/Accounts";
import Receive from "./components/Wallet/Receive";
import Assets from "./components/Wallet/Assets";
import History from "./components/Wallet/History";
import Exchange from "components/Exchange/ExchangeContainer";
import Markets from "components/Exchange/MarketsContainer";
import TransferPage from "./components/Transfer/TransferPage";
import Settings from "./components/Settings/Settings";
import Logout from "./components/Logout";
import Login from "./components/Login";
import BlockContainer from "./components/Blockchain/BlockContainer";
import Asset from "./components/Blockchain/AssetContainer";
import Transaction from "./components/Blockchain/Transaction";
import CreateAccount from "./components/CreateAccount";
import BaseComponent from "./components/BaseComponent";
import SessionStore from "stores/SessionStore";
import AccountActions from "actions/AccountActions";
import AssetActions from "actions/AssetActions";
import BlockchainActions from "actions/BlockchainActions";
import IntlActions from "actions/IntlActions";
import MobileMenu from "./components/Header/MobileMenu";
import LoadingIndicator from "./components/LoadingIndicator/LoadingIndicator";
import Notifier from "./components/Notifier/NotifierContainer";
import cookies from "cookies-js";
import iDB from "idb-instance"
import PrivateKeyActions from "actions/PrivateKeyActions";

require("./assets/loader");

class App extends BaseComponent {
    constructor(props) {
        super(props, SessionStore);
        this.state.loading = true;
    }

    componentDidMount() {
        let locale;
        if (cookies) {
            locale = cookies.get("graphene_locale");
            console.log("cookie locale:", locale);
        }

        Apis.instance().init_promise.then(() => {
            let idb_instance = iDB.init_instance(indexedDB);
            idb_instance.init_promise.then( db => {
                console.log("[App.jsx:59] ----- idb ----->", db);
                PrivateKeyActions.addKey("test-key-3");
            });
            AccountActions.getAllAccounts().then(current_account_id => {
                return current_account_id;
            }).then(current_account_id => {
                let localePromise = (locale) ? IntlActions.switchLocale(locale) : null;
                return Promise.all([
                    AccountActions.getAccount(current_account_id),
                    AssetActions.getAssetList("A", 100),
                    BlockchainActions.subscribeGlobals(),
                    localePromise
                ]);
            }).then(() => {
                this.setState({loading: false});
            });
        }).catch(error => {
            console.log("[App.jsx] ----- ERROR ----->", error, error.stack);
            this.setState({loading: false});
        });
    }

    componentWillUpdate(nextProps, nextState) {
        // Fire any actions that are needed on a successful unlock here
        //if (nextState.isUnlocked === true && this.state.isUnlocked === false) {
            // console.log("just unlocked, firing actions");
        //}
    }

    render() {
        if (this.state.loading) {
            return <LoadingIndicator />;
        } else {
            return (
                <div className="grid-frame vertical">
                    <Header isUnlocked={this.state.isUnlocked}/>
                    <MobileMenu isUnlocked={this.state.isUnlocked} id="mobile-menu"/>
                    <Notifier class="overlay-notification"/>
                    <RouteHandler/>
                    <Footer/>
                </div>
            );
        }
    }
}

let routes = (
    <Route handler={App}>
        <Route name="dashboard" path="/dashboard" handler={DashboardContainer}/>
        <Route name="discover" path="/discover" handler={Discover}/>
        <Route name="transfer" path="transfer" handler={TransferPage}/>
        <Route name="wallet" path="wallet" handler={Wallet}>
            <Route name="accounts" path="accounts" handler={Accounts}/>
            <Route name="receive" path="receive" handler={Receive}/>
            <Route name="assets" path="assets" handler={Assets}/>
            <Route name="history" path="history" handler={History}/>
            <DefaultRoute handler={Accounts}/>
        </Route>
        <Route name="markets" path="markets" handler={Markets}/>
        <Route name="exchange" path="exchange/:marketID" handler={Exchange}/>
        <Route name="settings" path="settings" handler={Settings}/>
        <Route name="logout" path="logout" handler={Logout}/>
        <Route name="login" path="login" handler={Login}/>
        <Route name="account" path="account/:name" handler={AccountContainer}/>
        <Route name="block" path="block/:height" handler={BlockContainer}/>
        <Route name="asset" path="asset/:symbol" handler={Asset}/>
        <Route name="tx" path="tx" handler={Transaction}/>
        <Route name="create-account" path="create-account" handler={CreateAccount}/>
        <DefaultRoute handler={DashboardContainer}/>
    </Route>
);


Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.getElementById("content"));
});
