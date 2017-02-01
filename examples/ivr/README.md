# ESL IVR demo

This is a simple IVR example that is meant to work with the default Freeswitch directory, which contains extensions 10xx and 3 groups (sales, support, and billing).

To do:
- add error recording when invalid entry or extension is dialed.
- currently, if you call an extension before playRecordings.js finishes, it will continue to play to the caller if the callee hangs up first.

The ivr will play a menu recording instructing the caller to:

1. *Press '2' for sales.*
2. *Press '3' for technical support.*
3. *Press '4' for billing.*
4. *Enter the extension you want to call followed by the '#' key*

The reason the menu starts with 2 is because then I could easily allow callers to dial the default extensions 10xx without calling a group.

Program structure:

    ├── callDispatch.js
    ├── dtmf.js
    ├── eslServer.js
    ├── package.json
    └── playRecording.js

The best way to test this demo is to add the following to your default.xml dialplan:

```xml
<extension name="eslserver">
    <condition field="destination_number" expression="^9999">
        <action application="socket" data="127.0.0.1:8085 async full"/>
    </condition>
</extension>
```

Or, if you have a SIP trunk setup, you could call socket in /dialplan/public/yoursipprovider.xml or whereever you set it up:

```xml
<include>
  <extension name="yoursipprovider">
    <condition field="destination_number" expression="^([yoursiptrunk]])$">
      <action application="socket" data="127.0.0.1:8085 async full"/>
    </condition>
  </extension>
</include>
```
