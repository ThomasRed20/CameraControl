const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Camera = sequelize.define('Camera', {
    camNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    group: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

module.exports = Camera;