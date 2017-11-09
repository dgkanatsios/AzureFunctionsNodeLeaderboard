require('dotenv').config();

const express = require("express");
const app = express(),
    utilities = require('./utilities'),
    mongoose = require('mongoose'),
    Score = require('./api/models/scoresModel'), //we have to load the models here
    User = require('./api/models/usersModel'), //to avoid MissingSchemaError
    paginate = require('express-paginate');


utilities.DEBUG_GLOBAL = true;

//use our authenticator
app.use(require('./authhelper'));

//don't use body-parser on Functions runtime, only when running locally in node environment
//https://stackoverflow.com/a/43620157/1205817    
if (process.env.AZURE_FUNCTIONS_RUNTIME === 'false') {
    const bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
}

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    useMongoClient: true,
});

// keep this before all routes that will use pagination
app.use(paginate.middleware(10, 50));

const routes = require('./api/routes/gameDataRoutes'); //importing routes
routes(app); //register the routes

//handle 404
app.use(function (req, res) {
    res.status(404).send({
        url: req.originalUrl + ' not found, sorry!'
    });
});

//are we running in a node environment or in a Docker container?
if (process.env.AZURE_FUNCTIONS_RUNTIME === 'false') {
    app.listen(process.env.PORT || 3000);
    utilities.log(`Running on port ${process.env.PORT || 3000}`);
    module.exports = app; //so our test can run appropriately
} else { //we're running in Azure Functions runtime (either on Azure or local)
    const createHandler = require("azure-function-express").createHandler;
    module.exports = createHandler(app);
}