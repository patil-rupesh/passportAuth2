var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  model = module.exports;

// Schemas definitions
var OAuthAuthCodesSchema = new Schema({
  authCode: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

var OAuthAccessTokensSchema = new Schema({
  accessToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

var OAuthRefreshTokensSchema = new Schema({
  refreshToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

var OAuthClientsSchema = new Schema({
  clientId: { type: String },
  clientSecret: { type: String },
  redirectUri: { type: String }
});

var OAuthUsersSchema = new Schema({
  username: { type: String },
  password: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  email: { type: String, default: '' }
});

mongoose.model('OAuthAuthCodes', OAuthAuthCodesSchema);
mongoose.model('OAuthAccessTokens', OAuthAccessTokensSchema);
mongoose.model('OAuthRefreshTokens', OAuthRefreshTokensSchema);
mongoose.model('OAuthClients', OAuthClientsSchema);
mongoose.model('OAuthUsers', OAuthUsersSchema);

var OAuthAuthCodesModel = mongoose.model('OAuthAuthCodes'),
  OAuthAccessTokensModel = mongoose.model('OAuthAccessTokens'),
  OAuthRefreshTokensModel = mongoose.model('OAuthRefreshTokens'),
  OAuthClientsModel = mongoose.model('OAuthClients'),
  OAuthUsersModel = mongoose.model('OAuthUsers');

//
// oauth2-server callbacks
//
model.getAccessToken = function (bearerToken, callback) {
  console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');

  OAuthAccessTokensModel.findOne({ accessToken: bearerToken }, callback);
};

model.getClient = function (clientId, clientSecret, callback) {
  console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
  if (clientSecret === null) {
    return OAuthClientsModel.findOne({ clientId: clientId }, callback);
  }
  OAuthClientsModel.findOne({ clientId: clientId, clientSecret: clientSecret }, callback);
};

// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
var authorizedClientIds = ['s6BhdRkqt3', 'toto'];
model.grantTypeAllowed = function (clientId, grantType, callback) {
  console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

  if (grantType === 'password') {
    return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
  }

  callback(false, true);
};

model.getAuthCode = function (bearerCode, callback) {
  console.log("in getAuthCode (bearerCode: " + bearerCode + ")");

  OAuthAuthCodesModel.findOne({ authCode: bearerCode }, function (err, result) {
    return callback(null, result.toObject());
  });
};

model.saveAuthCode = function (authCode, clientId, expires, user, callback) {
  console.log('in saveAuthCode (authCode: ' + authCode + ', clientId: ' + clientId + ', userId: ' + user + ', expires: ' + expires + ')');

  var code = new OAuthAuthCodesModel({
    authCode: authCode,
    clientId: clientId,
    userId: user,
    expires: expires
  });

  console.log("saving", code);
  code.save(callback);
};

model.saveAccessToken = function (token, clientId, expires, user, callback) {
  console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + user.id + ', expires: ' + expires + ')');
  var accessToken = new OAuthAccessTokensModel({
    accessToken: token,
    clientId: clientId,
    userId: user.id,
    expires: expires
  });

  accessToken.save(callback);
};

/*
 * Required to support password grant type
 */
model.getUser = function (username, password, callback) {
  console.log('in getUser (username: ' + username + ', password: ' + password + ')');

  OAuthUsersModel.findOne({ username: username, password: password }, function (err, user) {
    console.log(username, password, arguments);
    if (err) return callback(err);
    callback(null, user._id);
  });
};

/*
 * Required to support refreshToken grant type
 */
model.saveRefreshToken = function (token, clientId, expires, userId, callback) {
  console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

  var refreshToken = new OAuthRefreshTokensModel({
    refreshToken: token,
    clientId: clientId,
    userId: userId,
    expires: expires
  });

  refreshToken.save(callback);
};

model.getRefreshToken = function (refreshToken, callback) {
  console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');

  OAuthRefreshTokensModel.findOne({ refreshToken: refreshToken }, callback);
};
