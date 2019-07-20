## Upgrading to v2

- The library is now licensed under the more permissive MIT License.
- `recvEvent` and `recvEventTimed` functions removed.
    * These functions don't make sense in the event-driven world of Node.
- Connection constructor now always takes a socket.
    * Added `createInbound` and `createOutbound` static methods instead of constructor overloads.
- Show no longer accepts a format and always uses json.
