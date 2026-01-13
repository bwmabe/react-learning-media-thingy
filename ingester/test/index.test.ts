import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import util from 'util';

const execPromise = util.promisify(exec);

describe('Ingester Script', () => {
  const testAssetsDir = path.resolve(__dirname, 'test-assets');
  const dbPath = path.resolve(__dirname, 'test.db');
  const ingesterScriptPath = path.resolve(__dirname, '../dist/index.js');

  beforeAll(async () => {
    // Build the project before running tests
    await execPromise('npm run build', { cwd: path.resolve(__dirname, '..') });
  });

  // Before each test, delete the DB file if it exists
  beforeEach(async () => {
    try {
      await fs.unlink(dbPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') { // Ignore "file not found" error
        throw error;
      }
    }
  });

  test('should ingest JSON files and store them in the database', async () => {
    // Run the ingester script
    const { stdout, stderr } = await execPromise(`node ${ingesterScriptPath} ${testAssetsDir} ${dbPath}`);

    // Check for errors
    expect(stderr).toBe('');

    // Open the newly created database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const items = await db.all('SELECT * FROM items ORDER BY id');
    
    // There are 3 json files in test-assets
    expect(items).toHaveLength(3);

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
            id: '12345',
            user: 'testuser',
            service: 'youtube',
            title: 'A Great Video',
            substring: 'A great video about something interesting.',
            filename: 'sample1'
        }),
        expect.objectContaining({
            id: '67890',
            user: '',
            service: '',
            title: 'Another Great Video',
            substring: '',
            filename: 'sample2'
        }),
        expect.objectContaining({
            id: 'abcde',
            user: 'anotheruser',
            service: 'vimeo',
            title: 'A short film',
            substring: 'A short film about a robot.',
            filename: path.join('docs', 'sample3')
        })
      ])
    );

    await db.close();
  });
});