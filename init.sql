-- A site keeps multiple sensors. Records are stored seperately in another table.
-- This is just a backup mechanism(TODO)
CREATE TABLE IF NOT EXISTS Sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    desc TEXT
);

CREATE TABLE IF NOT EXISTS Sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER REFERENCES Sites(id),
    name TEXT NOT NULL,
    desc TEXT
);