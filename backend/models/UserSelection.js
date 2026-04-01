const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const UserSelection = sequelize.define('UserSelection', {
    answer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'answer_id'
    },
    attempt_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'attempt_id'
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_id'
    },
    option_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'option_id'
    },
    answer_text: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    answered_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'answered_at'
    }
}, {
    tableName: 'user_selections',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['attempt_id', 'question_id']
        }
    ]
});

module.exports = UserSelection;