"""
connection.py
--------------
Handles PostgreSQL database connections for BrowseShield.
This module centralizes database configuration and connection management.
"""

import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Connection pool
connection_pool = None


def initialize_pool(minconn: int = 1, maxconn: int = 5):
    """
    Initializes a connection pool for PostgreSQL.
    Should be called once at application startup.
    """
    global connection_pool

    if connection_pool is None:
        connection_pool = pool.SimpleConnectionPool(
            minconn,
            maxconn,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )


def get_connection():
    """
    Retrieves a database connection from the pool.
    """
    if connection_pool is None:
        raise Exception("Connection pool is not initialized.")
    return connection_pool.getconn()


def release_connection(conn):
    """
    Returns a connection back to the pool.
    """
    if connection_pool:
        connection_pool.putconn(conn)


def close_pool():
    """
    Closes all database connections.
    Call during application shutdown.
    """
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        connection_pool = None
