import React from "react";
import _ from "lodash";
import ChainStore from "api/ChainStore";
import ChainTypes from "./ChainTypes";
import utils from "common/utils";

/**
 * @brief provides automatic fetching and updating of chain data
 *
 * After applying this decorator to component any property of a type from ChainTypes
 * specified in component's propTypes will be automatically converted from object or account id
 * into a state object that is either undefined, null or an Immutable object.   The
 * Immutable object will automatically be updated anytime it changes on the
 * blockchain.
 *
 * Example:
 *
 * @BindToChainState()
 * class Balance {
 *    static propTypes = {
 *        balance: ChainTypes.ChainObject.isRequired
 *    }
 *    render() {
 *        let amount = Number(this.props.balance.get('balance'));
 *        let type = this.props.balance.get('asset_type');
 *        return (<FormattedAsset amount={amount} asset={type}/>);
 *    }
 * }
 *
 * <Balance balance="1.5.3"/>
 */

const arrayElement = (element_number, array) => array[element_number];
const firstEl = _.curry(arrayElement)(0);
const secondEl = _.curry(arrayElement)(1);
const checkChainType = _.curry( (chain_type, t) => t === chain_type || t === chain_type.isRequired );
const isObjectType = checkChainType(ChainTypes.ChainObject);
const isAccountType = checkChainType(ChainTypes.ChainAccount);
function checkIfRequired(t) {
    for(let k in ChainTypes) {
        let v = ChainTypes[k];
        if(t === v.isRequired) return true;
    }
    return false;
}

function BindToChainState(options) {
    return function (Component) {

        return class Wrapper extends React.Component {
            constructor(props) {
                super(props);
                let prop_types_array = _.pairs(Component.propTypes);
                this.chain_objects = prop_types_array.filter(_.flow(secondEl, isObjectType)).map(firstEl);
                this.chain_accounts = prop_types_array.filter(_.flow(secondEl, isAccountType)).map(firstEl);
                this.required_props = prop_types_array.filter(_.flow(secondEl, checkIfRequired)).map(firstEl);
                this.all_chain_props = [...this.chain_objects, ...this.chain_accounts ];
                //console.log("----- Wrapper constructor ----->", this.all_chain_props);
                this.update = this.update.bind(this);
                this.state = {};
            }

            shouldComponentUpdate(nextProps, nextState){
                return !utils.are_equal_shallow(this.props, nextProps) ||
                       !utils.are_equal_shallow(this.state, nextState);
            }

            componentWillMount() {
                ChainStore.subscribe( this.update );
                this.update();
            }

            componentWillUnmount() { ChainStore.unsubscribe( this.update ) }

            componentWillReceiveProps( next_props ) { this.update(); }

            update()
            {
                let new_state = {};
                for( let key of this.chain_objects )
                {
                    let prop = this.props[key] || Component.defaultProps[key];
                    if(prop) {
                        let new_obj = ChainStore.getObject(prop);
                        if(new_obj !== this.state[key]) new_state[key] = new_obj;
                    }
                }
                for( let key of this.chain_accounts )
                {
                    let prop = this.props[key] || Component.defaultProps[key];
                    if(prop) {
                        let new_obj = ChainStore.getAccount(prop);
                        if(new_obj !== this.state[key]) new_state[key] = new_obj;
                    }
                }
                //console.log("----- Wrapper update ----->", this.props, this.state, new_state);
                this.setState( new_state )
            }

            render() {
                const props = _.omit(this.props, this.all_chain_props);
                //console.log("----- Wrapper render ----->", props, this.state, this.required_props);
                for(let prop of this.required_props) if(!this.state[prop]) return null;
                return <Component {...props} {...this.state}/>;
            }
        }

    }
}

export default BindToChainState;
