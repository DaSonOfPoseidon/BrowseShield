"""
connection.py
--------------
Handles PostgreSQL database connections for BrowseShield.
"""

import os
import logging
from contextlib import contextmanager
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD]):
    raise RuntimeError("Database environment variables are not properly configured")

connection_pool = None


def initialize_pool(minconn=1, maxconn=5):
    """
    Initialize PostgreSQL connection pool.
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
            password=DB_PASSWORD,
        )

        logger.info("PostgreSQL pool initialized")


def get_connection():
    """
    Retrieve connection from pool.
    """

    if connection_pool is None:
        raise RuntimeError("Connection pool not initialized")

    return connection_pool.getconn()


def release_connection(conn):
    """
    Return connection to pool.
    """

    if connection_pool:
        connection_pool.putconn(conn)


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    """

    conn = get_connection()

    try:
        yield conn
    finally:
        release_connection(conn)


def close_pool():
    """
    Close all connections in pool.
    """

    global connection_pool

    if connection_pool:
        connection_pool.closeall()
        logger.info("PostgreSQL pool closed")