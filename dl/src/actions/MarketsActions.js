var alt = require("../alt-instance");
import Apis from "rpc_api/ApiInstances";
import WalletApi from "rpc_api/WalletApi";

let subs = {};
let wallet_api = new WalletApi();

class MarketsActions {

    subscribeMarket(idA, idB, mia) {
        let subID = idA + "_" + idB;

        let subscription = (subResult) => {
            console.log("markets subscription result:", subResult);
            let shortPromise = mia ?
                Apis.instance().db_api().exec("get_short_orders", [
                    idB, 100
                ]) :
                null;

            Promise.all([
                    Apis.instance().db_api().exec("get_limit_orders", [
                        idA, idB, 100
                    ]),
                    shortPromise
                ])
                .then((result) => {
                    this.dispatch({
                        limits: result[0],
                        shorts: result[1],
                        market: subID
                    });
                }).catch((error) => {
                    console.log("Error in MarketsActions.subscribeMarket: ", error);
                });
        };

        if (!subs[subID]) {
            let shortPromise = mia ?
                Apis.instance().db_api().exec("get_short_orders", [
                    idB, 100
                ]) :
                null;

            return Promise.all([
                    Apis.instance().db_api().exec("subscribe_to_market", [
                        subscription, idA, idB
                    ]),
                    Apis.instance().db_api().exec("get_limit_orders", [
                        idA, idB, 100
                    ]),
                    shortPromise
                ])
                .then((result) => {
                    console.log("market subscription success:", result[0]);
                    subs[subID] = true;
                    this.dispatch({
                        limits: result[1],
                        shorts: result[2],
                        market: subID
                    });
                }).catch((error) => {
                    console.log("Error in MarketsActions.subscribeMarket: ", error);
                });
        }
        return Promise.resolve(true);
    }

    unSubscribeMarket(idA, idB) {
        let subID = idA + "_" + idB;

        if (subs[subID]) {
            return Apis.instance().db_api().exec("unsubscribe_from_market", [
                    idA, idB
                ])
                .then((unSubResult) => {
                    console.log(subID, "market unsubscription success:", unSubResult);
                    delete subs[subID];
                }).catch((error) => {
                    console.log("Error in MarketsActions.unSubscribeMarket: ", error);
                });
        }
        return Promise.resolve(true);
    }

    getMarkets() {
        // return Apis.instance().db_api().exec("get_objects", [
        //     [id]
        // ]).then((result) => {
        //     this.dispatch(result[0]);
        // }).catch((error) => {
        //     console.log("Error in AssetStore.updateAsset: ", error);
        // });
    }

    // TODO: What prevents a caller from entering someone else's sellAccount in the "seller" field?
    createLimitOrder(account, sellAmount, sellAssetID, buyAmount, buyAssetID, expiration, isFillOrKill) {
        var epochTime = new Date().getTime();
        var order = {
            expiration: expiration,
            for_sale: sellAmount,
            id: "unknown", // order ID unknown until server reply. TODO: populate ASAP, for cancels. Is never populated
            sell_price: {
                base: {
                    amount: sellAmount,
                    asset_id: sellAssetID
                },
                quote: {
                    amount: buyAmount,
                    asset_id: buyAssetID
                }
            },
            seller: account
        };

        console.log("sellamount " + sellAmount + ". sellID " + sellAssetID + ". buyAmount " + buyAmount + ". buyID " + buyAssetID);

        // TODO: enable the optimistic dispatch. It causes the order to appear twice, due to the subscription to market
        // this.dispatch({newOrderID: epochTime, order: order});
        var tr = wallet_api.new_transaction();

        tr.add_type_operation("limit_order_create", {
            "seller": account,
            "amount_to_sell": {
                "amount": sellAmount,
                "asset_id": sellAssetID
            },
            "min_to_receive": {
                "amount": buyAmount,
                "asset_id": buyAssetID
            },
            "expiration": expiration,
            "fill_or_kill": isFillOrKill
        });
        wallet_api.sign_and_broadcast(tr).then(result => {
                console.log("order result:", result);
                // TODO: update order ID from the server's response, if possible
            })
            .catch(error => {
                console.log("order error:", error);
                this.dispatch({
                    failedOrderID: epochTime
                });
            });
    }

    // TODO: What prevents a caller from entering someone else's order number in the "order" field?
    cancelLimitOrder(accountID, orderID) {
        console.log("cancel action:", accountID, orderID);
        this.dispatch({
            newOrderID: orderID
        });
        var tr = wallet_api.new_transaction();
        tr.add_type_operation("limit_order_cancel", {
            "fee_paying_account": accountID,
            "order": orderID
        });
        wallet_api.sign_and_broadcast(tr).then(result => {
                console.log("cancel result:", result);
            })
            .catch(error => {
                console.log("cancel error:", error);
                this.dispatch({
                    failedOrderID: orderID
                });
            });
    }
}

module.exports = alt.createActions(MarketsActions);