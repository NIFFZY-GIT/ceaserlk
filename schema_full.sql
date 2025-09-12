-- It's good practice to enable the pgcrypto extension to generate UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a user role enum for future use (e.g., admin panels)
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- The main users table
CREATE TABLE users (
    -- Use UUID for a non-sequential, more secure primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User details from the form
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, -- Email must be unique
    phone_number VARCHAR(20) UNIQUE, -- Phone can be optional or unique

    -- Security and Authentication
    password_hash VARCHAR(255) NOT NULL, -- NEVER store plain text passwords
    role user_role NOT NULL DEFAULT 'USER',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- For email verification later

    -- Timestamps for auditing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index on the email column for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Optional: A trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

select *from users;



