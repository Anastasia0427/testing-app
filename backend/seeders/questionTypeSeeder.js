const QuestionType = require('../models/QuestionType');

const types = ['single_choice', 'multiple_choice', 'text'];

const seedQuestionTypes = async () => {
    for (const typeName of types) {
        await QuestionType.findOrCreate({
            where: { type: typeName }
        });
    }
    console.log('Типы вопросов инициализированы:', types.join(', '));
};

module.exports = seedQuestionTypes;
