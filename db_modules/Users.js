const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const usersSchema = new Schema({
    login: String,
    password: String,
    email: String,
    friends: [String],
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    goals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal'
    }],
    schedules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule'
    }]
});

const Users = mongoose.model("User", usersSchema);

module.exports = Users;

