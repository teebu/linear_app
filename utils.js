const moment = require('moment');

RegExp.quote = function (str) {
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

function replacePlaceholders(text) {
  const now = moment(new Date()).format('MMM Mo YYYY, h:mm:ss a');

  const placeHolders = {
    '{DATE}': now,
  };

  Object.keys(placeHolders).forEach((key) => {
    const re = new RegExp(RegExp.quote(key), "g");
    text = text.replace(re, placeHolders[key]);
  });

  return text;
}

function splitAndTrim(str='', sep=',') {
  str = str || '';
  let arr = [];
  return arr = str.split(sep).map(item => item.trim());
}


module.exports = {
  replacePlaceholders,
  splitAndTrim
};
