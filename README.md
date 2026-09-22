# FAQ Chatbot — Agent Architecture

## Overview

This chatbot uses an agentic network built with Neuro-SAN.

Instead of asking one AI agent to handle every kind of message, we have a **main agent that decides which specialist should handle the message**.

For example:

- **"Hi"** → Greeting Agent
- **"How do I make a partial withdrawal?"** → FAQ Specialist
- **"What's the weather today?"** → Out-of-Scope Agent

This keeps each agent focused on one responsibility and makes the chatbot easier to understand and maintain.

## Docker Compose

The complete application is containerized and orchestrated using Docker Compose.

The Compose setup includes three services:

- **Frontend** — React application
- **Backend** — FastAPI application
- **Neuro-SAN** — Agentic network and LLM integration

The services are connected automatically by Docker Compose, so the application can be started with a single command.

## How to Run the Application

### Prerequisites

- Docker Desktop
- Gemini API key

No local Python, Node.js, or Neuro-SAN installation is required.

### 1. Configure environment

Create a `.env` file in the same directory as `docker-compose.yml`:

```text
GEMINI_API_KEY=your_key_here
```

### 2. Pull images

```bash
docker compose pull
```

This pulls the published frontend, backend, and Neuro-SAN images from Docker Hub.

### 3. Start the application

```bash
docker compose up
```

### 4. Open the application

Open:

```text
http://localhost:3000
```

### 5. Test

Try the following:

- Ask an FAQ question
- Ask a follow-up question
- Test conversation history
- Test the Greeting Agent
- Test an out-of-scope question
- Create a new chat
- Refresh the browser and verify conversation history

Example:

```text
User: What is fund switching?

User: How many times can I do it?
```

### 6. Stop

```bash
docker compose down
```

## High-Level Architecture

```text
                         User
                           |
                           v
                    React Frontend
                           |
                           v
                       FastAPI
                           |
                           v
                Neuro-SAN Agent Network
                           |
                           v
                   Orchestrator Agent
                    /       |       \
                   /        |        \
                  v         v         v
          FAQ Specialist  Greeting  Out-of-Scope
                |
                v
          data/faqs.json
```

The frontend does not communicate directly with the individual agents.

It sends the user's message and conversation ID to FastAPI. FastAPI retrieves the relevant conversation context and forwards the request to the Neuro-SAN network, where the orchestrator decides which specialist should handle it.

## 1. Orchestrator Agent

The **Orchestrator** is the main decision-maker.

It receives every user message and decides which specialist agent should handle it.

It does not answer FAQ questions itself. It uses:

- The current user message
- The available conversation context

to determine which specialist agent should handle the request.

### Example

User:

> How do I make a partial withdrawal?

The orchestrator identifies this as an FAQ question and sends it to the **FAQ Specialist**.

If the next message is:

> What documents do I need?

the available conversation context helps Neuro-SAN understand that the question is a follow-up to the previous request.

## 2. FAQ Specialist Agent

The **FAQ Specialist** answers questions related to the bank's supported FAQ information.

Its factual source is:

```text
data/faqs.json
```

It uses the `read_file` tool to access the FAQ dataset and use the relevant information to answer the user's question.

It is instructed not to:

- Make up information
- Use outside knowledge
- Search the web
- Invent banking policies or procedures

If the requested information is not available in the FAQ dataset, it tells the user that the information is not available in the knowledge base.

### Example

User:

> How do I make a partial withdrawal?

The FAQ Specialist accesses the FAQ dataset and returns the relevant information.

If the user then asks:

> Which photo IDs are accepted?

the conversation context helps the agent understand that the question is related to the previous partial-withdrawal request.

## 3. Greeting Agent

The **Greeting Agent** handles simple conversational messages such as:

- Hi
- Hello
- Good morning
- Thanks
- Thank you
- Bye
- Goodbye

It responds briefly and naturally.

It does not handle substantive banking questions.

For example:

> User: Hi

The Greeting Agent can respond:

> Hello! How can I help you with your XYZ Bank questions today?

## 4. Out-of-Scope Agent

The **Out-of-Scope Agent** handles questions that are unrelated to the supported FAQ knowledge base.

For example:

> What's the weather today?

or:

> Explain Python decorators.

The chatbot is designed for XYZ Bank FAQ questions, so this agent politely explains what the chatbot can help with instead of trying to answer the unrelated question using general AI knowledge.

## How Multi-Turn Conversation Works

Multi-turn conversation is an important part of the architecture.

The chatbot does not treat every message as a completely separate question.

For example:

```text
User: How do I make a partial withdrawal?

Bot:  [Partial withdrawal information]

User: What documents do I need?

Bot:  [Documents required for partial withdrawal]

User: Which IDs are accepted?

Bot:  [Accepted photo IDs]
```

The second and third questions are short, but the chatbot can understand them because the conversation context is carried forward.

The **conversation ID** identifies the individual chat, while the **session ID** groups conversations belonging to the same session.

For each conversation, the backend stores the user and assistant messages as well as the Neuro-SAN `chat_context` in SQLite.

