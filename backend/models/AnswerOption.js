const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const AnswerOption = sequelize.define('AnswerOption', {
    option_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'option_id'
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_id'
    },
    option_text: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    is_correct: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_correct'
    }
}, {
    tableName: 'answer_options',
    timestamps: false
});

module.exports = AnswerOption;
