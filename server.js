const net = require('net');
const port = 3000;
const host = '0.0.0.0';

const uuid = require('./utils/uuid.js');

const server = net.createServer();
server.listen(port, host, () => {
    console.log('Chat Server is running on port ' + port + '.');
})

const users = require('./db/users.json');

let sockets = [];

let sessions = [];
let sessionCounter = 0;
let messagesCounter = 0;

let history = [];

server.on('connection', (sock) => {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    sessionCounter += 1;
    sock.id = sessionCounter;
    sockets.push(sock);

    //sending over an ID
    sock.write(JSON.stringify({ id: sessionCounter, command: 'hello' }))

    sock.on('data', (data) => {
        const jsonData = JSON.parse(data);
        let response
        if (jsonData.id) {
            response = { id: jsonData.id };
        }

        const publishMessage = (message) => {
            console.log('ob to be published', message);
            sockets.forEach((sock, index, array) => {
                console.log(sock.id);
                const _sender = users.find(el => el.id === message.sender_id)
                console.log(_sender);
                response = {
                    id: sock.id,
                    command: 'message',
                    body: message.body,
                    sender_login: _sender.login,
                    sender_name: _sender.name,
                    session: sessions.find(el => el.session_id === sock.id)?.session_key           
                }
                sock.write(JSON.stringify(response));
            });
        }

        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        if (jsonData.command === 'login') {
            response = {
                ...response,
                command: 'login'
            }
            for (const user of users) {
                if (jsonData.login === user.login) {
                    if (jsonData.password === user.password) {
                        const _uuid = uuid();
                        response = {
                            ...response,
                            status:'ok',
                            session: _uuid,
                            user: {
                                id: user.id,
                                name: user.name
                            }
                        }
                        sessions.push({
                            session_id: jsonData.id,
                            session_key: _uuid,
                            user_id: user.id
                        });
                        break
                    } else {
                        response = {
                            ...response,
                            status: 'failed',
                            message: 'Неверный пароль'
                        }
                        break
                    }
                }
            }
            if (!response.session && !response.message) {
                response = {
                    ...response,
                    status: 'failed',
                    message: 'Не найден пользователь'
                }
            }
            sock.write(JSON.stringify(response))
        }
        if (jsonData.command === 'message') {
            response = {
                ...response,
                id: jsonData.id,
                command: 'message_reply'
            }
            if (sessions.findIndex(el => el.session_key === jsonData.session) !== -1) {
                messagesCounter += 1;
                const session = sessions.find(el => el.session_key === jsonData.session)
                const user = users.find(el => el.id === session.user_id);
                response = {
                    ...response,
                    status: 'ok',
                    message_id: messagesCounter,
                }
                const _message = {
                    body: jsonData.body,
                    message_id: messagesCounter,
                    sender_id: user.id,
                    session: jsonData.session
                }
                history.push(_message);
                publishMessage(_message);
            } else {
                response = {
                    ...response,
                    status: 'failed',
                    message: 'Вы не авторизованы, чтобы отправлять сообщения сначала авторизируйтесь'
                }
                sock.write(JSON.stringify(response))
            }
        }
        if (jsonData.command === 'logout') {
            const sessionIndex = sessions.findIndex(el => el.session_key === jsonData.session)
            if (sessionIndex !== -1) {
                sessions.splice(sessionIndex, 1)
                response = {
                    ...response,
                    command: 'logout_reply',
                    status: 'ok'
                }
            } else {
                response = {
                    ...response,
                    command: 'logout_reply',
                    status: 'failed',
                    message: 'Вы не авторизированы!'
                }
            }
        }

        if (jsonData.command === 'ping') {
            const sessionIndex = sessions.findIndex(el => el.session_key === jsonData.session)
            if (sessionIndex !== -1) {
                sessions.splice(sessionIndex, 1)
                response = {
                    ...response,
                    command: 'ping_reply',
                    status: 'ok',
                }
            } else {
                response = {
                    ...response,
                    command: 'ping_reply',
                    status: 'failed',
                    message: 'Вы не авторизированы!'
                }
            }
        }
    });
    // Add a 'close' event handler to this instance of socket
    sock.on('close', (data) => {
        let index = sockets.findIndex(el => {
            return el.remoteAddress === sock.remoteAddress && el.remotePort === sock.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });

    sock.on('error', (err) => {
        console.log('Something went wrong' + err);
    })
});