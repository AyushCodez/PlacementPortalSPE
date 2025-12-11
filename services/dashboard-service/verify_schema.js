const User = require('./models/User');
console.log('User Role Enum:', User.schema.path('role').enumValues);
