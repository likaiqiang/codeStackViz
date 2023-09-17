const {db} = require("./database");
const {BundleManager} = require("./task");
const userCollection = db.collection('users')
new BundleManager(userCollection).checkInterruptedTask()
