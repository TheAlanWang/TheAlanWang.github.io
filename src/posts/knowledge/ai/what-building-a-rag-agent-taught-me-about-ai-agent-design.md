---
layout: layouts/post.njk
title: "Inside a RAG Agent: Runtime, Memory, Tools, and Retrieval"
description: "Five design boundaries inside a LangGraph RAG agent: control flow, safety and tools, retrieval compatibility, checkpointed memory, and session isolation."
excerpt: "Five design boundaries inside a LangGraph RAG agent: control flow, safety and tools, retrieval compatibility, checkpointed memory, and session isolation."
date: 2026-06-17
category: Knowledge
subcategory: AI
topic: Agents
kind: Note
tags:
  - posts
image: /assets/sketches/rag-agent-design-lessons.svg
imageFit: contain
permalink: /posts/what-building-a-rag-agent-taught-me-about-ai-agent-design/index.html
---

This agent becomes easier to understand when the implementation is reduced to five boundaries: **control flow, safety and tool contracts, retrieval compatibility, checkpointed memory, and session isolation**.

The implementation is a LangGraph RAG chat agent built around Gemini, Vertex AI embeddings, Supabase/pgvector, and LangGraph checkpointing. The important part is not any one library. It is how these parts divide responsibility.

![Inside a RAG agent: five design boundaries](/assets/sketches/rag-agent-design-lessons.svg)

## 1. The Graph Controls Execution; The Model Chooses The Path

The request enters through `run_agent`, which resolves a thread, creates a `HumanMessage`, and calls `graph.invoke`.

```text
run_agent(text, user_id, conn_id)
    -> graph.invoke
    -> assistant
       -> tool call? -> tools -> assistant -> ...
       -> final answer? -> END
```

The graph contains only two nodes:

```python
builder.add_node("assistant", assistant)
builder.add_node("tools", ToolNode(tools))

builder.add_edge(START, "assistant")
builder.add_conditional_edges("assistant", tools_condition)
builder.add_edge("tools", "assistant")
```

The important design choice is that **retrieval is not hard-coded into every request**. The LLM receives bound tool definitions and decides whether it needs `search_supabase`. LangGraph's `tools_condition` inspects the response: a tool call continues the loop, while a normal answer ends it.

The model decides **what should happen next**. The graph decides **how that decision is executed**.

## 2. Safety And Tool Descriptions Are Part Of The Agent Contract

The `assistant` node performs a safety check only when the newest message is a fresh `HumanMessage`:

```python
if isinstance(last_message, HumanMessage):
    dangerous, irrelevant, personal = prompt_check(last_message.content)
    if dangerous or personal or irrelevant:
        return {"messages": [AIMessage(content="I'm sorry, I can't answer that question.")]}
```

This placement matters. Tool results and prior AI messages should not be reinterpreted as new user input.

The tools are then bound to Gemini:

```python
tools = [search_supabase, log_gap]
llm_with_tools = llm.bind_tools(tools)
```

For tool-calling agents, **function names, parameter names, and docstrings are model-facing instructions**. The `search_supabase` docstring becomes part of the tool schema that Gemini sees. Tool design is therefore partly API design and partly prompt design.

There is also an explicit temporary constraint: `log_gap` is disabled because its table still stores 384-dimensional vectors while the current query embeddings are 768-dimensional. Returning a controlled message is safer than writing incompatible vectors.

## 3. Retrieval Has A Strict Embedding Contract

The retrieval path is:

```text
search_supabase(query)
    -> Vertex text-embedding-004
    -> 768-dimensional RETRIEVAL_QUERY vector
    -> match_document_sections RPC
    -> cosine KNN + priority rerank
    -> similarity threshold
    -> relevant chunks or "I do not know"
```

The most important rule is: **query embeddings and document embeddings must live in the same vector space**.

The corpus was embedded with Vertex AI `text-embedding-004`, 768 dimensions, using the document retrieval task type. The query must therefore use:

```python
types.EmbedContentConfig(
    task_type="RETRIEVAL_QUERY",
    output_dimensionality=768,
)
```

Switching the query side to an AI Studio embedding model would not be an interchangeable upgrade. It would produce a different vector space, making similarity scores meaningless even if the dimensions happened to match.

The code also separates two authentication paths:

- **Gemini generation** uses `GEMINI_API_KEY`.
- **Vertex embeddings** use `GCP_SA_JSON` in production or Application Default Credentials locally.

After retrieval, a `0.6` similarity floor filters weak results. If no chunk passes, the tool returns `"I do not know the answer"` rather than grounding the LLM on noisy context.

## 4. Conversation Memory Belongs To The Checkpointer

The assistant node does not manually load or save chat history:

```python
def assistant(state):
    messages = state["messages"]
    ...
```

History is injected by the checkpointer compiled into the graph:

```python
graph = builder.compile(checkpointer=checkpoint_saver)
```

When `SUPABASE_DB_URL` is available, the agent uses LangGraph's official `PostgresSaver` over Supabase Postgres. Its setup creates the checkpoint tables and LangGraph persists state around every invocation.

```python
checkpoint_saver = PostgresSaver(connection)
checkpoint_saver.setup()
```

Without a database URL, the application falls back to `InMemorySaver`. That keeps local development working, but memory becomes ephemeral and disappears when the process restarts.

This is a clean separation of concerns: **nodes implement behavior; the runtime implements persistence**.

## 5. Thread IDs Define Session Isolation

Checkpointed memory is only safe if each conversation receives the correct `thread_id`.

```python
def resolve_thread_id(user_id, conn_id):
    if user_id and str(user_id).strip().lower() not in ANON_SENTINELS:
        return f"user:{str(user_id).strip()}"
    return f"anon:{conn_id}"
```

The policy is:

- authenticated users receive a stable `user:<id>` thread
- anonymous visitors receive an `anon:<conn_id>` thread scoped to one WebSocket connection
- values such as `""`, `"anon"`, `"null"`, and `"undefined"` are treated as anonymous sentinels rather than shared identities

This prevents anonymous users from collapsing into one shared conversation history.

There is still a separate production concern: until the backend verifies an authentication token, a client-supplied `user_id` can be spoofed. **Thread resolution provides isolation only when the identity feeding it is trustworthy.**

The `conn_id` must also be generated once per WebSocket connection, not once per message. If it changed every turn, anonymous users would lose multi-turn memory.

## The System In One Sentence

**The model chooses whether to answer or retrieve; LangGraph executes the loop; Vertex and pgvector enforce the retrieval contract; the checkpointer persists state; and `thread_id` determines who owns that state.**
