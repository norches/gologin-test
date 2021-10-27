const net = require('net');
const client = new net.Socket();
const port = 3000;
const host = '127.0.0.1';
client.connect(port, host, () => {
    console.log('Connected');
    client.write("Hello From Client " + client.address().address);

    client.on('data', (data) => {
        console.log('Server Says : ' + data);
    });

    client.on('close', () => {
        console.log('Connection closed');
    });
});