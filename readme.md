# Simple State Tree

SST is a small library for managing state in unidirectional/Flux-like apps.
This is generally used with a framework-specific variant such as [react-sst](https://github.com/chrisdavies/react-sst).

[![Build Status](https://travis-ci.org/chrisdavies/sst.svg?branch=master)](https://travis-ci.org/chrisdavies/sst)

## Installation

`npm install sst`

## Overview

SST represents a single, global state tree, along with a basic mechanism for transforming and retrieving state.

## Creating an sst store

Let's say you have a simple application with state that looks something like this:

```js
// main.js
const defaultState = {
  currentUser: {
    name: 'Joe Shmo',
    email: 'joe@shmo.com',
    lastAction: new Date(),
  },
  messages: [{
    id: 2,
    text: 'Hey there!',
  }, {
    id: 3,
    text: 'What up?',
  }]
};
```

You would instantiate an instance of sst as follows:

```js
// main.js
import sst from 'sst';

const defaultState = {/* SEE PREVIOUS EXAMPLE */};
const store = sst(defaultState);

// Writes 'Joe Shmo' to the console.
console.log(store.getState().currentUser.name);

```


## Transforming state

Let's take the previous example and see how we might update the current user. To do this, we're going to write a
JavaScript module whose sole responsibility is to manage the currentUser state.

```js
// current-user.js
export function initialState(myState) {
  return myState;
}

export function setName(myState, name) {
  return Object.assign({}, myState, {name});
}
```

Here, we have two basic functions. The first is `initialState` which takes the default state as an argument, which from our
previous example would be:

```js
{
  name: 'Joe Shmo',
  email: 'joe@shmo.com',
  lastAction: new Date(),
}
```

And it returns the initial state. In our case, we'll just pass the default state through. The `initialState` function must be
defined by all state management modules.

The second function is `setName`. This function is a state transormer. Its name doens't matter. A module may have as many
transformers as you'd like. Each transformer takes the current state of the module as its first argument, and may have as
many arguments as you like. It then returns the new module state.


### Calling transforms

Let's bring `current-user.js` into our original `main.js` and see how we'd make use of it.

```js
// main.js
import sst from 'sst';
import * as currentUser from './current-user';

const defaultState = {/* SEE PREVIOUS EXAMPLE */};
const stateManagers = {
  currentUser
};
const store = sst(defaultState, stateManagers);

// Writes 'Joe Shmo' to the console.
console.log(store.getState().currentUser.name);

store.$transform.currentUser.setName('Jimbo');

// Writes 'Jimbo' to the console.
console.log(store.getState().currentUser.name);

```

There's some magic going on there, which we'll get to in a minute. First, notice that we are now
passing a second argument to `sst`. The second argument is an object that represents our global state
managers and roughly mirrors the shape of our `defaultState`.

Notice, too, this line:

`store.$transform.currentUser.setName('Jimbo');`

Here, we are accessing the store's `$transform` property which gives us our state transform functions.
Notice that we can grab `currentUser.setName` which is the `setName` function from our `current-user.js`
module. But we are only passing it `'Jimbo'`, this is because the sst store automatically curries
transform functions and ensures that their first argument (the module's state) is always bound to the
latest version of the state tree.



## Selectors

Sometimes, you need to define computed data. In sst, this is done using selectors.

Let's update our `current-user.js` file to see an example.

```js
// current-user.js

// ... same as previously ...

export function $firstName(myState) {
  return myState.name.split(' ')[0];
}
```

Here, we've implimented a naiive function that extracts the first name from our current users's full name.

Notice that the function name begins with a `$`. This denotes that the function is a selector (read-only)
rather than a transformer / mutation operation.

Here's how we'd use it in `main.js` or wherever we have access to our sst store.

```js
// Logs 'Joe'
console.log(store.$selector.currentUser.$firstName);
```


## Calling transforms from other transforms

Sometimes, you need to write a function which affects multiple modules in a state tree.

You can do this using a higher-order transform. Let's create a `higher-order-transforms.js` file (the name
doesn't matter) and define a higher-order transform.

Let's also make some assumptions. Let's assume we've defined a `messages.js` module for managing
messages state.

```js
// current-user.js
// Let's add this to current-user.js
export function setLastAction(myState, lastAction) {
  return Object.assign({}, myState, {lastAction});
}

// higher-order-transforms.js
export function addMessage(state, message) {
  return ({$transform}) => {
    $transform.currentUser.setLastAction(new Date());
    $transform.messages.add(message); // Assume this has been implimented
  };
}

// main.js
import sst from 'sst';
import * as higherOrderTransforms from './higher-order-transforms';
import * as messages from './messages';
import * as currentUser from './current-user';

const defaultState = {/* SEE PREVIOUS EXAMPLE */};
const stateManagers = Object.assign({}, higherOrderTransforms, {
  messages,
  currentUser
});
const store = sst(defaultState, stateManagers);

// Adds a message and updates the current user's lastAction field
store.$transform.addMessage('Hello world!');

```

Higher order transforms are also bound to the current state, in our case here, the state is
the global/root state, since the transform functions are assigned directly to the stateManagers
object itself.

Higher order functions return a function which itself receives the current store. They can then
invoke as many other transforms as they would like.

It's important to note that the return value of higher order transforms is ignored. Higher order
transforms are expected to transform state exclusively by calling other transforms.


## Promises

Sometimes your transforms need to do asynchronous jazz. Here's how you might do that in a regular
transform function:

```js
// current-user.js
export function save(myState) {
  return myApi.postUser(myState).then(result => result.user);
}
```

The promise returned by a regular transform is expected to resolve into the new state for the module.

With higher order transforms, the return value is ignored. In these cases, the transform function
itself is responsible for directing what should happen with the promise's result. Here's a hypothetical
example.

```js
export function addMessage(state, message) {
  return ({$transform}) => {
    $transform.status.beginProcessing();

    myApi.postMessage(message)
      .then(result => $transform.messages.add(result))
      .then($transform.status.endProcessing())
      .catch(err => $transform.status.fail(err.message));
  };
}
```

As you can see, higher order transforms are written in an imperative style.


## Middleware

Sometimes you want to run some code any time a transform is invoked. You may wish to do something
beforehand, or you may wish to do something afterward. This can be accomplishe with middleware.

We may document this feature further in the future, but for now, you can have a look at the [logger
middleware](https://github.com/chrisdavies/sst/blob/master/logger-middleware.js) to see how a middleware
function is written.

Here's how you'd tell sst to use the built in logger middleware:

```js
// main.js

// Same as previously ...
import loggerMiddleware from 'sst/logger-middleware';

const store = sst(defaultState, stateManagers, [loggerMiddleware]);

```

The `loggerMiddleware` function logs the state before and after a transform is invoked, and
makes it easy to see what transforms have run, and how they have affected global state.


## Conventions and gotchas

Functions beginning with `_` are reserved for possible future use.

Transforms should be pure functions. They should not mutate state. Their return value should be
dicated exclusively by their arguments. This may not always be possible, but it should be attempted.

The return value of higher order functions is ignored.

Selectors are any function beginning with `$`.

Transforms are functions not beginning with `$` and not named `initialState`.


## Licence MIT

Copyright (c) 2017 Chris Davies

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.