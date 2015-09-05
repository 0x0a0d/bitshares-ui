import React from "react";
import Router from "react-router";
import IntlStore from "stores/IntlStore"; // This needs to be initalized here even though IntlStore is never used
import Apis from "rpc_api/ApiInstances";
import DashboardContainer from "./components/Dashboard/DashboardContainer";
import Explorer from "./components/Explorer/Explorer";
import Blocks from "./components/Explorer/BlocksContainer";
import Assets from "./components/Explorer/AssetsContainer";
import Accounts2 from "./components/Explorer/Accounts2";
import AccountsContainer from "./components/Explorer/AccountsContainer";
import WitnessesContainer from "./components/Explorer/WitnessesContainer";
import Witnesses from "./components/Explorer/Witnesses";
import Witness from "./components/Explorer/Witness";
import DelegatesContainer from "./components/Explorer/DelegatesContainer";
import Delegates from "./components/Explorer/Delegates";
import Delegate from "./components/Explorer/Delegate";
import HeaderContainer from "./components/Header/HeaderContainer";
import Footer from "./components/Footer/Footer";
import AccountPage from "./components/Account/AccountPage";
import AccountOverview from "./components/Account/AccountOverview";
import AccountAssets from "./components/Account/AccountAssets";
import AccountMemberStats from "./components/Account/AccountMemberStats";
import AccountHistory from "./components/Account/AccountHistory";
import AccountPayees from "./components/Account/AccountPayees";
import AccountPermissions from "./components/Account/AccountPermissions";
import AccountVoting from "./components/Account/AccountVoting";
import AccountOrders from "./components/Account/AccountOrders";
import Exchange from "components/Exchange/ExchangeContainer";
import Markets from "components/Exchange/MarketsContainer";
import TransferPage from "./components/Transfer/TransferPage";
import Settings from "./components/Settings/SettingsContainer";
import BlockContainer from "./components/Blockchain/BlockContainer";
import Asset from "./components/Blockchain/AssetContainer";
import Transaction from "./components/Blockchain/Transaction";
import CreateAccount from "./components/Account/CreateAccount";
import AccountStore from "stores/AccountStore";
import AccountActions from "actions/AccountActions";
import AssetActions from "actions/AssetActions";
import BlockchainActions from "actions/BlockchainActions";
import IntlActions from "actions/IntlActions";
import MobileMenu from "./components/Header/MobileMenu";
import LoadingIndicator from "./components/LoadingIndicator";
import TransactionConfirm from "./components/Blockchain/TransactionConfirm";
import WalletUnlockModal from "components/Wallet/WalletUnlockModal"
import AccountNotifications from "./components/Notifier/NotifierContainer";
import NotificationSystem from "react-notification-system";
import NotificationStore from "stores/NotificationStore";
// import TransactionConfirmStore from "stores/TransactionConfirmStore";
import cookies from "cookies-js";
import iDB from "idb-instance";
import ExistingAccount from "./components/Wallet/ExistingAccount";
import Wallet from "./components/Wallet/Wallet";
import WalletCreate from "./components/Wallet/WalletCreate";
import ImportKeys from "./components/Wallet/ImportKeys";
import WalletDb from "stores/WalletDb";
import PrivateKeyStore from "stores/PrivateKeyStore";
import Console from "./components/Console/Console";
import ReactTooltip from "react-tooltip";
import Invoice from "./components/Transfer/Invoice";
import ChainStore from "api/chain"

require("./components/Utility/Prototypes"); // Adds a .equals method to Array for use in shouldComponentUpdate
require("./assets/stylesheets/app.scss");
require("dl_cli_index").init(window) // Adds some object refs to the global window object

const { Route, RouteHandler, DefaultRoute } = Router;

class App extends React.Component {

    constructor() {
        super();
        this.state = {loading: true};
    }

    componentWillUnmount() {
        NotificationStore.unlisten(this._onNotificationChange);
        // TransactionConfirmStore.unlisten(this._onTransactionConfirm);
    }

    componentDidMount() {
        NotificationStore.listen(this._onNotificationChange.bind(this));
        // TransactionConfirmStore.listen(this._onTransactionConfirm.bind(this));

        // Try to retrieve locale from cookies
        let locale;
        if (cookies) {
            locale = cookies.get("graphene_locale");
        }
        // Switch locale if the user has already set a different locale than en
        let localePromise = (locale) ? IntlActions.switchLocale(locale) : null;

        Promise.all([
            localePromise, // Non API
            ChainStore.init() // API
        ]).then(() => {
            // let's retrieve linked accounts - this is needed to populate myAccounts
            let promises = AccountStore.getState().linkedAccounts.map(a => {
                return AccountActions.getAccount(a);
            });
            return Promise.all(promises);
        }).then(() => {
            AccountStore.tryToSetCurrentAccount();
            this.setState({loading: false});
        }).catch(error => {
            console.log("[App.jsx] ----- ERROR ----->", error, error.stack);
            this.setState({loading: false});
        });
    }

    /** Usage: NotificationActions.[success,error,warning,info] */
    _onNotificationChange() {
        let notification = NotificationStore.getState().notification;
        if (notification.autoDismiss === void 0) {
            notification.autoDismiss = 10;
        }
        this.refs.notificationSystem.addNotification(notification);
    }


