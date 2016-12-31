'use strict';

module.exports = function sst(defaults, definitions, middlewares) {
  middlewares = middlewares || [];

  var root = {state: Object.assign({}, defaults)};
  var applyMiddleware = buildMiddleware(middlewares);
  var store = {
    actions: {},

    selectors: {},

    getState: function() {
      return root.state;
    },

    setState: function(state) {
      return (root.state = state);
    }
  };

  initializeStore(store, root, definitions, applyMiddleware);

  return store;
};

function initializeStore(store, root, definitions, applyMiddleware) {
  for (var key in definitions) {
    var definition = definitions[key];

    if (key[0] === '$') {
      store.selectors[key] = buildSelector(store, '', key, definition);
    } else if (typeof definition === 'function') {
      store.actions[key] = buildAction(store, '', key, definition, applyMiddleware);
    } else {
      var built = buildNested(store, key, definition, applyMiddleware);
      root.state[key] = definition.initialState(root.state[key]);
      store.actions[key] = built.actions;
      store.selectors[key] = built.selectors;
    }
  }
}

function buildNested(store, stateProp, definition, applyMiddleware) {
  var actions = {};
  var selectors = {};

  for (var key in definition) {
    if (key[0] === '$') {
      selectors[key] = buildSelector(store, stateProp, key, definition[key]);
    } else {
      actions[key] = buildAction(store, stateProp, key, definition[key], applyMiddleware);
    }
  }

  return {
    actions: actions,
    selectors: selectors
  };
}

function buildSelector(store, stateProp, actionName, selector) {
  return function() {
    var args = nextArgs(store, stateProp, arguments);

    return selector.apply(null, args);
  };
}

function buildAction(store, stateProp, actionName, action, applyMiddleware) {
  assertValidProp(actionName);

  return function() {
    return applyMiddleware({
      store: store,
      stateProp: stateProp,
      actionName: actionName,
      action: action,
      args: arguments
    });
  };
}

function assertValidProp(prop) {
  var reserved = /^\_/;

  if (reserved.test(prop)) {
    throw 'Invalid property ' + prop + '. Properties cannot start with _';
  }
}

function buildMiddleware(middlewares) {
  var middleware = leafMiddleware;

  for (var i = middlewares.length - 1; i >= 0; --i) {
    middleware = makeMiddleware(middlewares[i], middleware);
  }

  return middleware;
}

function makeMiddleware(fn, next) {
  return function (context) {
    return fn(context, next);
  };
}

function leafMiddleware(context) {
  var stateProp = context.stateProp;
  var store = context.store;
  var args = nextArgs(store, stateProp, context.args);
  var result = context.action.apply(null, args);
  var isValidState = !result || typeof result.then !== 'function';

  if (typeof result === 'function') {
    result = result(store);
  }

  if (result === undefined) {
    throw 'An action returned an undefined state. Actions should return a valid state or null.';
  }

  // If the return was not a promise, we'll update state.
  if (!stateProp && isValidState) {
    store.setState(result);
  } else if (isValidState) {
    var stateCopy = Object.assign({}, store.getState());
    stateCopy[stateProp] = result;
    store.setState(stateCopy);
  }

  return result;
}

function nextArgs(store, stateProp, args) {
  var state = (!stateProp) ? store.getState() : store.getState()[stateProp];
  return Array.prototype.concat.apply([state], args);
}
