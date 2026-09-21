# XYZ Bank FAQ Chatbot

A simple full-stack, multi-turn FAQ chatbot built with **React, FastAPI,
SQLite, and Neuro-SAN**.

The project demonstrates how an application can combine a normal web
frontend/backend with an agentic AI network for conversation handling.
The chatbot uses a static FAQ dataset as its knowledge base and uses
Neuro-SAN to route user requests between specialized agents.

------------------------------------------------------------------------

## 1. What This Project Does

The application allows a user to have a natural conversation about a
defined set of XYZ Bank financial transaction FAQs.

The user can ask questions such as:

-   How do I make a partial withdrawal?
-   What documents do I need?
-   Which photo IDs are accepted?
-   What is a top-up?
-   How does premium redirection work?

The chatbot supports **multi-turn conversations**, so a user does not
need to repeat the topic in every message.

For example:

``` text
User: How do I make a partial withdrawal?

Bot: [Partial withdrawal information]

User: What documents do I need?

Bot: [Documents required for partial withdrawal]

User: Which IDs are accepted?

Bot: [Accepted photo IDs]
```

The system uses the conversation context to understand that the second
and third questions are still related to partial withdrawal.

The application also handles simple greetings and questions outside the
supported FAQ knowledge base.

------------------------------------------------------------------------

# 2. High-Level Architecture

``` text
                         User
                           |
                           v
                    React Frontend
                           |
                           | HTTP / SSE
                           v
                     FastAPI Backend
                           |
             +-------------+-------------+
             |                           |
             v                           v
       SQLite Database             Neuro-SAN
       chathistory.db            Agent Network
             |                           |
             |                           v
             |                  Orchestrator Agent
             |                    /      |                   |                   /       |                    |                  v        v        v
             |              FAQ Agent  Greeting  Out-of-Scope
             |                  |
             |                  v
             |             data/faqs.json
             |
             +------ Conversation History
                    + Neuro-SAN Context
```

### Main responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  React                               Chat UI, user input, streaming
                                      response display, session handling,
                                      history loading

  FastAPI                             API layer, session handling, SQLite
                                      persistence, Neuro-SAN integration,
                                      response streaming

  Neuro-SAN                           Agentic conversation logic and
                                      agent routing

  Orchestrator Agent                  Decides which specialist should
                                      handle each message

  FAQ Specialist                      Answers using the FAQ dataset

  Greeting Agent                      Handles greetings and simple
                                      conversational messages

  Out-of-Scope Agent                  Handles questions outside the
                                      supported FAQ scope

  `faqs.json`                         Static FAQ knowledge base

  SQLite                              Persists visible messages and
                                      Neuro-SAN conversation context
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Agentic Architecture

The AI part of the application is implemented as a Neuro-SAN agentic
network.

The network contains four main roles:

``` text
                    Orchestrator
                   /      |                         /       |                         v        v         v
          FAQ Specialist Greeting  Out-of-Scope
```

## Orchestrator Agent

The orchestrator receives every user message.

It considers:

-   The current message
-   Existing conversation context
-   Whether the message is a follow-up
-   Whether the user has changed topics
-   Whether the request belongs to the supported FAQ scope

It then delegates the request to the appropriate specialist.

The orchestrator does not directly answer FAQ questions.

### Example

``` text
User:
How do I make a partial withdrawal?

        |
        v

Orchestrator

        |
        v

FAQ Specialist
```

If the next message is:

``` text
What documents do I need?
```

the orchestrator uses the conversation context to understand that the
user means:

``` text
What documents do I need for a partial withdrawal?
```

and routes it to the FAQ Specialist.

------------------------------------------------------------------------

# 4. FAQ Specialist

The FAQ Specialist is responsible for factual FAQ responses.

Its source of truth is:

``` text
data/faqs.json
```

The agent is instructed to use the `read_file` tool to access the
dataset.

It should not:

-   Search the web
-   Use unrelated outside knowledge
-   Invent banking policies
-   Invent documents or procedures
-   Make up answers when information is unavailable

If the requested information is not present in the FAQ dataset, the
agent responds that the information is not available in the FAQ
knowledge base.

------------------------------------------------------------------------

