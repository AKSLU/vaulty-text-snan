import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabaseSync('notes.db');

export const initDB = () => {
  db.runSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT,
      text TEXT,
      pinned INTEGER DEFAULT 0,
      folder TEXT,
      tags TEXT,
      createdAt INTEGER
    );
  `);

  try {
    db.runSync(`ALTER TABLE notes ADD COLUMN tags TEXT;`);
    console.log("Колонка tags успешно добавлена");
  } catch (e) {
    
  }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // folder frist
  const defaultFolders = ['Документы', 'Учеба', 'Важное', 'Работа'];
  defaultFolders.forEach(name => {
    db.runSync(`INSERT OR IGNORE INTO folders (name) VALUES (?);`, [name]);
  });
};

// tags note
export const addNote = (image, text, tags = '') => {
  db.runSync(
    `INSERT INTO notes (image, text, pinned, folder, tags, createdAt) VALUES (?, ?, 0, NULL, ?, ?);`,
    [image, text, tags, Date.now()]
  );
};

export const getNotes = (callback) => {
  const result = db.getAllSync(`SELECT * FROM notes ORDER BY pinned DESC, createdAt DESC;`);
  callback(result);
};

export const deleteNote = (id) => {
  db.runSync(`DELETE FROM notes WHERE id = ?;`, [id]);
};

export const togglePin = (id, isCurrentlyPinned) => {
  db.runSync(`UPDATE notes SET pinned = ? WHERE id = ?;`, [isCurrentlyPinned ? 0 : 1, id]);
};

export const updateNoteFolder = (id, folderName) => {
  db.runSync(`UPDATE notes SET folder = ? WHERE id = ?;`, [folderName, id]);
};

export const updateNoteText = (id, text) => {
  db.runSync(`UPDATE notes SET text = ? WHERE id = ?;`, [text, id]);
};

export const updateNoteTags = (id, tags) => {
  db.runSync(`UPDATE notes SET tags = ? WHERE id = ?;`, [tags, id]);
};

// folder
export const getFoldersFromDB = (callback) => {
  const result = db.getAllSync(`SELECT name FROM folders;`);
  callback(result.map(f => f.name));
};

export const addFolderToDB = (name) => {
  try {
    db.runSync(`INSERT OR IGNORE INTO folders (name) VALUES (?);`, [name]);
  } catch (e) {
    console.error("Ошибка при добавлении папки:", e);
  }
};

export const deleteFolderFromDB = (name) => {
  db.runSync(`DELETE FROM folders WHERE name = ?;`, [name]);
  db.runSync(`UPDATE notes SET folder = NULL WHERE folder = ?;`, [name]);
};

// korzian
export const clearOldTrash = () => {
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); 
  try {
    db.runSync(
      `DELETE FROM notes WHERE folder = 'SYSTEM_TRASH' AND createdAt < ?;`,
      [threeDaysAgo]
    );
    console.log("Старые заметки в корзине удалены");
  } catch (e) {
    console.error("Ошибка при очистке корзины:", e);
  }
};
// check
export const moveToTrashDB = (id) => {
  if (id === undefined || id === null) {
    console.error("Критическая ошибка: moveToTrashDB вызван с пустым ID");
    return;
  }

  const timestamp = Number(Date.now());
  const noteId = Number(id);

  try {
    db.runSync(
      "UPDATE notes SET folder = 'SYSTEM_TRASH', createdAt = ? WHERE id = ?;",
      [timestamp, noteId] 
    );
  } catch (e) {
    console.error("Ошибка выполнения SQL в moveToTrashDB:", e);
    throw e;
  }
};