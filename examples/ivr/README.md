# ESL IVR demo

This program is meant to work with the default Freeswitch directory, which contains extension 10xx and 3 groups (sales, support, and billing).

The ivr will play a menu recording instructing the caller to:

*a. Press '2' for sales.*
*b. Press '3' for technical support.*
*c. Press '4' for billing.*
*d. Enter the extension you want to call followed by the '#' key*

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