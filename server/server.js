var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8080);

io.on('connection', function (socket) {
    socket.on('join', function (data) {
        socket.join(data.roomId);
        socket.room = data.roomId;
        const sockets = io.of('/').in().adapter.rooms[data.roomId];
        if(sockets.length===1){
            // Initializing room if only 1 individual
            socket.emit('init')
        }else{
            // Here we are only limiting to 2 individuals
            if (sockets.length===2){
                io.to(data.roomId).emit('ready')
            }else{
                // Specifying that room is full
                socket.room = null
                socket.leave(data.roomId)
                socket.emit('full')
            }
            
        }
    });

    socket.on('signal', (data) => {
        // Sending to everyone in the room except the sender
        io.to(data.room).emit('desc', data.desc)        
    })

    socket.on('disconnect', () => {
        // Checking to see if socket is in any rooms, if so then send disconnected too all
        // users in the room.
        if (socket.room){
            io.to(socket.room).emit('disconnected')
        }
        
    })

    // socket.on('chat', function(data){
    //     console.log("Incomming")
    //     io.sockets.emit('chat', data)
    // })

});
