
const { v4: uuidv4 } = require('uuid');

module.exports = {
  generateGameId: () => uuidv4(),
};