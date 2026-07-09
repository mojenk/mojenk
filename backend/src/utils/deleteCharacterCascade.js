const { deleteCharacterTree } = require('../firestore');

async function deleteCharacterCascade(characterId, options = {}) {
  return deleteCharacterTree(characterId, options);
}

module.exports = { deleteCharacterCascade };