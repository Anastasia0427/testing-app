const sequelize = require('../config/database.js');

const Role = require('./Role.js');
const User = require('./User.js');
const Test = require('./Test.js');
const QuestionType = require('./QuestionType.js');
const Question = require('./Question.js');
const AnswerOption = require('./AnswerOption.js');
const Assignment = require('./Assignment.js');
const Attempt = require('./Attempt.js');
const UserSelection = require('./UserSelection.js');

//===================== ASSOCIATIONS =====================

// User <-> Role (Many-to-One)
User.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
  });
  
  Role.hasMany(User, {
    foreignKey: 'role_id',
    as: 'users'
  });

  // User <-> Test (One-to-Many) - User creates Tests
User.hasMany(Test, {
    foreignKey: 'created_by',
    as: 'created_tests'
  });
  
  Test.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
  
  // Test <-> Question (One-to-Many)
  Test.hasMany(Question, {
    foreignKey: 'test_id',
    as: 'questions',
    onDelete: 'CASCADE'
  });
  
  Question.belongsTo(Test, {
    foreignKey: 'test_id',
    as: 'test'
  });
  
  // Question <-> QuestionType (Many-to-One)
  Question.belongsTo(QuestionType, {
    foreignKey: 'question_type',
    as: 'type'
  });
  
  QuestionType.hasMany(Question, {
    foreignKey: 'question_type',
    as: 'questions'
  });
  
  // Question <-> AnswerOption (One-to-Many)
  Question.hasMany(AnswerOption, {
    foreignKey: 'question_id',
    as: 'options',
    onDelete: 'CASCADE'
  });
  
  AnswerOption.belongsTo(Question, {
    foreignKey: 'question_id',
    as: 'question'
  });
  
  // User <-> Assignment (One-to-Many) - Student receives Assignments
  User.hasMany(Assignment, {
    foreignKey: 'student_id',
    as: 'assignments'
  });
  
  Assignment.belongsTo(User, {
    foreignKey: 'student_id',
    as: 'student'
  });
  
  // Test <-> Assignment (One-to-Many)
  Test.hasMany(Assignment, {
    foreignKey: 'test_id',
    as: 'assignments'
  });
  
  Assignment.belongsTo(Test, {
    foreignKey: 'test_id',
    as: 'test'
  });
  
  // Assignment <-> Attempt (One-to-Many)
  Assignment.hasMany(Attempt, {
    foreignKey: 'assignment_id',
    as: 'attempts',
    onDelete: 'CASCADE'
  });
  
  Attempt.belongsTo(Assignment, {
    foreignKey: 'assignment_id',
    as: 'assignment'
  });
  
  // Attempt <-> UserSelection (One-to-Many)
  Attempt.hasMany(UserSelection, {
    foreignKey: 'attempt_id',
    as: 'selections'
  });
  
  UserSelection.belongsTo(Attempt, {
    foreignKey: 'attempt_id',
    as: 'attempt'
  });
  
  // Question <-> UserSelection (One-to-Many)
  Question.hasMany(UserSelection, {
    foreignKey: 'question_id',
    as: 'selections',
    onDelete: 'CASCADE'
  });
  
  UserSelection.belongsTo(Question, {
    foreignKey: 'question_id',
    as: 'question'
  });
  
  // AnswerOption <-> UserSelection (One-to-Many)
  AnswerOption.hasMany(UserSelection, {
    foreignKey: 'option_id',
    as: 'selections'
  });
  
  UserSelection.belongsTo(AnswerOption, {
    foreignKey: 'option_id',
    as: 'selected_option'
  });

  
  // ===================== SYNC DATABASE =====================
  const syncDatabase = async (options = {}) => {
    try {
      await sequelize.sync(options);
      console.log('Синхронизация базы данных выполнена успешно');
    } catch (error) {
      console.error('Ошибка синхронизации баз данных: ', error);
      throw error; // !!!!!!!!!!!! СТОИТ ЛИ ВЫБРАСЫВАТЬ ТУТ ИСКЛЮЧЕНИЕ??????????????????
    }
  };

  module.exports = {
    sequelize,
    syncDatabase,

    Role,
    User,
    Test,
    QuestionType,
    Question,
    AnswerOption,
    Assignment,
    Attempt,
    UserSelection
  };