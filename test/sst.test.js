const sst = require('../sst');

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

  it('Changes state when action is invoked', function () {
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
    store.actions.users.addUser({name: 'Joe'});
    store.getState().users.should.eql([{name: 'Joe'}]);
    store.actions.users.addUser({name: 'Jane'});
    store.getState().users.should.eql([{name: 'Joe'}, {name: 'Jane'}]);
  });

  it('Passes store if thunk is returned', function () {
    const defs = {
      me: {
        initialState() {
          return 'Chris';
        },

        addLastName: (me) => store => {
          store.getState().me.should.eql('Chris');
          (typeof store.actions.me.addLastName).should.eql('function');
          return me + ' Davies';
        }
      }
    };

    const store = sst({}, defs);
    store.actions.me.addLastName();
    store.getState().me.should.eql('Chris Davies');
  });

  it('Passes root state to root actions', function () {
    const defs = {
      doFanciPants: function (state) {
        state.name.should.eql('Joe');
        return {name: 'Joseph'};
      }
    };

    const store = sst({name: 'Joe'}, defs);
    store.actions.doFanciPants();
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
    store.actions.something();
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
    store.actions.names.add('John');
    store.actions.names.add('Doe');
    store.selectors.names.$first().should.eql('John');
    store.selectors.names.$last().should.eql('Doe');
    store.getState().names.should.eql(['John', 'Doe']);
  });
});
