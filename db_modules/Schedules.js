const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const schedulesSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    even: {
        type: Number
    },
    scheduleBody: {
        mon: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        tue: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        wed: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        thu: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        fri: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        sat: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }],
        sun: [{
            title: String,
            timeStart: String,
            timeEnd: String,
            color: String
        }]
    }
});

const Schedules = mongoose.model('Schedule', schedulesSchema);

module.exports = Schedules;
