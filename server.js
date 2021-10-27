const net = require('net');
const port = 3000;
const host = '0.0.0.0';

const server = net.createServer();
server.listen(port, host, () => {
    console.log('Chat Server is running on port ' + port +'.');
})

let sockets = [];

server.on('connection', (sock) => {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    sockets.push(sock);

    sock.on('data', (data) => {
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // Write the data back to all the connected, the client will receive it as data from the server
        sockets.forEach(function(sock, index, array) {
            sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n');
        });
    });
    // Add a 'close' event handler to this instance of socket
    sock.on('close', (data) => {
        let index = sockets.findIndex( (o) => {
            return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });

    sock.on('error', (err) => {
        console.log('Something went wrong' + err);
    })
});