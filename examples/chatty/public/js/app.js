(function($, window, undefined) {
    var loc = window.location,
    socket = io.connect(loc.protocol + '//' + loc.host),
    number = false;

    $(function() {
        //basic ui tweaks
        $('input.num').on('keyup', function(e) {
            var $this = $(this).removeClass('error');

            if($this.val().length === parseInt($this.attr('maxlength'), 10) && $this.next().length)
                $this.next().focus();

            if(e.which === 13) openChat();
        });

        $('#btnConnect').on('click', openChat);

        $('#btnSend').on('click', sendMessage);
        $('#msgtxt').on('keypress', function(e) {
            if(e.which === 13) sendMessage(e);
        });

        socket.on('recvmsg', recvMessage);
    });

    //send a text
    function sendMessage(e) {
        var txt = $('#msgtxt').val().trim();

        if(!txt) return;

        $('#messages').append(createMsgBox(txt));

        socket.emit('sendmsg', txt, function(evtJson) {
            var evt = JSON.parse(evtJson),
            reply = evt['Reply-Text'].split(' '), //0 = +OK, 1 = uuid
            $elm = $('#messages').children().last().removeClass('sending');

            if(reply[0] == '+OK')
                $elm.addClass('sent').data('uuid', reply[1]);
            else
                $elm.addClass('failed').data('error', evt['Reply-Text']);
        });

        $('#msgtxt').val('');
    }

    //get a text
    function recvMessage(msg) {
        $('#messages').append(createMsgBox(msg, true));
    }

    //opens a chat session with a number
    function openChat() {
        var num = validateNum();

        if(num) {
            socket.emit('setup', num, function() {
                number = num;
                $('#num').hide();
                $('#chat').show();
            });
        }
    }

    //validate the phone number fields
    function validateNum() {
        var pass = true,
        num = '';

        ['#areacode', '#phnum1', '#phnum2'].forEach(function(id) {
            var $e = $(id),
            val = $e.val();

            if(!val || val.length !== parseInt($e.attr('maxlength'), 10)) {
                pass = false;
                $e.addClass('error');
            }
            else
                num += val;
        });

        if(!pass) return false;

        return num;
    }

    //create a new message box for a sent/received message
    function createMsgBox(txt, recv) {
        recv = recv ? 'recv' : 'sending';

        var $box = $('<div/>', {
            'class': 'msg ' + recv,
            'html': '<span class="icon"></span><div class="txt">' + txt + '</div><br class="clear"/>'
        });

        return $box;
    }
})(jQuery, window);