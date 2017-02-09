const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const serverName = 'server';

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);
console.log(`listening on 127.0.0.1:${port}`);

const io = socketio(app);
const users = {};

const onJoined = (sock) => {
  const socket = sock;
  socket.on('join', (data) => {
    const joinMsg = {
      name: serverName,
      msg: `There are ${Object.keys(users).length} other users online`,
    };

    socket.name = data.name;
    users[socket.name] = socket.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: serverName,
      msg: `${data.name} has joined the room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);

    socket.emit('msg', { name: serverName, msg: 'you joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;
  socket.on('msgToServer', (data) => {
    let message = '';
    if (data.msg.indexOf('/roll') !== -1) {
      let diceString = '';
      if (data.msg.indexOf('d') !== -1) {
        let dieNum = data.msg.indexOf('d') - 1;
        let sidesNum = data.msg.indexOf('d') + 1;
        const dieString = data.msg.charAt(dieNum);
        const sideString = data.msg.charAt(sidesNum);
        sidesNum = parseInt(sideString, 10);
        dieNum = parseInt(dieString, 10);
        for (let i = 0; i < dieNum; i++) {
          if (i > 0) {
            diceString += ',';
          }
          const d1 = Math.floor(Math.random() * sidesNum) + 1;
          diceString += d1.toString();
        }
        message = `rolled ${dieString}d${sideString} and got ${diceString}`;
        io.sockets.in('room1').emit('msg', { name: data.name, msg: message });
        return;
      }

      socket.emit('msg', { name: data.name, msg: 'use the syntax /roll #d#' });
      return;
    }
    //finish
    if (data.msg.indexOf('/time') !== -1) {
      const d = new Date();
      const dateString = `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
      message = `the time is: ${dateString}`;
      socket.emit('msg', { name: data.name, msg: message });
      return;
    }
    if (data.msg.indexOf('me') !== -1) {
      const str = data.msg;
      if (str.indexOf('dance') !== -1) {
        message = `${data.name} dances`;
        io.sockets.in('room1').emit('msg', { name: data.name, msg: message });
        return;
      }
      if (str.indexOf('wave') !== -1) {
        message = `${data.name} waves`;
        io.sockets.in('room1').emit('msg', { name: data.name, msg: message });
        return;
      }
      if (str.indexOf('laugh') !== -1) {
        message = `${data.name} laughs`;
        io.sockets.in('room1').emit('msg', { name: data.name, msg: message });
        return;
      }

      socket.emit('msg', { name: data.name, msg: 'invalid command' });
      return;
    }
    //finish
    if (data.msg === '/help') {
      const commands = ['/time', '/roll', '/me wave', '/me laugh', '/me dance'];
      message = 'Here are the chat commands: ';
      socket.emit('msg', { name: data.name, msg: message });
      let i = 0;
      for (i = 0; i < commands.length; i++) {
        message = commands[i];
        socket.emit('msg', { name: data.name, msg: message });
      }
      return;
    }

    io.sockets.in('room1').emit('msg', { name: data.name, msg: data.msg });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;
  socket.on('disconnect', () => {
    socket.broadcast.to('room1').emit('msg', { name: 'server', msg: `${socket.name} has left the room.` });
    socket.leave('room1');
    delete users[socket.name];
  });
};

io.sockets.on('connection', (socket) => {
  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});
