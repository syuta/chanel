//////////////////////////////////////////
//
// 必要データのインポート
//
//////////////////////////////////////////

var io = require('socket.io');
var express = require('express');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

/**
 * broadcast フィルター実装のためにちょっと修正
 */
io.Listener.prototype.broadcast = function(message, except, atts){
  for (var i = 0, k = Object.keys(this.clients), l = k.length; i < l; i++){
    if (!except || ((typeof except == 'number' || typeof except == 'string') && k[i] != except)
                || (Array.isArray(except) && except.indexOf(k[i]) == -1)){

	var sendFlag = true;
	for(var j in atts) {
	    if(atts[j] === this.clients[k[i]].sessionId) {
		sendFlag = false;
		break;
	    }
	}

	if(sendFlag) {
	    console.log("send message to " + this.clients[k[i]].sessionId);
	    this.clients[k[i]].send(message, atts);
	} else {
	    console.log("not send message to " + this.clients[k[i]].sessionId);
	}
    }
  }
  return this;
};

var port_local = 8080;

////////////////////////////////////////////////////////
//  
//  from http://d.hatena.ne.jp/Jxck/20101022/1287765155
//  
////////////////////////////////////////////////////////
var load_static_file = function(uri, response) {

    var tmp = uri.split('.');
    var type = tmp[tmp.length - 1];
    var filename = path.join(process.cwd(), uri);

    path.exists(filename, function(exists) {
        if (!exists) {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.write('404 Not Found\n');
            response.end();
            return;
        }

        fs.readFile(filename, 'binary', function(err, file) {
            if (err) {
                response.writeHead(500, {'Content-Type': 'text/plain'});
                response.write(err + '\n');
                response.end();
                return;
            }

            switch (type) {
            case 'html':
                response.writeHead(200, {'Content-Type': 'text/html'});
                break;
            case 'js':
                response.writeHead(200, {'Content-Type': 'text/javascript'});
                break;
            case 'css':
                response.writeHead(200, {'Content-Type': 'text/css'});
                break;
            }
            response.write(file, 'binary');
            response.end();
        });
    });
};


///////////////////////////////////////////
// running server
///////////////////////////////////////////
var server = http.createServer(
    function(req, res) {
	var uri = url.parse(req.url).pathname;
	load_static_file(uri, res);

    });

server.listen(process.env.PORT || port_local);
console.log("server is running.");



//////////////////////////////////////////
//
// チャネルオブジェクト定義
//
//////////////////////////////////////////
var Chanel = function(chanelId) {
    //自分のチャネルID
    this.chanelId = chanelId;
    //接続ユーザーを入れる配列
    this.userArray = new Array();
    
};


/**
 * 対象ユーザーが接続しているかしらべる
 */
Chanel.prototype.isUser = function(sessionId) {
  var exists = false;
  for(var i in this.userArray) {
      if(this.userArray[i] === sessionId) {
	  exists = true;
      }
      
  }
  return exists; 
};

/**
 * 対象ユーザーを削除する
 * @param sessionId ユーザーセッションID
 */
Chanel.prototype.deleteUser = function(sessionId) {
  for(var i in this.userArray) {
      if(this.userArray[i] === sessionId) {
	  delete this.userArray[i];
	  console.log(sessionId + "is deleted.");
      }
  }

};

/**
 * 対象ユーザーを追加する
 * @param sessionId ユーザーセッションID
 */
Chanel.prototype.addUser = function(sessionId) {
    this.userArray.push(sessionId);
};

//////////////////////////////////////////
//
// チャネル管理オブジェクト定義
//
//////////////////////////////////////////
var ChanelManager = function() {
    //チャネルを入れる配列
    this.chanelArray = new Array();
    
};

/**
 * チャネルが存在するかどうかチェックする.
 * @param chanelId チャネルID
 */
ChanelManager.prototype.isChanel = function(chanelId) {
  var exists = false;
  for(var i in this.chanelArray) {
      if(this.chanelArray[i].chanelId === chanelId) {
	  exists = true;
      }
      
  }
  return exists; 
};

/**
 * チャネルを取得.
 * @param chanelId チャネルID
 */
ChanelManager.prototype.getChanel = function(chanelId) {
    var chanel = null;
    for(var i in this.chanelArray) {
	if(this.chanelArray[i].chanelId === chanelId) {
	    chanel = this.chanelArray[i];
	    break;
	}
    }
    return chanel; 
};


