require('dotenv').config();
const express = require('express');
const app = express()
const auth = express.Router()
const bcrypt = require('bcryptjs');
const { connect } = require('http2');
const path = require('path');
const { errors, queryResult } = require('pg-promise');
const { isNull } = require('util');
const pgp = require('pg-promise')();
const db = pgp({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const PORT = process.env.PORT || 5000
const saltRounds = 10;

// DATABASE CONFIG
db.query("CREATE TABLE IF NOT EXISTS users ( \
  Username varchar(50) NOT NULL UNIQUE PRIMARY KEY, \
  Password varchar(60) NOT NULL);"
);

// POST DATABASE
db.query("CREATE TABLE IF NOT EXISTS posts ( \
  Author varchar(50) NOT NULL, \
  Posttime timestamp(10) DEFAULT CURRENT_TIMESTAMP, \
  Post text NOT NULL);"
);

// DEVELOPERS SHOULD ADD CODE HERE



// DEVELOPERS CODE ENDS HERE
app.use(express.static(path.join(__dirname, 'public')))
  .use(express.urlencoded())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  // ROUTING EXAMPLES
  .get('/', (req, res) => res.render('pages/index', { title: 'Home' }))
  .get('/help', (req, res) => res.render('pages/help', { title: 'Help' }))
  .get('/stream', async (req, res) => {
    var newPosts = await loadpost()
    res.render('pages/stream', { title: 'Stream', recentPosts: newPosts })
  })
  .get('/newpost', (req, res) => res.render('pages/newpost', { title: 'New Post' }))
  // ROUTING STARTS HERE
  .post('/newpost', async (req, res) => {
    await db.query(`INSERT INTO posts (author, post) VALUES ('${req.body.username}', '${req.body.newpost}')`)
    res.send("Success")
  })
  


  // ROUTING ENDS HERE
  .use('/auth', auth)
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

// AUTH FUNCTIONS
// Authentication Router
// Handles HTTP requests that go to https://localhost:PORT/auth

// Login User function
// Return Values:
//    null: if matching user does not exist
//    object: returns the correct user
async function loginUser(username, password) {
  return bcrypt.hash('1', saltRounds).then(async (fakeHash) => {
    return db.one(`SELECT Username, Password FROM users WHERE Username='${username}'`).then(async (user) => {
      return bcrypt.compare(password, user.password).then(async (loggedIn) => {
        if (loggedIn) { return user } else { return null }
      })
    }).catch(async error => {
      console.log(error.message || error)
      return await bcrypt.compare('2', fakeHash).then(async () => { return null })
    })
  })
}

async function loadpost(_p1){
  return await db.query('SELECT post FROM posts ORDER BY posttime DESC', (posts) => {
    return posts;
  })
}

// Login page methods
auth.get('/login', (req, res) => res.render('pages/auth/login', { title: 'Login' }))
auth.post('/login', async (req, res) => {
  await loginUser(req.body.username, req.body.password).then((user) => {
    if (user) {
      res.send(`Successfully logged in as ${user.username}`)
    } else {
      res.send("The username and password provided do not match our records.")
    }
  })
})

// Register User function
// Return Values: 
//    Bool: True if user successfully registered, false if not!
async function registerUser(username, password) {
  return db.none(`SELECT * FROM users WHERE Username='${username}'`).then(async () => {
    return bcrypt.hash(password, saltRounds).then(async (hashedPass) => {
      return db.query(`INSERT INTO users VALUES ('${username}', '${hashedPass}')`).then(async () => { return true })
    })
  }).catch(error => {
    console.log(error.message || error)
    return false
  })
}

// Register page methods
auth.get('/register', (req, res) => res.render('pages/auth/register', { title: 'Register' }))
auth.post('/register', async (req, res) => {
  if (await registerUser(req.body.username, req.body.password)) {
    res.send(`User "${req.body.username}" has been created.`)
  } else {
    res.send(`User "${req.body.username}" already exists.`)
  }
});
