var express = require('express'),
  bodyParser = require('body-parser'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  BearerStrategy = require('passport-http-bearer').Strategy,
  oauthServer = require('oauth2-server'),
  cors = require('cors'),
  model = require('./model'),
  session = require('express-session'),
  RedisStore = require('connect-redis')(session),
  mongoose = require('mongoose');

var app = express();
app.use(cors());

var uristring = 'mongodb://localhost:27017/auth';
mongoose.connect(uristring, function (err, res) {
  if (err) {
    console.log('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log('Succeeded connected to: ' + uristring);
  }
});


passport.use('local', new LocalStrategy(
  function (username, password, done) {
    mongoose.model('OAuthUsers').findOne({ username: username }, function (err, user) {
      if (err) {
        return done(new Error('incorrect password or user not exist'));
      }
      if (user.password === password) {
        return done(null, user);
      }
      done(new Error('incorrect password or user not exist'));
    });
  }
));

passport.use('bearer', new BearerStrategy(
  function (token, done) {
    mongoose.model('OAuthAccessTokens').findOne({ accessToken: token }, function (err, tokenUser) {
      if (err) { return done(err); }
      if (!tokenUser) { return done(null, false); }
      mongoose.model('OAuthUsers').findOne({ _id: tokenUser.userId }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        user = user.toObject();
        delete user.password;
        return done(null, user, { scope: 'all' });
      });
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  mongoose.model('OAuthUsers').findOne({ _id: id }, function (err, user) {
    if (err) {
      return done(new Error('user not exist'));
    }
    done(null, user);
  });
});


app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.set('trust proxy', 1) // trust first proxy

app.use(session({
  store: new RedisStore({
    ttl: 60 * 60 * 24
  }),
  secret: 'SECRET#123',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.oauth = oauthServer({
  model: model, // See below for specification 
  grants: ['password', 'authorization_code'],
  debug: true
});

app.all('/oauth/token', function (req, res, next) {
  console.log('get access token', req.url);
  next();
}, app.oauth.grant());

// Show them the "do you authorise xyz app to access your content?" page
app.get('/oauth/authorise', function (req, res, next) {
  if (!req.user) {
    // If they aren't logged in, send them to your own login implementation
    return res.redirect('/login?redirect=' + req.path + '&response_type=' + req.query.response_type + '&client_id=' +
      req.query.client_id + '&redirect_uri=' + req.query.redirect_uri);
  }

  res.render('authorise', {
    client_id: req.query.client_id,
    redirect_uri: req.query.redirect_uri
  });
});

// Handle authorise
app.post('/oauth/authorise', function (req, res, next) {
  if (!req.user) {
    return res.redirect('/login?client_id=' + req.query.client_id + '&response_type=' + req.query.response_type + '&redirect_uri=' + req.query.redirect_uri);
  }

  next();
}, app.oauth.authCodeGrant(function (req, next) {
  // The first param should to indicate an error
  // The second param should a bool to indicate if the user did authorise the app
  // The third param should for the user/uid (only used for passing to saveAuthCode)
  next(null, req.body.allow === 'yes', req.user.id, req.user);
}));

// Show login
app.get('/login', function (req, res, next) {
  res.render('login', {
    redirect: req.query.redirect,
    client_id: req.query.client_id,
    redirect_uri: req.query.redirect_uri
  });
});

// Handle login
app.post('/login', passport.authenticate('local'), function (req, res) {
  if (!req.user) {
    res.render('login', {
      redirect: req.query.redirect,
      client_id: req.query.client_id,
      redirect_uri: req.query.redirect_uri
    });
  }
  console.log("req.query.redirect");
  console.log(req.query.redirect);
  return res.redirect((req.query.redirect || '/home') + '?client_id=' + req.query.client_id + '&response_type=' + req.query.response_type + '&redirect_uri=' + req.query.redirect_uri);
});

app.get('/api/userinfo', passport.authenticate('bearer', { session: false }), function (req, res) {
  res.send(req.user);
});

app.use(app.oauth.errorHandler());

app.listen(3000);