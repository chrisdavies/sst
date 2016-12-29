# Simple State Tree

SST is a small library for managing state in unidirectional/Flux-like apps.

## Naming Conventions

Selectors are any function beginning with `$` and are automatically memoized.

Mutators are functions not beginning with `$` and not named `initialState`.

Functions beginning with `_` are reserved.

If your action/reducer needs the store, it can be explicitly passed in, or it
can be retrieved via a thunk `(store) => {...}` where `store` is
the SST store.
