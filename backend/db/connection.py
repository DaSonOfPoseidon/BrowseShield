"""
connection.py
--------------
Handles PostgreSQL database connections for BrowseShield.
This module centralizes database configuration and connection management.
"""

import os
import logging
from contextlib import contextmanager
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

connection_pool = None


def initialize_pool(minconn=1, maxconn=5):
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
    if connection_pool is None:
        raise RuntimeError("Connection pool not initialized")

    return connection_pool.getconn()


def release_connection(conn):
    connection_pool.putconn(conn)


@contextmanager
def get_db_connection():
    conn = get_connection()

    try:
        yield conn
    finally:
        release_connection(conn)