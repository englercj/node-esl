# ESL Sample server

Make sure you have in your dialplan

    <extension name="sampleserver">
        <condition field="destination_number" expression="^9999">
            <action application="socket" data="127.0.0.1:8085 async full"/>
        </condition>
    </extension>
