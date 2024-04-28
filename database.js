const config = require("./config.json");

// database.js

const Sequelize = require('sequelize');

const sequelize = new Sequelize({
    storage: 'storage/database.sqlite',
    dialect: 'sqlite',
});

module.exports = sequelize;