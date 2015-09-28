import React from "react";
import _ from "lodash";

let req = require.context("../../../../help", true, /\.md/);
let HelpData = {};

function split_into_sections(str) {
    let sections = str.split(/\[#\s?(.+?)\s?#\]/);
    if (sections.length === 0) return sections[0];
    if (sections[0].length < 4) sections.splice(0, 1);
    sections = _.reduce(sections, (result, n) => {
        let last = result.length > 0 ? result[result.length-1] : null;
        if (!last || last.length === 2) { last = [n]; result.push(last); }
        else last.push(n);
        return result;
    }, []);
    return _.zipObject(sections);
}

req.keys().forEach(function(filename) {
    var res = filename.match(/\/(.+)\/(.+)\./);
    let locale = res[1];
    let key = res[2];
    let help_locale = HelpData[locale];
    if (!help_locale) HelpData[locale] = help_locale = {};
    let content = req(filename);
    help_locale[key] = split_into_sections(content);
});

//console.log("-- HelpData -->", HelpData);

class HelpContent extends React.Component {
    setVars(str) {
        return str.replace(/(\$.+\$)/gi, (match, text) => {
            let key = text.substr(1, text.length-2);
            return this.props[key] ? this.props[key] : text;
        });
    }
    render() {
        let value = value = HelpData[this.props.locale || "en"][this.props.file];
        if (!value) throw new Error(`help file not found ${this.props.file}`);
        if (this.props.section) value = value[this.props.section];
        if (!value) throw new Error(`help section not found ${this.props.file}#${this.props.section}`);
        return <div className="help-content" dangerouslySetInnerHTML={{__html: this.setVars(value)}} />;
    }
}

export default HelpContent;
