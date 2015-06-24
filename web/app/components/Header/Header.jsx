import React from "react";
import {Link} from "react-router";
import ActionSheet from "react-foundation-apps/lib/action-sheet";
import AccountStore from "stores/AccountStore";
import AccountActions from "actions/AccountActions";
import BaseComponent from "../BaseComponent";
import ZfApi from "react-foundation-apps/lib/utils/foundation-api";
import Icon from "../Icon/Icon";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import ReactTooltip from "react-tooltip";

class Header extends BaseComponent {
    constructor(props) {
        super(props, AccountStore);
    }

    shouldComponentUpdate(nextProps, nextState) {
        // return nextState.currentAccount !== this.state.currentAccount;
        return true;
    }

    closeDropDowns() {
        ZfApi.publish("account_drop_down", "close");
        ZfApi.publish("plus_drop_down", "close");
    }

    accountClickHandler(account_name) {
        this.closeDropDowns();
        AccountActions.setCurrentAccount(account_name);
        this.context.router.transitionTo("account-overview", {name: account_name});
        return false;
    }

    createAccountHandler() {
        this.closeDropDowns();
        this.context.router.transitionTo("create-account");
        return false;
    }

    _triggerMenu(e) {
        e.preventDefault();
        ZfApi.publish("mobile-menu", "toggle");
    }

    render() {
        let currentAccount = this.state.currentAccount, itemRows = [], accountsDropDown = null, plusDropDown = null, accountLink = null;

        let isUnlocked = this.props.isUnlocked;

        let settings = counterpart.translate("header.settings");
        let current = counterpart.translate("header.current");

        if (currentAccount) {
            for (let name in this.state.account_name_to_id) {
                itemRows.push(<li key={name}><a href onClick={this.accountClickHandler.bind(this, name)}>{name}</a></li>);
            }

            let account_display_name = currentAccount.name.length > 20 ? `${currentAccount.name.slice(0, 20)}..` : currentAccount.name;

            accountsDropDown = (
                <ActionSheet id="account_drop_down">
                    <ActionSheet.Button title="">
                        <a className="button">
                            &nbsp;{account_display_name} &nbsp;<Icon name="chevron-down"/>
                        </a>
                    </ActionSheet.Button>
                    <ActionSheet.Content >
                        <ul className="no-first-element-top-border">
                            {itemRows}
                        </ul>
                    </ActionSheet.Content>
                </ActionSheet>);

            plusDropDown = (
                <ActionSheet id="plus_drop_down">
                    <ActionSheet.Button title="">
                        <a className="button">
                            <Icon name="plus-circle"/>
                        </a>
                    </ActionSheet.Button>
                    <ActionSheet.Content >
                        <ul className="no-first-element-top-border">
                            <li><a href onClick={this.createAccountHandler.bind(this)}>Create Account</a></li>
                            <li><a href>Create Asset</a></li>
                        </ul>
                    </ActionSheet.Content>
                </ActionSheet>
            );
        }

        return (
            <div className="header menu-group primary">
                <div className="show-for-small-only">
                    <ul className="primary menu-bar title">
                        <li><a href onClick={this._triggerMenu}><Icon name="menu"/></a></li>
                    </ul>
                </div>

                <div className="show-for-medium medium-8">
                    <ul className="menu-bar">
                        <li><Link to="dashboard"><Translate component="span" content="header.dashboard" /></Link></li>
                        <li><Link to="explorer"><Translate component="span" content="header.explorer" /></Link></li>
                        <li><Link to="markets"><Translate component="span" content="header.exchange" /></Link></li>
                        <li><Link to="transfer"><Translate component="span" content="header.payments" /></Link></li>
                    </ul>
                </div>
                <div className="show-for-medium medium-4">
                    <div className="grp-menu-items-group">
                        <div className="grp-menu-item user-icon">
                            {currentAccount ? <Link to="account-overview" data-tip={current} params={{name: currentAccount.name}}><Icon name="user"/></Link> : null}
                        </div>
                        <div className="grp-menu-item">
                            {accountsDropDown}
                        </div>
                        <div className="grp-menu-item">
                            {plusDropDown}
                        </div>
                        <div className="grp-menu-item" >
                            <Link to="settings" className="button" data-tip={settings}><Icon name="cog"/></Link>
                        </div>
                        <div className="grp-menu-item">
                            <a href="/"><Translate component="span" content="header.logout" /></a>
                        </div>
                    </div>
                </div>
                <ReactTooltip place='bottom' type='dark' effect='solid' />
            </div>
        );
    }


}

Header.contextTypes = {router: React.PropTypes.func.isRequired};

export default Header;
