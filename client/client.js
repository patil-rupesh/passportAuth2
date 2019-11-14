var passport = require('passport'),
  OAuth2Strategy = require('passport-oauth2').Strategy,
  express = require('express'),
  cors = require('cors'),
  session = require('express-session'),
  RedisStore = require('connect-redis')(session),
  request = require('request'),
  mongoose = require('mongoose'),
  model = require('./model'),
  EXAMPLE_CLIENT_ID = 'client1',
  EXAMPLE_CLIENT_SECRET = 'secret1';

var mongoUriString = 'mongodb://localhost:27017/client1';
mongoose.connect(mongoUriString, function (err, res) {
  if (err) {
    console.log('ERROR connecting to: ' + mongoUriString + '. ' + err);
  } else {
    console.log('Succeeded connected to: ' + mongoUriString);
  }
});

var oauthProvider = 'http://localhost:3000';
var clientHost = 'http://localhost:4000';

var oauth = new OAuth2Strategy({
  authorizationURL: oauthProvider + '/oauth/authorise',
  tokenURL: oauthProvider + '/oauth/token',
  clientID: EXAMPLE_CLIENT_ID,
  clientSecret: EXAMPLE_CLIENT_SECRET,
  callbackURL: clientHost + '/auth/example/callback'
},
  function (accessToken, refreshToken, profile, done) {
    model.UsersModel.findOneAndUpdate({
      openId: profile._id, authProvider: 'oauth'
    },
      {
        username: profile.username, profile: profile
      },
      {
        upsert: true, new: true
      },
      function (err, user) {
        if (err) {
          return done(err);
        }
        done(null, user);
      });
  }
);

oauth.userProfile = function (accessToken, done) {
  request('http://localhost:3000/api/userinfo', { json: true }, function (err, response, body) {
    done(null, body);
  }).auth(null, null, true, accessToken);
};

passport.use(oauth);

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  model.UsersModel.findOne({ _id: id }, function (err, user) {
    if (err || !user) {
      return done(err, false);
    }
    done(null, user);
  });
});


var app = express();
app.use(session({
  store: new RedisStore({
    ttl: 60 * 60 * 24
  }),
  secret: 'SECRET#123',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));

app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.get('/auth/example', passport.authenticate('oauth2'));

app.get('/auth/example/callback', passport.authenticate('oauth2', { failureRedirect: '/login' }), function (req, res) {
  // Successful authentication, redirect home.
  res.redirect('/');
});

app.get('/', function (req, res) {
  res.send('Welcome ' + req.user.username + '!');
});

app.listen(4000);


