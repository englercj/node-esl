(function($, window, undefined) {
    var socket = io.connect(),
    $msg, $table, $dialog, method;

    //DOM ready
    $(function() {
        $msg = $('#message');
        $table = $('#channels > tbody');
        $dialog = $('#jsonDialog').dialog({
            title: 'JSON Data',
            resizable: false, modal: true, autoOpen: false,
            height: 600, width: 1200,
            buttons: {
                Close: function() { $(this).dialog('close'); }
            }
        });
        //$('#actions').buttonset();

        method = 'poll';

        $('.method').on('click', function() {
            method = this.id;

            $table.empty();

            socket.emit('change-method', method, function() {
                showMessage('Method changed to: ' + method);
            });
        });

        $table.on('click', 'tr', function() {
            console.log($(this), $(this).data('obj'));
            showDialog($(this).data('obj'));
        });

        socket.emit('setup', method, function() {
            showMessage('Method set to: ' + method);
        });

        socket.on('data', function(data) {
            console.log('Data:', data);
            //complete table redraw
            if(data.uuid === null) {
                buildTable(data);
    updateRow({ uuid: "793d0549-b156-47c8-b18b-678086ea1b77", data: {"uuid":"793d0549-b156-47c8-b18b-678086ea1b77","direction":"outbound","created":"2012-10-09 16:07:47","created_epoch":1349813267,"name":"sofia/external/8507585138@proxy.patlive.local","state":"CS_REPORTING","cid_name":"Outbound Call","cid_num":"8507585138","ip_addr":"","dest":"8507585138","application":"echo","application_data":null,"dialplan":null,"context":"default","read_codec":"PCMU","read_rate":"8000","read_bit_rate":"64000","write_codec":"PCMU","write_rate":"8000","write_bit_rate":"64000","secure":null,"hostname":null,"presence_id":null,"presence_data":null,"callstate":"HANGUP","callee_name":"Outbound Call","callee_num":"8507585138","callee_direction":null,"call_uuid":"793d0549-b156-47c8-b18b-678086ea1b77","sent_callee_name":null,"sent_callee_num":null,"answerstate":"hangup","hit_dialplan":"true","application_response":"_none_"} });
            }
            //remove row
            else if(data.destroy) {
                $table.find('#' + data.uuid).remove();
            }
            //update single row
            else {
                updateRow(data);
            }
        });
    });

    function showMessage(msg, type) {
        $msg.removeClass('good bad info');

        $msg.text(msg)
            .addClass(type || 'good')
            .stop(true)
            .show()
            .css('opacity', 1)
            .delay(2000)
            .fadeOut(1000);
    }

    function showDialog(obj) {
        var json = prettyJson(obj);
        $dialog.dialog('option', 'title', 'JSON Data: ' + obj.uuid);
        $dialog.find('.data').html(json);
        $dialog.dialog('open');
    }

    function prettyJson(obj) {
        var json = JSON.stringify(obj, null, 4);
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function buildTable(data) {
        var rows = data.data.rows,
        len = data.data.row_count;

        $table.empty();

        for(var id in rows) {
            if(!rows.hasOwnProperty(id)) continue;

            updateRow({ uuid: id, data: rows[id] });
        }
    }

    function updateRow(data) {
        var $row = $('#' + data.uuid),
        row = data.data;

        //new row, create it
        if($row.length === 0) {
            $row = $('<tr/>', { id: data.uuid }).data('obj', row);

            $row.append('<td class="id">' + data.uuid + '</td>');
            $row.append('<td class="direction">' + row.direction + '</td>');
            $row.append('<td class="created">' + row.created + '</td>');
            $row.append('<td class="name">' + row.name + '</td>');
            $row.append('<td class="state">' + row.state + '</td>');
            $row.append('<td class="callstate">' + row.callstate + '</td>');
            $row.append('<td class="cid">' + row.cid_name + '<br/>' + row.cid_num + '</td>');
            $row.append('<td class="app">' + row.application + '</td>');
            $row.append('<td class="read">' + row.read_codec + '<br/>rate: ' + row.read_rate + '<br/>bit-rate: ' + 
                        row.read_bit_rate + '</td>');
            $row.append('<td class="write">' + row.write_codec + '<br/>rate: ' + row.write_rate + '<br/>bit-rate: ' + 
                        row.write_bit_rate + '</td>');
            $row.append('<td class="host">' + row.hostname + '</td>');
            $row.append('<td class="callid">' + row.call_uuid + '</td>');

            $table.append($row);            
        }
        //row exists, update it
        else {
            $row.data('obj', row);

            $row.find('.direction').text(row.direction);
            $row.find('.created').text(row.created);
            $row.find('.name').text(row.name);
            $row.find('.state').text(row.state);
            $row.find('.callstate').text(row.callstate);
            $row.find('.cid').html(row.cid_name + '<br/>' + row.cid_num);
            $row.find('.app').text(row.application);
            $row.find('.read').html(row.read_codec + '<br/>rate: ' + row.read_rate + '<br/>bit-rate: ' +
                                    row.read_bit_rate);
            $row.find('.write').text(row.write_codec + '<br/>rate: ' + row.write_rate + '<br/>bit-rate: ' +
                                     row.write_bit_rate);
            $row.find('.host').text(row.hostname);
            $row.find('.callid').text(row.call_uuid);
        }
    }
})(jQuery, window);