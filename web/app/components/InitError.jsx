import React from "react";
import connectToStores from "alt/utils/connectToStores";
import HelpContent from "./Utility/HelpContent";
import BlockchainStore from "stores/BlockchainStore";

@connectToStores
class InitError extends React.Component {

    static getStores() {
        return [BlockchainStore]
    }

    static getPropsFromStores() {
        return {
            rpc_connection_status: BlockchainStore.getState().rpc_connection_status
        }
    }

    render() {
        console.log("-- InitError.render -->", this.props);
        return (
            <div className="grid-block page-layout">
                <div className="grid-block medium-5">
                    <div className="grid-content">
                        <h3>Application initialization error</h3>
                        {this.props.rpc_connection_status === "error" ? <HelpContent path="components/InitError" section="connection-error"/> : null}
                        <a href="/">Retry</a>
                    </div>
                </div>
            </div>
        );
    }
}

export default InitError;
