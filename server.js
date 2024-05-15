/* Connect node modules */

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: {
        origin: process.env.CLIENT_DOMAIN || 'http://localhost:3000',
        methods: ["GET", "POST"]
    }
});
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* DB table model */
const Users = require('./db_modules/Users');
const Tasks = require('./db_modules/Tasks');
const Goals = require('./db_modules/Goals');
const Schedules = require('./db_modules/Schedules');
const { error } = require('console');
const { types } = require('util');
const { v4: uuidv4 } = require('uuid');

const create_id = uuidv4();


/* Connect to database */

const URL = process.env.DB_CONNECTION || 'mongodb://localhost:27017/naptask'; //mongodb://localhost:27017/naptask

mongoose
    .connect(URL)
    .then(() => console.log('I\'m connected to DB (^_^)'))
    .catch(error => console.log(error))



/* Middleware */

const whitelist = ['https://naptask-frontend.vercel.app']; // assuming front-end application is running on localhost port 3000

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

app.use(cors(process.env.SERVER_DEPLOYED ? corsOptions : ''));
app.use(express.json());


/* Crypto setup */

const key_iv = JSON.parse(fs.readFileSync(`${__dirname}/key.json`));
const key = Buffer.from(key_iv.key, 'hex');
const iv = key_iv.iv;

/* Encrypt data */

const encryptData = (stringForEncrypt) => {

    let encryptedData = ''


    if (typeof stringForEncrypt === 'object') {
        Object.keys(stringForEncrypt).forEach(field => {
            if (field !== 'missed' && field !== 'done') {
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                encryptedFieldValue = cipher.update(stringForEncrypt[field], 'utf-8', 'hex');
                encryptedFieldValue += cipher.final('hex');
                stringForEncrypt[field] = encryptedFieldValue;
            }
        });

        return stringForEncrypt
    } else {
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        encryptedData = cipher.update(stringForEncrypt, 'utf-8', 'hex');
        encryptedData += cipher.final('hex');
    }

    return encryptedData
}
/* Decrypt data */

const decryptData = (stringForDecrypt) => {

    if (typeof stringForDecrypt.tasks === 'object' && stringForDecrypt !== null) {
        stringForDecrypt.tasks.toObject()
        stringForDecrypt._doc.tasks.forEach(object => {
            Object.keys(object._doc).forEach(field => {

                if (field !== '_id' && field !== 'collaborators' && field !== '__v' && field !== 'missed' && field !== 'done') {

                    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
                    let decryptedData = decipher.update(object._doc[field], 'hex', 'utf-8');
                    decryptedData += decipher.final('utf-8');
                    object[field] = decryptedData;
                }
            })
        });

        return stringForDecrypt
    } else {
        if (typeof stringForDecrypt !== 'undefined') {
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
            let decryptedData = decipher.update(stringForDecrypt, 'hex', 'utf-8');
            decryptedData += decipher.final('utf-8');
            return decryptedData
        }
    }
}


/* Routers */

/* Object for tasks-goals routers */

class TasksGoalsManager {
    constructor(editItem, table) {
        this.editItem = editItem;
        this.table = table;
    }

    getItem(req, res) {
        Users
            .findOne({ "_id": req.query.id })
            .populate(this.editItem)
            .select(this.editItem)
            .then((item) => {
                if (this.editItem === 'tasks') {
                    item.tasks.map((element, index) => {
                        element.title = decryptData(element._doc.title)
                    })
                }
                res
                    .status(200)
                    .json(item ? item : JSON.stringify({}));
            })
            .catch(error => console.error(error));
    }

    changeItem(res, id, data) {

        const EditedTable = this.table;

        EditedTable
            .findByIdAndUpdate(id, data)
            .then(result => {
                res
                    .status(200)
                    .json(result);
            })
            .catch(error => console.log(error))
    }

    deleteItem(res, id, user_id) {

        const EditedTable = this.table;

        EditedTable
            .deleteMany({ _id: { $in: id.split(',') } })
            .then(() => {
                Users
                    .findByIdAndUpdate(user_id, {
                        $pull: { tasks: { $in: id.split(',') } }
                    })
                    .catch(error => console.log(error));

                res.end()
            })
            .catch(error => console.log(error));
    }

    setItem(res, data, user_id) {

        const EditedTable = this.table;

        const addItem = new EditedTable(data);

        addItem
            .save()
            .then((added) => {
                Users
                    .findByIdAndUpdate(user_id, {
                        $push: {
                            [this.editItem]: added._id
                        }
                    })
                    .then()
                    .catch(error => console.log(error))

                res
                    .status(200)
                    .json(added)
            })
            .catch((error) => console.log(error));

    }
}


app.get('/', (req, res) => {
    res.end('This new update')
})
app.post('/login', (req, res) => {

    const query = req.body;

    const login = query.login;
    const password = encryptData(query.password);
    //countDocuments
    Users
        .find({
            login: login,
            password: password
        })
        .then((user) => {
            res
                .status(200)
                .json(user)
        })
        .catch(() => handleError(res, "Something goes wrong..."))
})

app.post('/signup', (req, res) => {

    const body = req.body;

    const newUser = {
        "login": `${body.login}`,
        "password": encryptData(`${body.password}`),
        "email": encryptData(`${body.email}`),
        "friends": [],
        "tasks": [],
        "goals": []
    };


    let setUser = () => {
        Users
            .create(newUser)
            .then(result => res.json(result))
            .catch(error => console.log(error));
    }

    Users
        .find({
            login: body.login
        })
        .then(result => {
            return result.length > 0 ? res.json('userExicted') : setUser()
        })
        .catch(error => console.error(error))
})