# 5. Greeting Agent

The Greeting Agent handles simple conversational messages.

Examples:

``` text
Hi
Hello
Good morning
Thanks
Thank you
Bye
Goodbye
```

This keeps simple conversational handling separate from the FAQ logic.

------------------------------------------------------------------------

# 6. Out-of-Scope Agent

The Out-of-Scope Agent handles questions that are not related to the
supported XYZ Bank FAQ knowledge base.

For example:

``` text
What's the weather today?
```

or:

``` text
Explain Python decorators.
```

Instead of attempting to answer these questions using general LLM
knowledge, the agent explains that the chatbot is intended for the
supported XYZ Bank FAQ information.

------------------------------------------------------------------------

# 7. FAQ Knowledge Base

The project uses a static JSON file:

``` text
data/faqs.json
```

The dataset contains FAQ entries covering areas such as:

-   Fund Switching
-   Premium Redirection
-   Automatic Transfer Strategy
-   Portfolio Investment Strategy
-   Top-Up
-   Policy Statements
-   Partial Withdrawal

Each FAQ entry contains structured information such as:

``` text
id
category
question
answer
source
source_url
```

The FAQ dataset is intentionally kept separate from the agent
instructions.

This means the agent logic and the actual FAQ content can be changed
independently.

------------------------------------------------------------------------

# 8. Multi-Turn Conversation

Multi-turn conversation is handled using two related concepts:

### Session ID

The frontend generates a session ID for a conversation.

The same session ID is reused for all messages belonging to that
conversation.

For example:

``` text
session_id = abc-123
```

Messages:

``` text
abc-123 → How do I make a partial withdrawal?
abc-123 → What documents do I need?
abc-123 → Which IDs are accepted?
```

A new conversation receives a new session ID.

### Neuro-SAN Chat Context

Neuro-SAN returns conversation context along with the response.

FastAPI persists this context in SQLite.

For the next user message:

``` text
React
  |
  v
FastAPI
  |
  +-- retrieve previous chat_context
  |
  v
Neuro-SAN
```

This allows Neuro-SAN to understand follow-up questions without the
frontend having to reconstruct the AI context itself.

------------------------------------------------------------------------

# 9. SQLite Conversation Storage

The application uses:

``` text
chathistory.db
```

at the project root.

The database contains two application tables:

``` text
conversations
messages
```

## conversations

Stores one record for each conversation.

Important fields:

``` text
session_id
chat_context
created_at
updated_at
```

`chat_context` stores the Neuro-SAN conversation context required for
multi-turn AI interactions.

## messages

Stores the visible conversation history.

Important fields:

``` text
id
session_id
role
content
created_at
```

The `role` identifies whether a message came from:

``` text
user
```

or:

``` text
assistant
```

This separation is intentional:

``` text
messages
    ↓
What the user sees as chat history

chat_context
    ↓
What Neuro-SAN needs for conversational context
```

The frontend does not access SQLite directly.

------------------------------------------------------------------------

# 10. FastAPI Backend

The backend is located in:

``` text
backend/
├── main.py
└── database.py
```

FastAPI acts as the application layer between React, SQLite, and
Neuro-SAN.

## Main endpoints

### Health check

``` http
GET /health
```

Returns the backend service status.

------------------------------------------------------------------------

### Send a message

``` http
POST /chat
```

Request:

``` json
{
  "session_id": "abc-123",
  "message": "How do I make a partial withdrawal?"
}
```

The backend:

1.  Creates the conversation if required.
2.  Saves the user message to SQLite.
3.  Retrieves previous Neuro-SAN context.
4.  Sends the current message and context to Neuro-SAN.
5.  Streams the response back to React.
6.  Collects the complete response.
7.  Saves the assistant response to SQLite.
8.  Saves the updated Neuro-SAN context.

------------------------------------------------------------------------

### Fetch chat history

``` http
GET /chat/history/{session_id}
```

Example:

``` http
GET /chat/history/abc-123
```

Response:

``` json
{
  "session_id": "abc-123",
  "messages": [
    {
      "id": 1,
      "session_id": "abc-123",
      "role": "user",
      "content": "How do I make a partial withdrawal?",
      "created_at": "..."
    },
    {
      "id": 2,
      "session_id": "abc-123",
      "role": "assistant",
      "content": "You can make a partial withdrawal...",
      "created_at": "..."
    }
  ]
}
```

