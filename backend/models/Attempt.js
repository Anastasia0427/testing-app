const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const Attempt = sequelize.define('Attempt', {
    attempt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'attempt_id'
    },
    assignment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'assignment_id'
    },
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'started_at'
    },
    finished_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'finished_at'
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    }
}, {
    tableName: 'attempts',
    timestamps: false
});

module.exports = Attempt;