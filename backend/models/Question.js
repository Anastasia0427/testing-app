const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const Question = sequelize.define('Question', {
    question_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'question_id'
    }, 
    test_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'test_id'
    },
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'question_text'
    },
    question_type: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'question_type'
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: {
                args: [0],
                msg: 'Оценка не может быть отрицательной!'
            }
        }

    }
}, {
    tableName: 'questions',
    timestamps: false
});

module.exports = Question;