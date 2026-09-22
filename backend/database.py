import json
import sqlite3
from pathlib import Path
from typing import Optional

DATABASE_PATH = (
    Path(__file__).resolve().parent / "chathistory.db"
)

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

#initialize db
def initialize_database() -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'New Chat',
                chat_context TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (session_id)
                    REFERENCES sessions(session_id)
                    ON DELETE CASCADE
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (conversation_id)
                    REFERENCES conversations(conversation_id)
                    ON DELETE CASCADE
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_conversations_session_id
            ON conversations(session_id)
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
            ON messages(conversation_id)
            """
        )

        connection.commit()

    finally:
        connection.close()


# sessions
def create_session(session_id: str) -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT OR IGNORE INTO sessions (
                session_id
            )
            VALUES (?)
            """,
            (session_id,),
        )

        connection.commit()

    finally:
        connection.close()


def session_exists(session_id: str) -> bool:
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT 1
            FROM sessions
            WHERE session_id = ?
            LIMIT 1
            """,
            (session_id,),
        )

        return cursor.fetchone() is not None

    finally:
        connection.close()

def create_conversation(
    session_id: str,
    conversation_id: str,
    title: str = "New Chat",
) -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT INTO conversations (
                conversation_id,
                session_id,
                title
            )
            VALUES (?, ?, ?)
            """,
            (
                conversation_id,
                session_id,
                title,
            ),
        )
        connection.commit()
    finally:
        connection.close()


def conversation_exists(
    session_id: str,
    conversation_id: str,
) -> bool:
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT 1
            FROM conversations
            WHERE session_id = ?
              AND conversation_id = ?
            LIMIT 1
            """,
            (
                session_id,
                conversation_id,
            ),
        )

        return cursor.fetchone() is not None

    finally:
        connection.close()


def get_conversations(
    session_id: str,
) -> list[dict]:
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT
                conversation_id,
                session_id,
                title,
                created_at,
                updated_at
            FROM conversations
            WHERE session_id = ?
            ORDER BY updated_at DESC
            """,
            (session_id,),
        )

        rows = cursor.fetchall()

        return [
            {
                "conversation_id": row["conversation_id"],
                "session_id": row["session_id"],
                "title": row["title"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

    finally:
        connection.close()


def update_conversation_title(
    conversation_id: str,
    title: str,
) -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            UPDATE conversations
            SET
                title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE conversation_id = ?
            """,
            (
                title,
                conversation_id,
            ),
        )

        connection.commit()

    finally:
        connection.close()


def delete_conversation(
    session_id: str,
    conversation_id: str,
) -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            DELETE FROM conversations
            WHERE session_id = ?
              AND conversation_id = ?
            """,
            (
                session_id,
                conversation_id,
            ),
        )

        connection.commit()

    finally:
        connection.close()

#for sending the context to neurosan
def get_chat_context(
    conversation_id: str,
) -> Optional[dict]:
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT chat_context
            FROM conversations
            WHERE conversation_id = ?
            """,
            (conversation_id,),
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


def save_chat_context(
    conversation_id: str,
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
            WHERE conversation_id = ?
            """,
            (
                serialized_context,
                conversation_id,
            ),
        )

        connection.commit()

    finally:
        connection.close()


# messages
def save_message(
    conversation_id: str,
    role: str,
    content: str,
) -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT INTO messages (
                conversation_id,
                role,
                content
            )
            VALUES (?, ?, ?)
            """,
            (
                conversation_id,
                role,
                content,
            ),
        )

        connection.execute(
            """
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE conversation_id = ?
            """,
            (conversation_id,),
        )

        connection.commit()

    finally:
        connection.close()


def get_messages(
    session_id: str,
    conversation_id: str,
) -> list[dict]:
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT
                m.id,
                m.conversation_id,
                m.role,
                m.content,
                m.created_at
            FROM messages m
            INNER JOIN conversations c
                ON m.conversation_id = c.conversation_id
            WHERE c.session_id = ?
              AND m.conversation_id = ?
            ORDER BY m.id ASC
            """,
            (
                session_id,
                conversation_id,
            ),
        )

        rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "conversation_id": row["conversation_id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]

    finally:
        connection.close()