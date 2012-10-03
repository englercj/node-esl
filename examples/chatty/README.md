## Chatty

Chatty is a simple application to test FreeSWITCH SMS and ESL capabilities. It presents
a real-time webchat with a cell phone via text messages.

![Can't Talk][1]

### Installation

#### Configure FreeSWITCH

First you need to install and configure `mod_sms`. You can find instructions for this on
the [Mod SMS](http://wiki.freeswitch.org/wiki/Mod_sms) Wiki Page.

You will also need to ensure that your chatplan includes the `<action application="fire" data=""/>`
directive so that SIP `MESSAGE`s are broadcasted to the Event Sockets.

Here is an example `conf/chatplan/default.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<include>
  <context name="default">

    <extension name="demo">
      <condition field="to" expression="^(.*)$">
	<action application="fire" data=""/>
      </condition>
    </extension>

  </context>
</include>
```

#### Install Chatty

simply run npm install from within the `examples/chatty` directory

```shell
cd examples/chatty
npm install
```

### Usage

To start the server, run the executable:

```shell
cd examples/chatty
./bin/chatty
```

Then navigate your browser to `http://server:8181`. If you have you config.json configured
properly then you should be able to send and receive SMS messages from the web interface.


[1]: http://www.stuffistumbledupon.com/wp-content/uploads/2012/04/Rabbit-Meme-Playing-PS3-Videogames-cant-talk-now-boss-fight-lol-lulz-funny-joke-pictures-animals.jpg