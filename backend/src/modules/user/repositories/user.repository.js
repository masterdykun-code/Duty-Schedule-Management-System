export class UserRepository {
  static async createUser(client, { username, passwordHash, role, status }) {
    const result = await client.query(
      `
      INSERT INTO users (username, password_hash, role, status)
      VALUES ($1, $2, $3, COALESCE($4, 'ACTIVE'))
      RETURNING user_id, username, role, status, created_at
      `,
      [username, passwordHash, role, status],
    );
    return result.rows[0];
  }
}
