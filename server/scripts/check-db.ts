import { db } from '../src/db.js';

console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all());