For a subsequent message, the backend retrieves the stored `chat_context` and sends it to Neuro-SAN together with the new user message. After the response, the updated context is persisted again.

This allows Neuro-SAN to maintain conversational continuity without the backend having to reconstruct the entire conversation history for every request.

## Why Use Multiple Agents?

The chatbot could technically be built with one large prompt, but separating responsibilities makes the architecture clearer.

| Agent | Responsibility |
|---|---|
| **Orchestrator** | Understand the request and decide which agent should handle it |
| **FAQ Specialist** | Access and answer from `data/faqs.json` |
| **Greeting Agent** | Handle greetings, thanks, and simple conversation |
| **Out-of-Scope Agent** | Handle questions outside the FAQ knowledge base |

This separation also makes it easier to add another specialist later if the chatbot grows.

## Conversation Persistence

SQLite is used to persist conversation data.

The data model is:

```text
Session
   |
   +---- Conversation
   |          |
   |          +---- Messages
   |          |
   |          +---- chat_context
   |
   +---- Conversation
              |
              +---- Messages
              |
              +---- chat_context
```

### Session

A `session_id` represents the application session.

### Conversation

A `conversation_id` represents one individual chat. Each new chat gets a new conversation ID.

### Messages

User and assistant messages are stored against the corresponding conversation.

### Chat Context

The Neuro-SAN `chat_context` is stored with the conversation so that it can be supplied on subsequent requests.

This provides both:

- Persistent chat history for the frontend
- Context continuity for Neuro-SAN

## End-to-End Flow

```text
1. User enters a message
        |
        v
2. React sends message + conversation ID to FastAPI
        |
        v
3. FastAPI retrieves the conversation's chat_context
        |
        v
4. FastAPI sends the message + chat_context to Neuro-SAN
        |
        v
5. Orchestrator selects the appropriate specialist
        |
        v
6. Specialist processes the request
        |
        v
7. FAQ Specialist uses data/faqs.json when required
        |
        v
8. Neuro-SAN streams the response back to FastAPI
        |
        v
9. FastAPI streams the response to React
        |
        v
10. Messages and updated chat_context are persisted in SQLite
```

The frontend does not need to know which agent handled the question. It simply sends the message and displays the response.

## Streaming

The chatbot uses Server-Sent Events (SSE) to stream responses.

```text
Gemini
   |
   v
Neuro-SAN
   |
   | streaming response
   v
FastAPI
   |
   | SSE
   v
React
```

This allows the frontend to display the response incrementally instead of waiting for the complete response.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React + TypeScript |
| Backend | FastAPI |
| Agent Framework | Neuro-SAN |
| LLM | Gemini |
| Database | SQLite |
| Containerization | Docker |
| Orchestration | Docker Compose |
| CI/CD | GitHub Actions |
| Image Registry | Docker Hub |

## Project Structure

```text
faq-chatbot/
│
├── README.md
├── docker-compose.yml
├── Dockerfile.neurosan
├── .dockerignore
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   └── database.py
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│
├── data/
│   └── faqs.json
│
├── config/
│   └── llm_config.hocon
│
├── registries/
│   └── generated/
│
└── .github/
    └── workflows/
        └── docker.yml
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/sessions` | Create a new session |
| `POST` | `/conversations` | Create a new conversation |
| `GET` | `/conversations/{session_id}` | List conversations for a session |
| `POST` | `/chat` | Send a message and receive a streamed response |
| `GET` | `/chat/history/{session_id}/{conversation_id}` | Retrieve conversation messages |

## FAQ Dataset

The chatbot uses a static FAQ dataset stored at:

```text
data/faqs.json
```

The dataset contains FAQ information covering areas such as:

- Fund Switching
- Premium Redirection
- Automatic Transfer Strategy
- Portfolio Investment Strategy
- Top-Up
- Policy Statements
- Partial Withdrawal

The FAQ Specialist uses the `read_file` tool to access this dataset.

The knowledge source is intentionally restricted to the provided FAQ dataset so that the chatbot does not invent unsupported banking information.

## Dockerization

The application is divided into three containers:

```text
Frontend Container
      |
      v
Backend Container
      |
      v
Neuro-SAN Container

```

The frontend, backend, and Neuro-SAN runtime are containerized and can be started together using Docker Compose.

## CI/CD

GitHub Actions is configured to run when changes are pushed to the `main` branch.

The workflow:

1. Checks out the repository
2. Logs in to Docker Hub using GitHub Secrets
3. Builds the backend image
4. Builds the frontend image
5. Builds the Neuro-SAN image
6. Pushes all three images to Docker Hub

The published images are:

```text
lakshmipriya1097/faq-frontend:latest
lakshmipriya1097/faq-backend:latest
lakshmipriya1097/faq-neurosan:latest
```

## Security and Secrets

The Gemini API key is not stored in the repository.

Local development uses a `.env` file:

```text
GEMINI_API_KEY=your_key_here
```

The `.env` file is excluded through `.gitignore` and Docker ignore rules.

The repository includes `.env.example` as a template without a real API key.
