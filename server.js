const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const shortid = require('shortid');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track');

var Schema = mongoose.Schema;

var userSchema = new Schema({
  _id: {
    type: String,
    default: shortid.generate
  },
  username: { type: String, required: true, unique: true }
});

var exerciseSchema = new Schema({
  userId: { type: String, ref: 'User2' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

var UserModel = mongoose.model('User2', userSchema);
var ExerciseModel = mongoose.model('Exercise2', exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/exercise/users', (req, res, next) => {
  UserModel.find()
    .select('_id username')
    .exec()
    .then(data => res.json(data))
    .catch(err => next(err));
});

app.get('/api/exercise/log', (req, res, next) => {
  let { userId, limit, from, to } = req.query;
  let options = {};
  if (userId === undefined) {
    throw new Error('userId is empty');
  }
  options.userId = userId;
  if (from !== undefined) {
    options.date = { $gte: new Date(from) };
  }
  if (to !== undefined) {
    options.hasOwnProperty('date')
      ? (options.date.$lte = new Date(to))
      : (options.date = { $lte: new Date(to) });
  }
  if (limit !== undefined) {
    limit = parseInt(limit);
  }
  UserModel.findOne({ _id: userId })
    .then(data => {
      if (data === null) {
        throw new Error('user not found');
      }
      ExerciseModel.find(options)
        .limit(limit)
        .exec()
        .then(exData => {
          res.json({
            _id: data._id,
            username: data.username,
            count: exData.length,
            log: exData
          });
        })
        .catch(err => next(err));
    })
    .catch(err => next(err));
});

app.post('/api/exercise/new-user', (req, res, next) => {
  const username = req.body.username;
  const user = new UserModel({ username });
  user
    .save()
    .then(data => res.json(data))
    .catch(err => next(err));
});

app.post('/api/exercise/add', (req, res, next) => {
  let { userId, description, duration, date } = req.body;
  if (date == '') {
    date = new Date();
  } else {
    date = new Date(date);
  }
  const exercise = new ExerciseModel({ userId, description, duration, date });
  exercise
    .save()
    .then(data => res.json(data))
    .catch(err => next(err));
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res
    .status(errCode)
    .type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
