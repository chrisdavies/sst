const sst = require('../sst');
const should = require('chai').should();

describe('Simple State Tree', function () {
  it('Uses defaults', function () {
    const defaults = {hi: 'there'};
    const defs = {
      hi: {
        initialState(val) {
          return 'Hi ' + val;
        }
      }
    };

    const store = sst(defaults, defs);
    store.getState().hi.should.eql('Hi there');
  });

  it('Updates initial state', function () {
    const defaults = {stuffs: undefined};
    const defs = {
      stuffs: {
        initialState(prevState, newState) {
          return newState || prevState || [];
        }
      }
    };

    const store = sst(defaults, defs);
    store.getState().stuffs.should.eql([]);
    store.$transform.stuffs.initialState(['Hi', 'there']);
    store.getState().stuffs.should.eql(['Hi', 'there']);
  });

  it('Calls onChange if specified', function () {
    let count = 0;
    const defaults = {hi: 'there'};
    const defs = {
      hi: {
        initialState(val) {
          return 'Hi ' + val;
        },
        say(_, msg) {
          return msg;
        }
      }
    };
    const store = sst(defaults, defs);
    store.onChange = () => {
      ++count;
      store.getState().hi.should.eql('Yo!');
    };

    count.should.eql(0);
    store.$transform.hi.say('Yo!');
    count.should.eql(1);
  });

  it('Allows only higher-order transforms to return undefined', function () {
    let count = 0;
    const defs = {
      doSomething() {
        ++count;
      },
      doSomethingElse() {
        return store => {
          ++count;
          return undefined;
        }
      }
    };

    const store = sst({}, defs);

    should.throw(store.$transform.doSomething, /undefined/);
    store.$transform.doSomethingElse();
    count.should.eql(2);
  });

  it('Ignores promises from higher-order transforms', function () {
    const defs = {
      highOrder() {
        return store => {
          return Promise.resolve({hi: 'You!'});
        };
      }
    };

    const store = sst({hi: 'there'}, defs);

    return store.$transform.highOrder()
      .then(() => store.getState().hi.should.eql('there'));
  });

  it('Resolves promises from low-order-transforms', function () {
    const defs = {
      lowOrder() {
        return Promise.resolve({hi: 'You!'});
      }
    };

    const store = sst({hi: 'there'}, defs);

    return store.$transform.lowOrder()
      .then(() => store.getState().hi.should.eql('You!'));
  });

  it('Resolves promises from low-order leaf-transforms', function () {
    const defs = {
      hi: {
        initialState(state) {
          return state;
        },
        cat(state, message) {
          return Promise.resolve(state + message);
        }
      }
    };

    const store = sst({hi: '1'}, defs);

    return store.$transform.hi.cat('2')
      .then(() => store.getState().hi.should.eql('12'));
  });

  it('Changes state when transform is invoked', function () {
    const defs = {
      users: {
        initialState() {
          return [];
        },

        addUser(users, user) {
          return users.concat(user);
        }
      }
    };

    const store = sst({}, defs);
    store.$transform.users.addUser({name: 'Joe'});
    store.getState().users.should.eql([{name: 'Joe'}]);
    store.$transform.users.addUser({name: 'Jane'});
    store.getState().users.should.eql([{name: 'Joe'}, {name: 'Jane'}]);
  });

  it('Passes store if thunk is returned', function () {
    const defs = {
      me: {
        initialState() {
          return 'Chris';
        },

        addLastName: (me) => ({$transform, getState}) => {
          getState().me.should.eql('Chris');
          $transform.me.lowOrderAdd(' Davies');
        },

        lowOrderAdd(me, name) {
          return me + name;
        }
      }
    };

    const store = sst({}, defs);
    store.$transform.me.addLastName();
    store.getState().me.should.eql('Chris Davies');
  });

  it('Passes root state to root transforms', function () {
    const defs = {
      doFanciPants: function (state) {
        state.name.should.eql('Joe');
        return {name: 'Joseph'};
      }
    };

    const store = sst({name: 'Joe'}, defs);
    store.$transform.doFanciPants();
    store.getState().name.should.eql('Joseph');
  });

  it('Applies middlewares', function () {
    let count = 0;

    function middleware(context, next) {
      ++count;
      context.store.getState().name.should.eql('Callie');
      next(context);
      context.store.getState().name.should.eql('Callie!');
    }

    const defs = {
      something: function (state) {
        return {name: state.name + '!'};
      }
    };

    const store = sst({name: 'Callie'}, defs, [middleware]);
    count.should.eql(0);
    store.$transform.something();
    store.getState().name.should.eql('Callie!');
    count.should.eql(1);
  });

  it('Runs selectors without any state mutation', function() {
    const defs = {
      names: {
        initialState: () => [],
        add: (names, name) => names.concat(name),
        $first: (names) => names[0],
        $last: (names) => names[names.length - 1],
      }
    };

    const store = sst({}, defs);
    store.$transform.names.add('John');
    store.$transform.names.add('Doe');
    store.$selector.names.$first().should.eql('John');
    store.$selector.names.$last().should.eql('Doe');
    store.getState().names.should.eql(['John', 'Doe']);
  });

  it('Returns the resulting substate of the transform', function() {
    const defs = {
      peep: {
        initialState: () => [],
        sayHi: () => 'Hi',
      }
    };

    const store = sst({}, defs);
    store.$transform.peep.sayHi().should.eql('Hi');
  });
});
