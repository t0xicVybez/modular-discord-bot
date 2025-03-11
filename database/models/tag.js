// Tag model - for storing server-specific tags/auto-responses
const { pool } = require('../index');

class Tag {
  constructor(data = {}) {
    this.id = data.id;
    this.guildId = data.guildId;
    this.name = data.name;
    this.pattern = data.pattern;
    this.response = data.response;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.isRegex = data.isRegex === 1 || data.isRegex === true;
    this.usageCount = data.usageCount || 0;
  }

  // Find all tags for a guild
  static async findAllByGuild(guildId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM tags WHERE guildId = ? ORDER BY name ASC',
        [guildId]
      );
      
      // Create Tag instances with the data
      return rows.map(row => new Tag(row));
    } catch (error) {
      console.error('Error finding tags:', error);
      throw error;
    }
  }
  
  // Find a specific tag by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM tags WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      return new Tag(rows[0]);
    } catch (error) {
      console.error('Error finding tag by ID:', error);
      throw error;
    }
  }
  
  // Find a tag by name and guild ID
  static async findByName(guildId, name) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM tags WHERE guildId = ? AND name = ?',
        [guildId, name]
      );
      
      if (rows.length === 0) return null;
      
      return new Tag(rows[0]);
    } catch (error) {
      console.error('Error finding tag by name:', error);
      throw error;
    }
  }

  // Create a new tag
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        `INSERT INTO tags 
         (guildId, name, pattern, response, createdBy, isRegex, usageCount) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.guildId,
          data.name,
          data.pattern,
          data.response,
          data.createdBy,
          data.isRegex ? 1 : 0,
          0
        ]
      );
      
      const id = result.insertId;
      await connection.commit();
      
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error creating tag:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update an existing tag
  async save() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        `UPDATE tags SET
         name = ?,
         pattern = ?,
         response = ?,
         isRegex = ?,
         usageCount = ?
         WHERE id = ?`,
        [
          this.name,
          this.pattern,
          this.response,
          this.isRegex ? 1 : 0,
          this.usageCount,
          this.id
        ]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error saving tag:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Increment the usage count
  async incrementUsage() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      this.usageCount++;
      
      await connection.query(
        `UPDATE tags SET usageCount = ? WHERE id = ?`,
        [this.usageCount, this.id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error incrementing tag usage:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete a tag
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        'DELETE FROM tags WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting tag:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Tag;