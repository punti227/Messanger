const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const http = require('http');
const socketio = require('socket.io');
const cookieParser = require('cookie-parser'); 

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

const backendUrl = 'http://pfefan.ddns.net:25565';
let token;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//app.use('/style', express.static(path.join(__dirname, 'style')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const response = await axios.post(`${backendUrl}/register`, req.body, { withCredentials: true });
        if (response.data.message === 'Registered successfully') {
            res.redirect('/login');
        }
    } catch (error) {
        res.send(error.response.data);
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const response = await axios.post(`${backendUrl}/login`, req.body, { withCredentials: true });
        if (response.data.message == "Logged in successfully") {
            token = response.data.token; 
            res.cookie('token', token, { httpOnly: true });
            res.redirect('/chat');
        }
    } catch (error) {
        if (error.response) {
            res.send(error.response.data);
        } else {
            console.error('Error:', error.message);
            res.send({ error: 'An error occurred while making the request.' });
        }
    }
});


app.get('/logout', async (req, res) => {
    try {
        const response = await axios.get(`${backendUrl}/logout`, { withCredentials: true });  // Send cookies
        res.send(response.data);
    } catch (error) {
        res.send(error.response.data);
    }
});

app.get('/chat', (req, res) => {
    res.render('chat');
});

io.on('connection', (socket) => {
    socket.on('checkUser', async (username) => {
        try {
            const response = await axios.post(`${backendUrl}/checkuser`, { username }, { 
                headers: { 'x-access-token': token },
                withCredentials: true 
            });
            if (response.data.message === 'True') {
                socket.emit('userValid', true);
            } else {
                socket.emit('userValid', false);
            }
        } catch (error) {
            socket.emit('error', error.response ? error.response.data : error.message);
        }
    });

    socket.on('sendMessage', async (data) => {
        try {
            const response = await axios.post(`${backendUrl}/send_message`, data, { 
                headers: { 'x-access-token': token },
                withCredentials: true 
            });
            io.emit('message', response.data);
        } catch (error) {
            io.emit('error', error.response ? error.response.data : error.message);
        }
    });

    socket.on('getMessages', async (data) => {
        try {
            const response = await axios.post(`${backendUrl}/get_messages`, data, { 
                headers: { 'x-access-token': token },
                withCredentials: true 
            }); 
            io.emit('messages', response.data.messages);
        } catch (error) {
            io.emit('error', error.response ? error.response.data : error.message);
        }
    });
    
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server started on port ${port}`));