    // /** Non-static, used by passing notificationSystem via react Component refs */
    // _addNotification(params) {
    //     console.log("add notification:", this.refs, params);
    //     this.refs.notificationSystem.addNotification(params);
    // }

    render() {
        let content = (
            <div className="grid-frame vertical">
                <HeaderContainer isUnlocked={this.state.isUnlocked}/>
                <MobileMenu isUnlocked={this.state.isUnlocked} id="mobile-menu"/>
                <AccountNotifications/>

                <div className="grid-block vertical">
                    <RouteHandler />
                </div>
                <Footer/>
                <ReactTooltip type="dark" effect="solid"/>
            </div>
        );
        if (this.state.loading) {
            content = <LoadingIndicator />;
        }
        return (
            <div>
                {content}
                <NotificationSystem ref="notificationSystem" allowHTML={true}/>
                <TransactionConfirm/>
                <WalletUnlockModal/>
            </div>
        );

    }
}

class Auth extends React.Component {
    render() {return null; }
}

App.willTransitionTo = (transition, params, query, callback) => {
    if (transition.path.indexOf("/auth/") === 0) {
        console.log("auth: ", transition.path);
        // TODO: pass auth params to RPC API init subroutine
    }
    //API is used to read the chain_id .. The chain_id defines the database name
    Apis.instance().init_promise.then(() => {
        return iDB.init_instance(window.openDatabase ? (shimIndexedDB || indexedDB) : indexedDB).init_promise.then(() => {
            return Promise.all([
                PrivateKeyStore.loadDbData(),
                WalletDb.loadDbData().then(() => {
                    if (!WalletDb.getWallet() && transition.path !== "/create-account") {
                        transition.redirect("/create-account");
                    }
                    if (transition.path.indexOf("/auth/") === 0) {
                        transition.redirect("/dashboard");
                    }
                    
                }).catch((error) => {
                    console.error("[App.jsx:172] ----- WalletDb.willTransitionTo error ----->", error);
                })
            ]).then(()=> {
                callback();
            })
        });
    }).catch( error => {
        console.error("[App.jsx] ----- App.willTransitionTo error ----->", error);
    })
};

let routes = (
    <Route handler={App}>
        <DefaultRoute handler={DashboardContainer}/>
        <Route name="auth" path="/auth/:data" handler={Auth}/>
        <Route name="dashboard" path="/dashboard" handler={DashboardContainer}/>
        <Route name="explorer" path="/explorer" handler={Explorer}/>
        <Route name="blocks" path="/explorer/blocks" handler={Blocks}/>
        <Route name="assets" path="/explorer/assets" handler={Assets}/>
        <Route name="accounts2" path="/explorer/accounts2" handler={Accounts2}/>
        <Route name="accounts" path="/explorer/accounts" handler={AccountsContainer}/>
        <Route name="witnesses" path="/explorer/witnesses" handler={WitnessesContainer}>
            <DefaultRoute handler={Witnesses}/>
            <Route name="witness" path=":name" handler={Witness}/>
        </Route>
        <Route name="delegates" path="/explorer/delegates" handler={DelegatesContainer}>
            <DefaultRoute handler={Delegates}/>
            <Route name="delegate" path=":name" handler={Delegate}/>
        </Route>
        <Route name="wallet" path="wallet" handler={Wallet}/>
        <Route name="create-wallet" path="create-wallet" handler={WalletCreate}/>
        <Route name="console" path="console" handler={Console}/>
        <Route name="transfer" path="transfer" handler={TransferPage}/>
        <Route name="invoice" path="invoice/:data" handler={Invoice}/>
        <Route name="markets" path="markets" handler={Markets}/>
        <Route name="exchange" path="exchange/trade/:marketID" handler={Exchange}/>
        <Route name="settings" path="settings" handler={Settings}/>
        <Route name="block" path="block/:height" handler={BlockContainer}/>
        <Route name="asset" path="asset/:symbol" handler={Asset}/>
        <Route name="tx" path="tx" handler={Transaction}/>
        <Route name="create-account" path="create-account" handler={CreateAccount}/>
        <Route name="existing-account" path="existing-account" handler={ExistingAccount}/>
        <Route name="import-keys" path="import-keys" handler={ImportKeys}/>
        <Route name="account" path="/account/:account_name" handler={AccountPage}>
            <DefaultRoute handler={AccountOverview}/>
            <Route name="account-overview" path="overview" handler={AccountOverview}/>
            <Route name="account-assets" path="user-assets" handler={AccountAssets}/>
            <Route name="account-member-stats" path="member-stats" handler={AccountMemberStats}/>
            <Route name="account-history" path="history" handler={AccountHistory}/>
            <Route name="account-payees" path="payees" handler={AccountPayees}/>
            <Route name="account-permissions" path="permissions" handler={AccountPermissions}/>
            <Route name="account-voting" path="voting" handler={AccountVoting}/>
            <Route name="account-orders" path="orders" handler={AccountOrders}/>
        </Route>
    </Route>
);


Router.run(routes, Handler => {
    React.render(<Handler/>, document.getElementById("content"));
});

