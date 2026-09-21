import json
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.database import (
    create_conversation,
    delete_conversation,
    get_chat_context,
    get_messages,
    initialize_database,
    save_chat_context,
    save_message,
)


# =========================================================
# FastAPI
# =========================================================

app = FastAPI(
    title="FAQ Chatbot API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Neuro-SAN
# =========================================================

NEURO_SAN_URL = (
    "http://localhost:8080/api/v1/generated/"
    "xyz_bank_faq_chatbot/streaming_chat"
)


# =========================================================
# Request model
# =========================================================

class ChatRequest(BaseModel):
    session_id: str
    message: str


# =========================================================
# Startup
# =========================================================

@app.on_event("startup")
def startup_event():
    initialize_database()


# =========================================================
# Health
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "faq-chatbot-api",
    }


async def forward_neuro_san_stream(
    payload: dict[str, Any],
    session_id: str,
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

                    print(
                        "NEURO-SAN RAW:",
                        line,
                    )

                    # -------------------------------------------------
                    # Support both:
                    #
                    # data: {...}
                    #
                    # and:
                    #
                    # {...}
                    # -------------------------------------------------

                    data_text = line.strip()

                    if data_text.startswith("data:"):
                        data_text = (
                            data_text[len("data:"):]
                            .strip()
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

                    # -------------------------------------------------
                    # Extract response
                    # -------------------------------------------------

                    response_data = data.get(
                        "response",
                        {}
                    )

                    if not isinstance(
                        response_data,
                        dict,
                    ):
                        continue

                    # -------------------------------------------------
                    # Extract text
                    # -------------------------------------------------

                    text = response_data.get(
                        "text"
                    )

                    if text:

                        full_answer += text

                        # Send to React as SSE
                        yield (
                            "data: "
                            + json.dumps(
                                {
                                    "text": text
                                },
                                ensure_ascii=False,
                            )
                            + "\n\n"
                        )

                    # -------------------------------------------------
                    # Extract chat context
                    # -------------------------------------------------

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
                }
            )
            + "\n\n"
        )

        yield "data: [DONE]\n\n"

        return

    # =====================================================
    # Save updated Neuro-SAN context
    # =====================================================

    if latest_chat_context:

        save_chat_context(
            session_id,
            latest_chat_context,
        )

    # =====================================================
    # Save complete assistant message
    # =====================================================

    if full_answer:

        save_message(
            session_id,
            "assistant",
            full_answer,
        )

    # =====================================================
    # Stream finished
    # =====================================================

    yield "data: [DONE]\n\n"
    
@app.post("/chat")
async def chat(
    request: ChatRequest,
):

    session_id = request.session_id

    user_message = request.message.strip()

    if not user_message:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # -----------------------------------------------------
    # Create conversation
    # -----------------------------------------------------

    create_conversation(
        session_id
    )

    # -----------------------------------------------------
    # Save user message to SQLite
    # -----------------------------------------------------

    save_message(
        session_id,
        "user",
        user_message,
    )

    # -----------------------------------------------------
    # Retrieve previous Neuro-SAN context
    # -----------------------------------------------------

    previous_context = get_chat_context(
        session_id
    )

    # =====================================================
    # IMPORTANT:
    # Neuro-SAN expects user_message as an OBJECT
    # =====================================================

    payload = {
        "user_message": {
            "text": user_message
        }
    }

    # -----------------------------------------------------
    # Add previous context for multi-turn conversation
    # -----------------------------------------------------

    if previous_context:

        payload["chat_context"] = (
            previous_context
        )

    # -----------------------------------------------------
    # Debugging - can remove later
    # -----------------------------------------------------

    print("\n========== NEURO-SAN REQUEST ==========")
    print(json.dumps(
        payload,
        indent=2,
        ensure_ascii=False,
    ))
    print("========================================\n")

    # -----------------------------------------------------
    # Return streaming response
    # -----------------------------------------------------

    return StreamingResponse(
        forward_neuro_san_stream(
            payload,
            session_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# =========================================================
# Chat history
# =========================================================

@app.get(
    "/chat/history/{session_id}"
)
def chat_history(
    session_id: str,
):

    messages = get_messages(
        session_id
    )

    return {
        "session_id": session_id,
        "messages": messages,
    }


# =========================================================
# Delete chat
# =========================================================

@app.delete(
    "/chat/{session_id}"
)
def delete_chat(
    session_id: str,
):

    delete_conversation(
        session_id
    )

    return {
        "status": "deleted",
        "session_id": session_id,
    }