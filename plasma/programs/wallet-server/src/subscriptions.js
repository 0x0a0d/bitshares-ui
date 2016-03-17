import { Map } from "immutable"

let subscriptions = Map()
let subscriptions_ws_id = 1

/**
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {string} subscribe_id
    @return {boolean} success or false for duplicate subscription
*/
export function subscribe(ws, method, subscribe_key, subscribe_id) {
    ws.subscriptions_ws_id = subscriptions_ws_id++
    if(global.DEBUG) {
        console.log("DEBUG\tsubscriptions(" + ws.subscriptions_ws_id + ")\tsubscribe", method, subscribe_key, subscribe_id)
    }
    let success = false
    subscribe_id = String(subscribe_id)
    
    subscriptions = subscriptions
        .updateIn([method, subscribe_key, ws.subscriptions_ws_id], Map(), ids =>{
            if( ids.has(subscribe_id) ) {
                console.log("WARN\tsubscriptions(" + ws.subscriptions_ws_id + ")\tAlready subscribed", subscribe_id);
                return ids
            }
            success = true
            return ids.set(subscribe_id, ws)
        })
    return success
}

/** 
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {string} unsubscribe_id
    @return {boolean} success or false when not subscription
*/
export function unsubscribe(ws, method, subscribe_key, unsubscribe_id) {
    if(global.DEBUG) {
        console.log("DEBUG\tsubscriptions(" + ws.subscriptions_ws_id + ")\tunsubscribe", method, subscribe_key, unsubscribe_id)
    }
    let success = false
    unsubscribe_id = String(unsubscribe_id)
    subscriptions = subscriptions
        .updateIn([method, subscribe_key, ws.subscriptions_ws_id], Map(), ids =>{
            if( ! ids.has(unsubscribe_id) ) {
                console.log("WARN\tsubscriptions(" + ws.subscriptions_ws_id + ")\tNot subscribed", unsubscribe_id);
                return ids
            }
            success = true
            return ids.remove(unsubscribe_id)
        })
    return success
}

/** 
    Notify ALL web sockets except arg1
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {object} params
*/
export function notifyOther(ws, method, subscribe_key, params) {
    
    let str
    if(global.DEBUG) {
        str = JSON.stringify(params)
        str = str.replace(/[A-Za-z0-9+/]{60,}=*/g, "...base64...")
        console.log("DEBUG\tsubscriptions(" + ws.subscriptions_ws_id + ")\tnotifyOther",  method, subscribe_key, str);
    }
    
    let ws_map = subscriptions.getIn([method, subscribe_key])
    if( ! ws_map )
        return
    
    ws_map.forEach( (ids, subscriptions_ws_id) => {
        // console.log('ids,subscriptions_ws_id', ids,subscriptions_ws_id)
        
        // console.log('ws.subscriptions_ws_id, subscriptions_ws_id', ws.subscriptions_ws_id, subscriptions_ws_id)
        // don't notify yourself
        if( ws.subscriptions_ws_id === subscriptions_ws_id )
            return
        
        ids.forEach( (subscribe_ws, subscription_id) => {
            // console.log('typeof subscribe_ws,subscription_id', typeof subscribe_ws,subscription_id)
            try {
                if(global.DEBUG) {
                    console.log("DEBUG\tsubscriptions(" + ws.subscriptions_ws_id + ")\tnotifyOther", subscription_id, subscribe_key, method, "...")
                }
                subscribe_ws.send(JSON.stringify({
                    method: "notice",
                    params: [subscription_id, params]
                }))
            } catch( error ) {
                
                // need a better way to know when socket is closed
                let socketClosed = error.toString() === "Error: not opened"
                console.log("ERROR\tsubscriptions\tnotifyOther",
                    socketClosed ? "<socket closed>" : "<other error>",
                    error, "stack", error.stack)
                
                // remove only when socket close error?
                remove(ws)
            }
        })
        
    })
}

export var count = ()=> {
    let cnt = 0
    subscriptions
        .forEach( subscribe_key => subscribe_key
        .forEach( subscribe_ws => subscribe_ws
        .forEach( ids => cnt += ids.count()
    )))
    return cnt
}

export function remove(ws) {
    // if(global.DEBUG) console.log("DEBUG remove,ws st",count())
    subscriptions = subscriptions
        .filterNot( subscribe_key => subscribe_key
            .filterNot( subscribe_ws => subscribe_ws
                .filterNot( ids => {
                    // if(global.DEBUG) console.log("DEBUG ids.toJS()", ids.toJS())
                    let match = subscribe_ws === ws
                    if( match && ! ids.isEmpty()) {
                        console.error("WARN\tsubscriptions(" + ws.subscriptions_ws_id + ")\tWebSocket closed with active subscription(s)", ids.keySeq().toJS())
                    }
                    return match
                })
            )
        )
    // if(global.DEBUG) console.log("DEBUG remove,ws en",count())
}
