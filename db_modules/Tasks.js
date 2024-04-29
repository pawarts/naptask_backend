const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tasksSchema = new Schema({
    "title": String,
    "startTime": String,
    "endTime": String,
    "date": String,
    "collaborators": [String],
    "chat": [{
        from: String,
        message: String,
        timestamp: String
    }],
    "color": String,
    "taskDescription": String,
    "subtask": [String],
    "done": Boolean,
    "missed": Boolean,
});

const Tasks = mongoose.model('Task', tasksSchema);

module.exports = Tasks;

