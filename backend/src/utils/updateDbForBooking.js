const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function updateDbForBooking() {
    const db = await open({
        filename: path.join(__dirname, '../../database.db'),
        driver: sqlite3.Database
    });

    console.log("Updating database schema for Doctor-Specific Bookings...");

    try {
        // Add doctorId to queue table
        await db.exec('ALTER TABLE queue ADD COLUMN doctorId TEXT');
        await db.exec('ALTER TABLE queue ADD COLUMN callRoomId TEXT');
    } catch (e) {
        console.log("Database columns might already exist.");
    }

    // Ensure Doctor Profiles have a fixed ID for demo
    console.log("Schema update complete.");
    return db;
}

if (require.main === module) updateDbForBooking();
module.exports = updateDbForBooking;
