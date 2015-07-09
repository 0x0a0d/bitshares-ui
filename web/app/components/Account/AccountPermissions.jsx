import React from "react";
import {PropTypes} from "react";
import {Link} from "react-router";
import Immutable from "immutable";
import Translate from "react-translate-component";
import Tabs from "react-foundation-apps/src/tabs";
import AutocompleteInput from "../Forms/AutocompleteInput";
import PermissionsTable from "./PermissionsTable";

class AccountPermissions extends React.Component {

    constructor() {
        super();
        this.initial_data = {
            active_permissions: Immutable.List.of({type: "account", name: "alice", weight: 10}, {type: "account", name: "bob", weight: 10}, {type: "key", name: "WIFPUBLICKEY", weight: 80}),
            active_threshold: 90,
            owner_permissions: Immutable.List.of({type: "account", name: "alice", weight: 10}, {type: "account", name: "bob", weight: 10}, {type: "key", name: "WIFPUBLICKEY", weight: 80}),
            owner_threshold: 90
        };
        this.state = this.getDefaultState();
    }

    getDefaultState() {
        return {
            active_permissions: this.initial_data.active_permissions,
            active_threshold: this.initial_data.active_threshold,
            owner_permissions: this.initial_data.owner_permissions,
            owner_threshold: this.initial_data.owner_threshold
        };
    }

    isStateChanged() {
        return  this.state.active_permissions !== this.initial_data.active_permissions ||
                this.state.active_threshold !== this.initial_data.active_threshold ||
                this.state.owner_permissions !== this.initial_data.owner_permissions ||
                this.state.owner_threshold !== this.initial_data.owner_threshold;
    }

    onAddRow(state_key, name, weight) {
        let permissions = this.state[state_key].push({type: "account", name: name, weight: weight});
        let data = {}; data[state_key] = permissions;
        this.setState(data);
    }

    onRemoveRow(state_key, name) {
        let index = this.state[state_key].findIndex(i => i.name === name);
        if (index >= 0) {
            let permissions = this.state[state_key].delete(index);
            let data = {}; data[state_key] = permissions;
            this.setState(data);
        }
    }

    onThresholdChanged(state_key, value) {
        let data = {}; data[state_key] = value;
        this.setState(data);
    }

    onPublish() {
        console.log("[AccountPermissions.jsx:53] ----- onPublish ----->");
    }

    onResetChanges(e) {
        e.preventDefault();
        this.setState(this.getDefaultState());
    }

    render() {
        console.log("[AccountPermissions.jsx:38] ----- render ----->", this.isStateChanged());
        let ad = this.props.all_delegates;
        let all_accounts = Object.keys(ad).map(k => [`["${ad[k]}","${k}"]`, k]);
        let action_buttons_class = "button" + (this.isStateChanged() ? "" : " disabled");

        return (
            <div className="grid-content">
                <div className="content-block">
                    <h3>Active Permissions</h3>
                    <PermissionsTable
                        permissions={this.state.active_permissions}
                        threshold={this.state.active_threshold}
                        accounts={all_accounts}
                        onAddRow={this.onAddRow.bind(this, "active_permissions")}
                        onRemoveRow={this.onRemoveRow.bind(this, "active_permissions")}
                        onThresholdChanged={this.onThresholdChanged.bind(this, "active_threshold")} />
                    </div>
                <div className="content-block">
                    <h3>Owner Permissions</h3>
                    <PermissionsTable
                        permissions={this.state.owner_permissions}
                        threshold={this.state.owner_threshold}
                        accounts={all_accounts}
                        onAddRow={this.onAddRow.bind(this, "owner_permissions")}
                        onRemoveRow={this.onRemoveRow.bind(this, "active_permissions")}
                        onThresholdChanged={this.onThresholdChanged.bind(this, "owner_threshold")} />
                </div>
                <div className="content-block">
                    <div className="actions clearfix">
                        <button className={action_buttons_class} onClick={this.onPublish.bind(this)}>Publish Changes</button>
                        <a href="#" className={action_buttons_class + " secondary"} onClick={this.onResetChanges.bind(this)}>Reset Changes</a>
                    </div>
                </div>
            </div>
        );
    }
}

export default AccountPermissions;
