echo "Creating database tables..."

# Execute the schema file
psql -h localhost -U postgres -d ceaser_db -f schema_full.sql

echo "Database setup complete!"
echo "Checking tables..."

# Check if tables were created
psql -h localhost -U postgres -d ceaser_db -c "\dt"

echo "Checking for orders..."
psql -h localhost -U postgres -d ceaser_db -c "SELECT COUNT(*) FROM orders;"