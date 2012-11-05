var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

app.configure(function(){
  app.use(express.static(__dirname + '/views'));
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

var usernames = {};
var roomnames = {};
var privateRooms = [];

io.sockets.on('connection', function(socket){
  
  socket.on('addUser', function(username){
    if (username in usernames){
      io.sockets.emit('alertDuplicateUsername', username);
    } else {
      socket.username = username;
      usernames[username] = username;
      io.sockets.emit('updateUsers', usernames, username);
    }
  });
   
  socket.on('fetchRooms', function(){
    io.sockets.emit('updateRooms', roomnames);
  });
  
  socket.on('createRoom', function(roomname){
    if (roomname in roomnames){
      io.sockets.emit('alertDuplicateRoomname', roomname);
    } else {
      roomnames[roomname] = [socket.username];
      io.sockets.emit('updateRooms', roomnames, socket.username);
      io.sockets.emit('updateUsersInRoom', roomname, roomnames[roomname], socket.username);
    }
  });
    
  socket.on('sendChat', function(roomname, data, media){
    io.sockets.emit('updateChat', roomname, socket.username, data, media);
  });
  
  socket.on('joinRoom', function(roomname){
    var user_exists = false;
    for (var i = 0; i < roomnames[roomname].length; i++){
      if (roomnames[roomname][i] === socket.username){
        user_exists = true;
      }
    }
    if (user_exists === false){
      roomnames[roomname].push(socket.username);
      io.sockets.emit('updateUsersInRoom', roomname, roomnames[roomname]);
    }
  });
  
  socket.on('leaveRoom', function(roomname){
    leaveRoom(roomname);
  });
  
  socket.on('disconnect', function(){
    delete usernames[socket.username];
    for (var key in roomnames){
      leaveRoom(key);
    }
    io.sockets.emit('updateUsers', usernames);
  });
  
  function leaveRoom(roomname){
    var remaining_users = [];
    for (var key in roomnames[roomname]){
      if (roomnames[roomname][key] != socket.username){
        remaining_users.push(roomnames[roomname][key]);
      }
    }
    roomnames[roomname] = remaining_users;
    if (roomnames[roomname].length < 1){
      delete roomnames[roomname];
      io.sockets.emit('updateRooms', roomnames);
    }
    io.sockets.emit('updateUsersInRoom', roomname, roomnames[roomname]);
  }
  
});