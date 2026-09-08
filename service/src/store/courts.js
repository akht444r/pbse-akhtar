// store/courts.js — the only place SQL for this resource is written
import { db } from '../db.js';

export async function findCourts({ isAvailable } = {}) {
  if (isAvailable === undefined) {
    const { rows } = await db.query('SELECT * FROM courts ORDER BY id');
    return rows;
  }
  const { rows } = await db.query(
    'SELECT * FROM courts WHERE is_available = $1 ORDER BY id',
    [isAvailable]
  );
  return rows;
}

export async function findCourtById(id) {
  const { rows } = await db.query('SELECT * FROM courts WHERE id = $1', [id]);
  return rows[0]; // undefined when no such court
}
