import json
import sqlite3
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------
# Database location
# ---------------------------------------------------------

DATABASE_PATH = (
    Path(__file__).resolve().parent.parent / "chathistory.db"
)


# ---------------------------------------------------------
# Database connection
# ---------------------------------------------------------

def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=30,
        check_same_thread=False,
    )

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    return connection


# ---------------------------------------------------------
# Initialize database
# ---------------------------------------------------------

def initialize_database() -> None:

    connection = get_connection()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                session_id TEXT PRIMARY KEY,
                chat_context TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (session_id)
                    REFERENCES conversations(session_id)
                    ON DELETE CASCADE
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_session_id
            ON messages(session_id)
            """
        )

        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Create conversation
# ---------------------------------------------------------

def create_conversation(session_id: str) -> None:

    connection = get_connection()

    try:

        connection.execute(
            """
            INSERT OR IGNORE INTO conversations (
                session_id
            )
            VALUES (?)
            """,
            (session_id,),
        )

        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Get Neuro-SAN chat context
# ---------------------------------------------------------

def get_chat_context(
    session_id: str,
) -> Optional[dict]:

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            SELECT chat_context
            FROM conversations
            WHERE session_id = ?
            """,
            (session_id,),
        )

        row = cursor.fetchone()

        if row is None:
            return None

        raw_context = row["chat_context"]

        if not raw_context:
            return None

        try:
            return json.loads(raw_context)

        except json.JSONDecodeError:
            return None

    finally:
        connection.close()


# ---------------------------------------------------------
# Save Neuro-SAN chat context
# ---------------------------------------------------------

def save_chat_context(
    session_id: str,
    chat_context: dict,
) -> None:

    connection = get_connection()

    try:

        serialized_context = json.dumps(
            chat_context,
            ensure_ascii=False,
        )

        connection.execute(
            """
            UPDATE conversations
            SET
                chat_context = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
            """,
            (
                serialized_context,
                session_id,
            ),
        )

        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Save message
# ---------------------------------------------------------

def save_message(
    session_id: str,
    role: str,
    content: str,
) -> None:

    connection = get_connection()

    try:

        connection.execute(
            """
            INSERT INTO messages (
                session_id,
                role,
                content
            )
            VALUES (?, ?, ?)
            """,
            (
                session_id,
                role,
                content,
            ),
        )

        connection.execute(
            """
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
            """,
            (session_id,),
        )

        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Get visible chat history
# ---------------------------------------------------------

def get_messages(
    session_id: str,
) -> list[dict]:

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            SELECT
                id,
                session_id,
                role,
                content,
                created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY id ASC
            """,
            (session_id,),
        )

        rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "session_id": row["session_id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]

    finally:
        connection.close()


# ---------------------------------------------------------
# Delete conversation
# ---------------------------------------------------------

def delete_conversation(
    session_id: str,
) -> None:

    connection = get_connection()

    try:

        connection.execute(
            """
            DELETE FROM conversations
            WHERE session_id = ?
            """,
            (session_id,),
        )

        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Check conversation
# ---------------------------------------------------------

def conversation_exists(
    session_id: str,
) -> bool:

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            SELECT 1
            FROM conversations
            WHERE session_id = ?
            LIMIT 1
            """,
            (session_id,),
        )

        return cursor.fetchone() is not None

    finally:
        connection.close()