This endpoint allows the frontend to restore a conversation from SQLite.

------------------------------------------------------------------------

### Delete a conversation

``` http
DELETE /chat/{session_id}
```

Deletes the conversation and its associated messages.

------------------------------------------------------------------------

# 11. Streaming Response

The chatbot uses a streaming response between FastAPI and React.

The flow is:

``` text
Neuro-SAN
    |
    | streaming response
    v
FastAPI
    |
    | Server-Sent Events
    v
React
```

The frontend receives response chunks progressively rather than waiting
for the entire answer before displaying anything.

The FastAPI endpoint returns:

``` text
Content-Type: text/event-stream
```

Individual response events are sent in a format such as:

``` text
data: {"text":"You can make a partial withdrawal..."}
```

The stream finishes with:

``` text
data: [DONE]
```

This provides a more natural chatbot experience.

------------------------------------------------------------------------

# 12. Frontend

The frontend is implemented using React and is located in:

``` text
frontend/
```

The frontend is responsible for:

-   Displaying the chat interface
-   Accepting user messages
-   Maintaining the current session ID
-   Sending messages to FastAPI
-   Reading the streaming response
-   Displaying assistant responses progressively
-   Loading persisted chat history
-   Starting a new conversation

The frontend does **not** communicate directly with:

-   SQLite
-   Neuro-SAN
-   `faqs.json`
-   Individual agents

This keeps the frontend independent of the AI implementation.

------------------------------------------------------------------------

# 13. End-to-End Message Flow

For a normal FAQ question:

``` text
1. User types:
   "How do I make a partial withdrawal?"
             |
             v
2. React sends:
   POST /chat
             |
             v
3. FastAPI saves the user message
   to chathistory.db
             |
             v
4. FastAPI retrieves previous
   Neuro-SAN chat_context
             |
             v
5. FastAPI sends the request
   to Neuro-SAN
             |
             v
6. Orchestrator decides:
   FAQ Specialist
             |
             v
7. FAQ Specialist reads:
   data/faqs.json
             |
             v
8. FAQ answer is generated
             |
             v
9. Neuro-SAN returns response
   and updated chat_context
             |
             v
10. FastAPI streams response
    back to React
             |
             v
11. FastAPI saves:
    - assistant message
    - updated chat_context
             |
             v
12. React displays the response
```

------------------------------------------------------------------------

# 14. Example Multi-Turn Flow

A complete conversation can look like:

``` text
User:
How do I make a partial withdrawal?

        ↓

Orchestrator
        ↓
FAQ Specialist
        ↓
data/faqs.json

Bot:
[Partial withdrawal answer]


User:
What documents do I need?

        ↓

Orchestrator
        ↓
Uses conversation context
        ↓
FAQ Specialist
        ↓
data/faqs.json

Bot:
[Documents required for partial withdrawal]


User:
Which IDs are accepted?

        ↓

Orchestrator
        ↓
Uses existing context
        ↓
FAQ Specialist

Bot:
[Accepted photo IDs]


User:
What is a top-up?

        ↓

Orchestrator
        ↓
Recognizes new FAQ topic
        ↓
FAQ Specialist

Bot:
[Top-up answer]
```

This demonstrates both **follow-up understanding** and **topic
switching**.

------------------------------------------------------------------------

# 15. Project Structure

The important application-level structure is:

``` text
FAQ-Chatbot/
│
├── backend/
│   ├── main.py
│   └── database.py
│
├── frontend/
│   └── React application
│
├── data/
│   └── faqs.json
│
├── registries/
│   └── generated/
│       └── xyz_bank_faq_chatbot.hocon
│
├── config/
│   └── llm_config.hocon
│
├── coded_tools/
├── mcp/
├── middleware/
├── logs/
│
├── agentic-workflow/
│
├── chathistory.db
├── nss_local.db
│
├── .env
├── pyproject.toml
├── uv.lock
└── README.md
```

### Application-owned files

These are the main parts developed for the chatbot:

