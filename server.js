/* Connect node modules */

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');

/* DB table model */
const Users = require('./db_modules/Users');
const Tasks = require('./db_modules/Tasks');
const Goals = require('./db_modules/Goals');


/* Create server */

const PORT = 3001;
app.listen(PORT, () => {
    console.log('Server listening on port: ' + PORT);
});


/* Connect to database */

const URL = 'mongodb+srv://naptaskmakeyourday:Esjq3GwuPRt6u79c@cluster0.9uvueow.mongodb.net/naptask?retryWrites=true&w=majority';

mongoose
    .connect(URL)
    .then(() => console.log('I\'m connected to DB (^_^)'))
    .catch(error => console.log(error))

console.log(URL)



/* Middleware */

app.use(express.json());
app.use(cors())


/* Crypto setup */

const key_iv = JSON.parse(fs.readFileSync(`${__dirname}/key.json`));
const key = Buffer.from(key_iv.key, 'hex');
const iv = key_iv.iv;

/* Encrypt data */

const encryptData = (stringForEncrypt) => {

    let encryptedData = ''


    if (typeof stringForEncrypt === 'object') {
        console.log(stringForEncrypt)
        Object.keys(stringForEncrypt).forEach(field => {
            if (field !== 'missed') {
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

    if (typeof stringForDecrypt.tasks === 'object') {
        stringForDecrypt.tasks.toObject()
        stringForDecrypt._doc.tasks.forEach(object => {
            Object.keys(object._doc).forEach(field => {

                if (field !== '_id' && field !== 'collaborators' && field !== '__v' && field !== 'missed') {
                    console.log(object._doc[field])
                    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
                    let decryptedData = decipher.update(object._doc[field], 'hex', 'utf-8');
                    decryptedData += decipher.final('utf-8');
                    object[field] = decryptedData;
                }
            })
        });

        return stringForDecrypt
    } else {

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
        let decryptedData = decipher.update(JSON.stringify(stringForDecrypt), 'hex', 'utf-8');
        decryptedData += decipher.final('utf-8');
        return decryptedData
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
            .findOne({ "_id": req.query.id ? req.query.id : '659fe6a7bf791a4da47f92c0' })
            .populate(this.editItem)
            .select(this.editItem)
            .then((item) => {
                //JSON.stringify(item);
                res
                    .status(200)
                    .json(decryptData(item))
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

        EditedTable
            .findByIdAndDelete(id)
            .then((item) => {
                Users
                    .findByIdAndUpdate(user_id, {
                        $pull: { tasks: item._id }
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
    res.redirect('/login')
})

app.post('/login', (req, res) => {

    const query = req.body;

    const login = encryptData(query.login);
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
        "login": encryptData(`${body.login}`),
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
    console.log('task');
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

    tasks.setItem(res, encryptData(body), user_id);
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

