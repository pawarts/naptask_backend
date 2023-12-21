const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const goalsSchema = new Schema({
    "title": String,
    "tasks": [String]
});

const Goals = mongoose.model('Goal', goalsSchema);

module.exports = Goals;