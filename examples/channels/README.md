## Channels

This is a web application that will display real-time updates of FreeSWITCH Channels. It demonstrates
multiple methods of maintaining a FreeSWITCH Channel list using the modesl library.

![Change Channel][1]

### Installation

simply run npm install from within the `examples/channels` directory

```shell
cd examples/channels
npm install
```

### Usage

To start the server, run the executable:

```shell
cd examples/channels
./bin/channels
```

Then navigate your browser to `http://server:8181`. If you have you config.json configured
properly then you should be able to see a list of the channels in use on FreeSWITCH. If you
do not run `show channels` from `fs_cli` and ensure that there are channels in use.

The 3 different methods of getting at the information from FreeSWITCH are documented on the
actual page. You can also live switch between each method, and view the number of events and
the amount of data each sends in your web console.

[1]: http://cdn.memegenerator.net/instances/400x/27272674.jpg