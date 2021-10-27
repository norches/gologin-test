const net = require('net');
const client = new net.Socket();
const port = 3000;
const host = '127.0.0.1';

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let sessionId;
let sessionUuid;
let currentUser;

client.connect(port, host, () => {
    let requestBody = {
        command: 'hello'
    }

    client.write(JSON.stringify(requestBody));

    client.on('data', (data) => {
        const jsonData = JSON.parse(data);

        if (jsonData.command === 'hello') {
            sessionId = jsonData.id;
        }

        if (jsonData.command === 'login') {
            if (jsonData.status === 'ok') {
                console.log('Успешная авторизация! \n Добро пожаловать, ' + jsonData.user.name + '\n');
                sessionUuid = jsonData.session;
                currentUser = jsonData.user;
            } else {
                console.log('Ошибка авторизации: ' + jsonData.message + '\n');
            }
        }

        if (jsonData.command === 'message_reply') {
            if (jsonData.status === 'ok') {
                // Message sent, nothing to do...
            } else {
                console.log('Сообщение не отправлено:' + jsonData.message + '\n');
            }
        }

        if (jsonData.command === 'message') {
            if (jsonData.session === sessionUuid) {
                console.log(`
                    ${jsonData.sender_login}(${jsonData.sender_name}) пишет:
                        ${jsonData.body}
                `)
            } else {
                console.log('Что то пошло не так на сервере, либо вы пытаетесь реализовать "Man in the Middle attack" \n')
            }
        }

        if (jsonData.command === 'logout_reply') {
            if (jsonData.status === 'ok') {
                sessionUuid = null;
                console.log('Вы успешно логаутнулись. \n')
            } else {
                console.log('Вы не авторизированы')
            }
        }

        if (jsonData.command === 'ping_reply') {
            if (jsonData.status === 'ok') {
                console.log(`Соединение успешно. \n`)
            } else {
                console.log('Вы не авторизированы')
            }
        }
    });

    client.on('close', () => {
        console.log('Connection closed');
    });
});

const authRegex = /\/(?:auth)\s([a-zA-Z0-9]+)\s([a-zA-Z0-9]+)/
const sendRegex = /\/(?:send)\s(.*)/

rl.write('Введите команду (/help выводит список всех команд): \n');
rl.prompt();
rl.on('line', (input) => {
    if (input === '/help') {
        console.log(`
            Список доступных команд:
            == /auth <login> <password> - авторизация в системе
            == /send <message> - Отправить сообщение в чат
            == /ping - Проверить соединение
            == /logout - Выйти из аккаунта
            == /exit - выйти из чата
        `);
    } else if (authRegex.test(input)) {
        const match = input.match(authRegex);
        const argLogin = match[1];
        const argPassword = match[2];

        if (!sessionUuid) {
            client.write(JSON.stringify({
                id: sessionId,
                command: 'login',
                login: argLogin,
                password: argPassword
                })
            )
        } else {
            console.log('Вы уже авторизированы под именем ' + currentUser.name + '\n');
        }
    } else if (sendRegex.test(input)) {
        const match = input.match(sendRegex)
        messageBody = match[1]
        client.write(JSON.stringify({
            id: sessionId,
            command: 'message',
            body: messageBody,
            session: sessionUuid
        }))
    } else if(input === '/ping') {
        client.write(JSON.stringify({
            id: sessionId,
            command: 'ping',
            session: sessionUuid
        }))
    } else if (input === '/logout') {
        client.write(JSON.stringify({
            id: sessionId,
            command: 'logout',
            session: sessionUuid
        }))
    } else if(input === '/exit') {
        client.destroy();
        rl.close();
        return
    } else {
        console.log('Неизвестная команда, введите /help что бы увидеть список команд \n');
    }
    rl.prompt();
});