``` text
backend/
frontend/
data/
chathistory.db
agentic-workflow/
```

### Neuro-SAN project infrastructure

These directories support the Neuro-SAN runtime and generated network:

``` text
config/
registries/
coded_tools/
mcp/
middleware/
logs/
nss_local.db
```

They are kept at the project root because the Neuro-SAN setup uses the
existing project structure and relative configuration paths.

------------------------------------------------------------------------

# 16. Configuration

The LLM configuration is stored in:

``` text
config/llm_config.hocon
```

The current setup uses Google Gemini through the configured LangChain
Google Generative AI integration.

The API key is stored through the environment configuration rather than
hard-coded into application source code.

The Neuro-SAN generated network is configured in:

``` text
registries/generated/xyz_bank_faq_chatbot.hocon
```

This file defines the agent network, agent instructions, and available
tools.

------------------------------------------------------------------------

# 17. Running the Application

The project uses `uv` for Python environment and dependency management.

### Start Neuro-SAN

From the project root:

``` powershell
uv run ns run
```

This starts the Neuro-SAN service and its associated Studio/runtime
components.

### Start FastAPI

In another terminal:

``` powershell
uv run uvicorn backend.main:app --reload --port 8000
```

FastAPI runs at:

``` text
http://localhost:8000
```

### Start the React frontend

From the frontend directory, use the project's configured frontend
command.

Typically:

``` powershell
cd frontend
npm run dev
```

The React application runs on the configured Vite development port,
normally:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# 18. What Has Been Implemented

The project currently includes the following functionality:

### Full-stack application

-   React frontend
-   FastAPI backend
-   Neuro-SAN agentic network
-   SQLite persistence

### Agentic workflow

-   Orchestrator Agent
-   FAQ Specialist Agent
-   Greeting Agent
-   Out-of-Scope Agent
-   Agent delegation based on the current message and conversation
    context

### FAQ knowledge

-   Static JSON FAQ dataset
-   `read_file` tool access
-   Grounded FAQ responses
-   No web search for FAQ answers
-   No intentional use of outside knowledge for FAQ responses

### Multi-turn conversation

-   Session ID based conversations
-   Neuro-SAN `chat_context`
-   Follow-up question handling
-   Topic switching
-   Context persistence

### Chat persistence

-   User messages saved to SQLite
-   Assistant messages saved to SQLite
-   Neuro-SAN context saved to SQLite
-   Chat history API
-   Conversation deletion API

### User experience

-   Streaming assistant responses
-   Chat history restoration through the backend API
-   Separate handling for greetings and out-of-scope questions

------------------------------------------------------------------------

# 19. Why This Architecture Was Chosen

The project is intentionally simple.

The goal is not to build a large production banking assistant. The goal
is to demonstrate the core concepts required for an agentic FAQ chatbot:

``` text
Static Knowledge Base
        +
Agentic Routing
        +
Multi-Turn Context
        +
Backend API
        +
Persistent History
        +
Streaming UI
```

Each part has a clear responsibility.

The architecture can also be extended later without replacing the
existing foundation. For example, additional specialist agents or
additional knowledge sources could be introduced while keeping the same
basic orchestrator → specialist pattern.

------------------------------------------------------------------------

# 20. Current Scope and Limitations

This is a demonstration/assignment application.

The FAQ knowledge base is static and stored locally in:

``` text
data/faqs.json
```

The chatbot is intentionally limited to the information represented in
that dataset.

The application currently focuses on:

-   FAQ retrieval
-   Agent routing
-   Multi-turn conversations
-   Conversation persistence
-   Streaming responses

It is not intended to perform real banking transactions or access live
customer account information.

------------------------------------------------------------------------

# 21. Simple Summary

In simple terms, this project is a **full-stack FAQ chatbot where
Neuro-SAN acts as the conversation and agent-routing layer**.

The user talks to the React application.

FastAPI acts as the bridge between the frontend, database, and AI
system.

Neuro-SAN decides which agent should handle the request.

The FAQ Specialist uses the static FAQ dataset to answer supported
questions.

SQLite remembers the conversation history and the AI conversation
context.

Together, the pieces provide a small but complete example of an
**agentic, multi-turn, full-stack AI application**.
