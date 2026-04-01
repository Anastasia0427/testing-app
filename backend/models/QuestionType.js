const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const QuestionType = sequelize.define('QuestionType', {
    type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'type_id'
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'question_types',
    timestamps: false
});

module.exports = QuestionType;