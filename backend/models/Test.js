const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const Test = sequelize.define('Test', {
    test_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'test_id'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: {
                args: [3, 100],
                msg: 'Название теста должно содержать от 3 до 100 символов'
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    max_attempts: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_attempts'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    time_limit: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'time_limit'
    },
    pass_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100
        },
        field: 'pass_score'
    },
    cover_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
        field: 'cover_image'
    }
}, {
    tableName: 'tests',
    timestamps: false
});

module.exports = Test;