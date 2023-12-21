/* Connect node modules */

const express = require('express');
const app = express();
const mongoose = require('mongoose');

/* DB table model */
const Users = require('./db_modules/Users');
const Tasks = require('./db_modules/Tasks');
const Goals = require('./db_modules/Goals');


/* Create server */

const PORT = 8800;
app.listen(PORT, () => {
    console.log('Server listening on port: ' + PORT);
});


/* Connect to database */

const URL = 'mongodb://localhost:27017/naptask';

mongoose
    .connect(URL)
    .then(() => console.log('I\'m connected to DB (^_^)'))
    .catch(error => console.log(error))



/* Middleware */

app.use(express.json());


/* Routers */


/* Object for tasks-goals routers */

class TasksGoalsManager {
    constructor(editItem, table) {
        this.editItem = editItem;
        this.table = table;
    }

    getItem(res) {
        Users
            .findOne({ "login": 'Wellerman' })
            .populate(this.editItem)
            .select(this.editItem)
            .then((item) => {
                JSON.stringify(item);
                res
                    .status(200)
                    .json(item)
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

    deleteItem(res, id) {

        const EditedTable = this.table;

        EditedTable
            .findByIdAndDelete(id)
            .then(() => res.end())
            .catch(error => console.log(error));
    }

    setItem(res, data) {

        const EditedTable = this.table;

        const addItem = new EditedTable(data);

        addItem
            .save()
            .then((added) => res.json(added))
            .catch((error) => console.log(error));
    }
}


app.get('/', (req, res) => {
    res.redirect('/login')
})

app.get('/login', (req, res) => {

    const query = req.query;

    const login = query.login;
    const password = query.password;
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
        "password": `${body.password}`,
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
    tasks.getItem(res);
});

app.put('/task/edit/:id', (req, res) => {
    tasks.changeItem(res, req.params.id, req.body);
});

app.delete('/task/delete/:id', (req, res) => {
    tasks.deleteItem(res, req.params.id);
});

app.post('/task/add', (req, res) => {
    tasks.setItem(res, req.body);
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

