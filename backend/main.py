import json
import os
import uuid
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.database import (
    conversation_exists,
    create_conversation,
    create_session,
    delete_conversation,
    get_chat_context,
    get_conversations,
    get_messages,
    initialize_database,
    save_chat_context,
    save_message,
    session_exists,
    update_conversation_title,
)

app = FastAPI(
    title="FAQ Chatbot API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEURO_SAN_URL = os.getenv(
    "NEURO_SAN_URL",
    (
        "http://localhost:8080/api/v1/generated/"
        "xyz_bank_faq_chatbot/streaming_chat"
    ),
)

class ChatRequest(BaseModel):
    session_id: str
    conversation_id: str
    message: str


class SessionRequest(BaseModel):
    session_id: str


class ConversationRequest(BaseModel):
    session_id: str

@app.on_event("startup")
def startup_event():
    initialize_database()

@app.post("/sessions")
def create_new_session():
    session_id = str(uuid.uuid4())

    create_session(session_id)

    return {
        "session_id": session_id,
    }

@app.post("/conversations")
def create_new_conversation(
    request: ConversationRequest,
):
    session_id = request.session_id

    if not session_exists(session_id):
        create_session(session_id)

    conversation_id = str(uuid.uuid4())

    create_conversation(
        session_id=session_id,
        conversation_id=conversation_id,
    )

    return {
        "session_id": session_id,
        "conversation_id": conversation_id,
        "title": "New Chat",
    }
@app.get("/conversations/{session_id}")
def conversations(
    session_id: str,
):
    if not session_exists(session_id):
        return {
            "session_id": session_id,
            "conversations": [],
        }

    return {
        "session_id": session_id,
        "conversations": get_conversations(
            session_id
        ),
    }


async def forward_neuro_san_stream(
    payload: dict[str, Any],
    conversation_id: str,
):
    full_answer = ""
    latest_chat_context = None

    try:

        async with httpx.AsyncClient(
            timeout=300.0
        ) as client:

            async with client.stream(
                "POST",
                NEURO_SAN_URL,
                json=payload,
            ) as response:

                response.raise_for_status()

                async for line in response.aiter_lines():

                    if not line:
                        continue

                    data_text = line.strip()

                    if data_text.startswith("data:"):
                        data_text = (
                            data_text[len("data:"):].strip()
                        )

                    if not data_text:
                        continue

                    if data_text == "[DONE]":
                        continue

                    try:
                        data = json.loads(
                            data_text
                        )

                    except json.JSONDecodeError:
                        print(
                            "Could not parse Neuro-SAN line:",
                            data_text,
                        )
                        continue

                    response_data = data.get(
                        "response",
                        {},
                    )

                    if not isinstance(
                        response_data,
                        dict,
                    ):
                        continue

                    text = response_data.get("text")

                    if text:

                        full_answer += text

                        yield (
                            "data: "
                            + json.dumps(
                                {
                                    "text": text,
                                },
                                ensure_ascii=False,
                            )
                            + "\n\n"
                        )

                    context = response_data.get(
                        "chat_context"
                    )

                    if context:
                        latest_chat_context = context

    except httpx.HTTPError as exc:

        print(
            "Neuro-SAN HTTP error:",
            exc,
        )

        yield (
            "data: "
            + json.dumps(
                {
                    "error": (
                        f"Neuro-SAN request failed: {exc}"
                    )
                },
                ensure_ascii=False,
            )
            + "\n\n"
        )

        yield "data: [DONE]\n\n"

        return

    if latest_chat_context:

        save_chat_context(
            conversation_id,
            latest_chat_context,
        )
    if full_answer:

        save_message(
            conversation_id,
            "assistant",
            full_answer,
        )

    yield "data: [DONE]\n\n"

@app.post("/chat")
async def chat(
    request: ChatRequest,
):

    session_id = request.session_id
    conversation_id = request.conversation_id

    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    if not conversation_exists(
        session_id,
        conversation_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )
    save_message(
        conversation_id,
        "user",
        user_message,
    )
    title = user_message.strip()

    if len(title) > 50:
        title = title[:47] + "..."

    update_conversation_title(
        conversation_id,
        title,
    )

    previous_context = get_chat_context(
        conversation_id
    )
    payload = {
        "user_message": {
            "text": user_message,
        }
    }

    if previous_context:
        payload["chat_context"] = previous_context

    return StreamingResponse(
        forward_neuro_san_stream(
            payload,
            conversation_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@app.get(
    "/chat/history/{session_id}/{conversation_id}"
)
def chat_history(
    session_id: str,
    conversation_id: str,
):

    if not conversation_exists(
        session_id,
        conversation_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    return {
        "session_id": session_id,
        "conversation_id": conversation_id,
        "messages": get_messages(
            session_id,
            conversation_id,
        ),
    }


@app.delete(
    "/conversations/{session_id}/{conversation_id}"
)
def delete_chat(
    session_id: str,
    conversation_id: str,
):

    if not conversation_exists(
        session_id,
        conversation_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    delete_conversation(
        session_id,
        conversation_id,
    )

    return {
        "status": "deleted",
        "session_id": session_id,
        "conversation_id": conversation_id,
    }