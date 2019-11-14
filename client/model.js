var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  model = module.exports;

//
// Schemas definitions
//
var UsersSchema = new Schema({
  username: { type: String },
  profile: { type: mongoose.SchemaTypes.Mixed },
  authProvider: { type: String },
  openId: { type: String }
});

mongoose.model('Users', UsersSchema);

model.UsersModel = mongoose.model('Users');

