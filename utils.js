const moment = require('moment');

RegExp.quote = function (str) {
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

function replacePlaceholders(text) {
  const now = moment(new Date()).format('MM/DD/YYYY h:mm a');

  const placeHolders = {
    '{DATE}': now,
  };

  Object.keys(placeHolders).forEach((key) => {
    const re = new RegExp(RegExp.quote(key), "g");
    text = text.replace(re, placeHolders[key]);
  });

  return text;
}

module.exports = {
  replacePlaceholders
}
