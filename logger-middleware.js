/* eslint no-console: "off" */
'use strict';

module.exports = function loggerMiddleware(context, next) {
  if (!console.group) {
    return next(context);
  }

  var store = context.store;
  var actionType = context.stateProp + '.' + context.actionName;

  console.group(actionType);
  console.log('%c Prev State:', 'color: gray', store.getState());
  console.log('%c Action:', 'color: blue', actionType, context.args);

  var result = next(context);

  console.log('%c Next State:', 'color: green', store.getState());
  console.groupEnd(actionType);

  return result;
};