/* Tasks routers */

const tasks = new TasksGoalsManager('tasks', Tasks);

app.get('/task', (req, res) => {
    tasks.getItem(req, res);
});

app.put('/task/edit/:id', (req, res) => {
    const body = req.body;
    if (body.title) {
        body.title = encryptData(body.title)
    }
    tasks.changeItem(res, req.params.id, body);
});

app.put('/task/delete_user/:id', (req, res) => {

    const body = req.body;

    const { login, user_id } = body

    const id = req.params.id
    Tasks
        .findByIdAndUpdate(id, {
            $pull: { collaborators: login }
        })
        .catch(error => console.error(error))

    Users
        .findByIdAndUpdate(user_id, {
            $pull: { tasks: id }
        })
        .catch(error => console.log(error));
})

app.delete('/task/delete/:id', (req, res) => {
    tasks.deleteItem(res, req.params.id, req.body.user_id);
});

app.post('/task/add', (req, res) => {
    const user_id = req.body.user_id
    let body = req.body;

    body.title = encryptData(body.title)

    tasks.setItem(res, body, user_id);
});


/* Goals routers */

const goals = new TasksGoalsManager('goals', Goals);

app.get('/goal', (req, res) => {
    goals.getItem(res);
});

app.put('/goal/edit/:id', (req, res) => {
    goals.changeItem(res, req.params.id, req.body)
});

app.delete('/goal/delete/:id', (req, res) => {
    goals.deleteItem(res, req.params.id);
});

app.post('/goal/add', (req, res) => {
    goals.setItem(res, req.body);
});


/* Schedules routers */

const schedules = new TasksGoalsManager('schedules', Schedules);

app.get('/schedule', (req, res) => {
    schedules.getItem(req, res);
});

app.post('/schedules/add', (req, res) => {
    const user_id = req.body.user_id;
    let body = req.body;
    schedules.setItem(res, body, user_id);
});

app.put('/schedule/edit/:id', (req, res) => {
    schedules.changeItem(res, req.params.id, req.body);
});

app.delete('/schedule/delete/:id', (req, res) => {
    schedules.deleteItem(res, req.params.id, req.body.user_id);
});



app.post('/findUser', (req, res) => {

    const body = req.body;

    const searchUser = body.user_name;

    Users
        .find({ login: { $regex: searchUser, $options: 'i' } })
        .select('login')
        .then(result => res.json(result))
        .catch(error => { console.error(error); res.json({}) });
})



app.get('/getNotification/:id', (req, res) => {
    const id = req.params.id;

    Users
        .findById(id)
        .select('notification')
        .then(result => res.json(result))
        .catch(error => {
            console.error(error)
            res.json({})
        })
})

app.post('/sendInvite', (req, res) => {
})

app.put('/updateCollaborators', (req, res) => {

    const { id, login, task_id } = req.body;

    console.log(id)

    Users
        .updateMany({ login: { $in: login } }, {
            $addToSet: { tasks: task_id },
            $pull: { notification: { id: id } }
        })
        .catch(error => console.error(error));

    Tasks
        .findByIdAndUpdate(task_id, { $addToSet: { collaborators: { $each: login } } })
        .catch(error => console.error(error))


    res.json({})
})


/* SocketIO connection */
io.on('connection', (socket) => {

    socket.on('connected', (task_id) => {
        Tasks
            .findById(task_id)
            .select('chat')
            .then(result => socket.emit('recieve_messege', result.chat))
            .catch(error => console.log(error))
    })

    socket.on('send_message', (data) => {
        const { task_id, from, message, timestamp } = data;

        const updateData = { from, message, timestamp }

        Tasks
            .findByIdAndUpdate(task_id, { $push: { chat: updateData } })
            .catch(error => console.log(error))

        Tasks
            .findById(task_id)
            .select('chat')
            .then(result => socket.emit('recieve_messege', result.chat))
            .catch(error => console.log(error))
    })

    socket.on('delete_message', ({ id, message }) => {

        Tasks
            .findByIdAndUpdate(id, { $pull: { chat: message } })
            .catch(error => console.log(error))

        Tasks
            .findById(id)
            .select('chat')
            .then(result => socket.emit('recieve_messege', result.chat))
            .catch(error => console.log(error))
    })

    socket.on('edit_message', ({ id, message_id, message }) => {

        Tasks
            .updateOne({ _id: id, "chat._id": message_id }, { $set: { 'chat.$': message } })
            .then(() => {
                Tasks
                    .findById(id)
                    .select('chat')
                    .then(result => socket.emit('recieve_messege', result.chat))
                    .catch(error => console.log(error))
            })
            .catch(error => console.error(error))

    })





    socket.on('send_invite', (data) => {

        const { login, task_info, task_id, user_creator } = data

        const { title, date, startTime } = task_info;

        const send_notification = {
            type: "invite",
            title, date, startTime, task_id, user_creator
        }

        Users
            .updateMany({ login: { $in: login } }, { $addToSet: { notification: send_notification } })
            /* .then((result) => socket.emit("get_notification")) */
            .catch(error => { console.log(error) })
    })

    socket.on('get_notification', (id) => {
        Users
            .findById(id)
            .select('notification')
            .then(result => {
                //console.log(result);
                socket.emit('get', result.notification)
            })
            .catch(error => console.log(error))
    })
})



/* Create server */

const PORT = 10000;
http.listen(PORT, () => {
    console.log('Server listening on port: ' + PORT);
});