/**
 * チャネルを追加
 * @param chanel チャネルオブジェクト
 */
ChanelManager.prototype.addChanel = function(chanel) {
    if(this.isChanel(chanel)) {
	console.log(chanel.chanelId + "is already exists.");
    } else {
	this.chanelArray.push(chanel);
    }
};
/**
 * チャネルを削除
 * @param chanelId チャネルID
 */
ChanelManager.prototype.deleteChanel = function(chanelId) {
  for(var i in this.chanelArray) {
      if(this.chanelArray[i].chanelId === chanelId) {
	  delete this.chanelArray[i];
	  console.log(chanelId + "is deleted.");
      }
  }
};

/**
 *  ユーザーを指定したチャネルに追加する.それ以外のチャネルから削除するのも可能.
 *  @param chanel ユーザーを追加するチャネル
 *  @param sessionId 追加するユーザーのsessionId
 *  @param singleFlag true=他に登録されているチャネルからsessionIdを削除する
 */
ChanelManager.prototype.addUser = function(chanel,sessionId,singleFlag) {
    //対象のチャネルにすでに登録されていたらなにもしない
    if(chanel.isUser(sessionId)){
	console.log(sessionId + "is already in " + chanel.chanelId);
	return;
    }

    //追加
    for(var i in this.chanelArray) {
	if(this.chanelArray[i].chanelId === chanel.chanelId) {
	    console.log(sessionId + "is added");
	    chanel.addUser(sessionId);
	}
    }

    //もしsingleFalg=trueなら、いま追加した以外のチャネルからIDを削除
    if(singleFlag) {

	for(var j in this.chanelArray) {
	    if(this.chanelArray[j].chanelId !== chanel.chanelId) {
		console.log(sessionId + "is deleted from " + this.chanelArray[j].chanelId);
		this.chanelArray[j].deleteUser(sessionId);
	    }
	}
    }  
};

/**
 * 対象のチャネルのユーザー一覧を取得する.
 * @param chanelId チャネルID
 */
ChanelManager.prototype.getChanelUser = function(chanelId) {
    var chanelUser = null;
    for(var i in this.chanelArray) {
	if(this.chanelArray[i].chanelId === chanelId) {
	    chanelUser = this.chanelArray[i].userArray;
	}
    }
    return chanelUser;
};

/**
 * 対象のチャネル以外のユーザー一覧を取得する.
 * @param chanelId チャネルID
 */
ChanelManager.prototype.getExceptChanelUser = function(chanelId) {
    var chanelUser = new Array();
    for(var i in this.chanelArray) {
	if(this.chanelArray[i].chanelId !== chanelId) {
	    chanelUser = chanelUser.concat(this.chanelArray[i].userArray);
	}
    }
    return chanelUser;
};




var chanelManager =  new ChanelManager();


//////////////////////////////////////////
//
// WebSocket設定
//
//////////////////////////////////////////
var sio = io.listen(server);   
sio.on('connection', function(client) { 	

        // Message受信時のハンドラ
        client.on(
	    'message',
	    function(message){
		var data = JSON.parse(message);
		console.log("id =" + client.sessionId);
		
		if(data.action === "post") {
		    //メッセージ投稿
		    var chanelId = data.chanel;
		    var expectChanelUser = chanelManager.getExceptChanelUser(chanelId);
		    client.send(message); 
		    client.broadcast(message,expectChanelUser);


		} else if (data.action === "update") {
		    //接続時、チャネル変更時
		    var chanelId = data.chanel;
		    if(chanelManager.isChanel(chanelId)){
			console.log("chalelはすでにある");
			var chanel = chanelManager.getChanel(chanelId);
			chanelManager.addUser(chanel,client.sessionId,true);
		    } else {
			console.log("chalelはないのでつくる");
			var chanel = new Chanel(chanelId);
			chanelManager.addChanel(chanel);
			chanelManager.addUser(chanel,client.sessionId,true);
		    }
		    
		}

            });

        // クライアント切断時のハンドラ
        client.on('disconnect', function(){
                client.broadcast(JSON.stringify(
				     {status:"disconnect",
				      id:client.sessionId}));
        });


 });