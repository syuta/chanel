//////////////////////////////////////////
//
// WebSocket処理のクライアントJSファイル
//
//////////////////////////////////////////


//var socket = new io.Socket("192.168.1.39",{port:8080}); 
var socket = new io.Socket("localhost",{port:8080}); 

socket.connect();

//接続時
socket.on('connect', function(){
	      socket.send(
		  JSON.stringify({
				     action:"update",
				     chanel:$('#chanel').val()
				 }));
	  });

$('#chanel').change(
    function(){
	socket.send(
	    JSON.stringify({
			       action:"update",
			       chanel:$('#chanel').val()
			   }));
    });

//データ受信ハンドラ　dataは受信データ
socket.on('message', function(data){
	      $('#chatLog').prepend(JSON.parse(data).message+"<br>");
	  });

//サーバーからの切断時に実行されるハンドラ
socket.on('disconnect', 
	  function(){
	      alert("disconnect from server");
	  });


$('#postBtn').click(
    function(){
	socket.send(
	    JSON.stringify({
			       action:"post",
			       message:$('#message').val().replace(/</g, "&lt;").replace(/>/g, "&gt;"),
			       chanel:$('#chanel').val()
			   }));
	$('#message').val('');
    });

