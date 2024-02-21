/* Connect node modules */

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* DB table model */
const Users = require('./db_modules/Users');
const Tasks = require('./db_modules/Tasks');
const Goals = require('./db_modules/Goals');


/* Create server */

const PORT = 10000;
app.listen(PORT, () => {
    console.log('Server listening on port: ' + PORT);
});


/* Connect to database */

const URL = process.env.DB_CONNECTION || 'mongodb://localhost:27017/naptask';

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

    return `${encryptedData}`
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

const scheduleArrayTest = [
    {
        schedule_title: "Week 1",
        schedule_body: {
            mon: [
                {
                    task_title: "Math",
                    timeStart: "08:15",
                    timeEnd: "09:00"
                },
                {
                    task_title: "Math",
                    timeStart: "08:15",
                    timeEnd: "09:00"
                }
            ],
            tue: [],
            wed: [],
            thu: [],
            fri: [],
            sat: [],
            sun: []
        }
    }
]

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
                console.log(item)
                item.tasks.map((element, index) => {
                    element.title = decryptData(element._doc.title)
                })
                res
                    .status(200)
                    .json(item ? item : JSON.stringify({}));
            })
            .catch(error => console.log(error));
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

        console.log(id.split(','));

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

        let item_id = 'yt';

        addItem
            .save()
            .then((added) => {
                Users
                    .findByIdAndUpdate(user_id, {
                        $push: {
                            tasks: added._id
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

    Users
        .create(newUser)
        .then(result => res.json(result))
        .catch(error => console.log(error));

})


/* Tasks routers */

const tasks = new TasksGoalsManager('tasks', Tasks);

app.get('/task', (req, res) => {
    tasks.getItem(req, res);
});

app.put('/task/edit/:id', (req, res) => {
    tasks.changeItem(res, req.params.id, encryptData(req.body));
});

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
    tasks.setItem(res, req.body);
});

