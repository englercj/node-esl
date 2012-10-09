(function($, window, undefined) {
    var socket = io.connect(),
    $msg, $table, method;

    //DOM ready
    $(function() {
	$msg = $('#message');
	$table = $('#channels > tbody');

	$('#actions').buttonset();

	method = 'poll';

	$('.method').on('click', function() {
	    method = this.id;

	    $table.empty();

	    socket.emit('change-method', method, function() {
		showMessage('Method changed to: ' + method);
	    });
	});

	socket.emit('setup', method, function() {
	    showMessage('Method set to: ' + method);
	});

	socket.on('data', function(data) {
	    console.log('Data:', data);
	    //complete table redraw
	    if(data.uuid === null) {
		buildTable(data);
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

	$msg.text(msg).addClass(type || 'good').stop(true).show().delay(2000).fadeOut(1000);
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
	    $row = $('<tr/>', { id: data.uuid });

	    $row.append('<td class="id">' + data.uuid + '</td>');
	    $row.append('<td class="direction">' + row.direction + '</td>');
	    $row.append('<td class="created">' + row.created + '</td>');
	    $row.append('<td class="name">' + row.name + '</td>');
	    $row.append('<td class="state">' + row.state + '</td>');
	    $row.append('<td class="callstate">' + row.callstate + '</td>');
	    $row.append('<td class="cid">' + row.cid_name + '(' + row.cid_num + ')</td>');
	    $row.append('<td class="app">' + row.application + '</td>');
	    $row.append('<td class="read">' + row.read_codec + '(rate: ' + row.read_rate + ', bit-rate: ' + 
			row.read_bit_rate + ')</td>');
	    $row.append('<td class="write">' + row.write_codec + '(rate: ' + row.write_rate + ', bit-rate: ' + 
			row.write_bit_rate + ')</td>');
	    $row.append('<td class="host">' + row.hostname + '</td>');
	    $row.append('<td class="callid">' + row.call_uuid + '</td>');

	    $table.append($row);	    
	}
	//row exists, update it
	else {
	    $row.find('.direction').text(row.direction);
	    $row.find('.created').text(row.created);
	    $row.find('.name').text(row.name);
	    $row.find('.state').text(row.state);
	    $row.find('.callstate').text(row.callstate);
	    $row.find('.cid').text(row.cid_name + '(' + row.cid_num + ')');
	    $row.find('.app').text(row.application);
	    $row.find('.read').text(row.read_codec + '(rate: ' + row.read_rate + ', bit-rate: ' +
				    row.read_bit_rate + ')');
	    $row.find('.write').text(row.write_codec + '(rate: ' + row.write_rate + ', bit-rate: ' +
				     row.write_bit_rate + ')');
	    $row.find('.host').text(row.hostname);
	    $row.find('.callid').text(row.call_uuid);
	}
    }
})(jQuery, window);