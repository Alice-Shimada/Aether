# IPK Plan Overview

## Opening Explanation

If this plan needs to be explained in a clear, linear way, I would introduce it like this:

1. The first problem `IPK` tries to solve is that research and learning constantly produce valuable ideas, questions, discussions, and intuitions, but these are hard to preserve cheaply and even harder to reuse later in a meaningful way.

2. The second problem is that modern AI knows a lot, but it usually does not understand what a specific user already knows, how that user prefers to learn, or what kind of answer style actually fits that person.

3. So this plan is not simply a note-taking project, and not simply a stronger AI assistant; it is an attempt to place “long-term content memory” and “long-term understanding of the user” inside one larger framework.

4. Another key principle is that the user should only need to focus on surface-level input: the actual ideas, physics questions, judgments, and requests they want to express; the internal storage structure, map system, layering, and optimization should be handled automatically by the AI in the background.

5. The first part of that framework is the `piece` library system, which stores ideas, knowledge, discussions, reflections, project fragments, and plans as reusable cognitive units.

6. A `piece` is not just raw text; it also includes structure, AI-facing surface layers, and links to other pieces, so that it can be searched, connected, and reused instead of merely archived.

7. To avoid making the AI read large amounts of full text all the time, we divide the AI-facing view of a piece into three layers: one for quick direction, one for deciding whether to go deeper, and one for freer association.

8. But pieces alone are still not enough, because once the library becomes large, the AI cannot search it blindly every time, so the system also needs many prebuilt “maps,” such as maps by project, time, domain, method, unresolved question, and relationship.

9. These maps are not singular, and the system should not stop at only two levels; it should work more like a multi-layer navigation structure in which the AI first chooses the right map, then moves layer by layer toward the relevant pieces.

10. To make this practical, we want users to be able to generate a piece from a chat, a text input, or a WeChat exchange with one click, while the AI does the structural work and the user mainly checks whether the captured content is correct.

11. In addition to the content library, the plan also includes a second independent system: a user style and adaptation system that gradually learns how the user prefers to be taught, guided, and engaged in discussion.

12. This adaptation system should not change the user model after every single conversation; instead, it should extract small signals from each session, accumulate them across many sessions, and only then update a more stable profile and strategy.

13. In the end, these two systems work together: the content library provides what the user has thought, learned, tried, and struggled with, while the adaptation system provides how the user is best helped, so that the AI can become a real long-term assistant.

14. So if the whole project has to be summarized in one sentence, it is not a new note feature but a long-term personal cognitive system whose goal is to organize both the user’s content and the AI’s understanding of the user, so that learning and research can be accumulated, reused, and developed over time.

## One-line Summary

`IPK` can be understood as `Idea + Knowledge`.

It is not meant to be just a note-taking system, and not just an AI that answers questions.  
The goal is to build a long-term companion system for researchers and learners:

- it turns scattered ideas and discussions into reusable cognitive assets
- it helps the AI gradually understand the user's knowledge system, preferences, and style
- it makes future learning, research, reflection, and Q&A feel more like working with an assistant that remembers, understands, and helps organize

---

## 1. What Problems Are We Trying to Solve?

This plan mainly addresses three kinds of problems.

### 1.1 Too Many Valuable Ideas Get Lost

In real research and learning, many useful things appear in incomplete form:

- a sudden idea
- a question that is not fully formed yet
- an intuition that emerges during discussion
- a half-finished derivation
- a judgment that feels important but is still unclear

If you do not record them, they disappear quickly.  
If you write each one carefully as a polished note, it costs too much time.

So we need something that allows:

- low-friction capture
- high-quality organization
- later reuse and rediscovery

### 1.2 AI Knows a Lot, But It Does Not Know “Me”

Modern AI knows a lot of physics, but it usually does not know:

- what the user already understands
- which formalism the user prefers
- whether the user wants intuition first or proof first
- whether the user is cautious or exploratory
- whether the user wants conservative answers or more open speculation

So even when the AI “knows the subject,” it may still answer in the wrong way for that particular person.

### 1.3 Past Thinking Does Not Naturally Become Long-term Structure

Research and learning are not only about solving the current problem.  
People also need to look back and ask:

- What did I actually do in the last three months?
- Which questions keep returning?
- Which ideas are slowly becoming directions?
- Where have I been stuck for a long time?
- Which habits help me, and which ones should change?

So the system should not only “store things.”  
It should help with:

- organizing
- reflecting
- summarizing
- developing

---

## 2. The Core Idea

In the end, we split the plan into two cooperating systems.

```text
               +------------------------------+
               |  System A: Piece / IPK Library |
               |  Stores "content"             |
               +------------------------------+
                            |
                            | Provides reusable material
                            v
               +------------------------------+
               | System B: User Style / Adaptation |
               | Stores "how this user works"      |
               +------------------------------+
                            |
                            | Shapes future answers
                            v
               +------------------------------+
               |          The AI Assistant     |
               +------------------------------+
```

### 2.1 System A: The IPK / Piece Library

This system stores content.

That includes:

- what the user thought about
- what the user discussed
- what the user learned
- where the user got stuck
- what projects, questions, plans, and reflections have formed

Its smallest unit is called a `piece`.

A `piece` is a cognitive unit. It does not have to be a polished note or a finished article.  
It can be:

- an idea
- a knowledge item
- a discussion summary
- a reflection
- a project fragment
- a future plan

### 2.2 System B: User Style / Adaptation System

This system does not store content.  
It stores the user model.

That means:

- how the user likes explanations
- what kind of answers the user dislikes
- whether the user prefers intuition first or argument first
- what style works better for learning
- what style works better for research

Its job is not to blindly follow the user.  
Its job is to:

- understand the user
- adapt to the user
- and sometimes gently correct unhelpful habits

---

## 3. How the IPK Library Works

### 3.1 What Is a Piece?

A `piece` is the smallest unit in the library.

One piece may be:

- an idea
- a knowledge item
- a structured discussion
- a review
- a project fragment
- a plan

A piece is not just a Markdown file.  
It is a small bundle of information:

```text
piece
 ├─ main content
 ├─ structural metadata
 ├─ AI-facing surface layer
 └─ relationships to other pieces
```

### 3.2 Why Not Just Store Plain Notes?

Because the future library may contain a very large number of pieces.  
If the AI has to read large amounts of raw text every time, it becomes:

- slow
- expensive
- inaccurate
- context-heavy

So each piece needs more than just a body of text.

### 3.3 The Three Surface Layers

We eventually divided the AI-facing surface into three layers:

```text
catalog   -> quick direction
retrieve  -> decide whether to go deeper
associate -> decide whether to branch outward
```

You can think of them like this:

- `catalog`: map entry
- `retrieve`: precise judgment
- `associate`: flexible association

#### `catalog`

This tells the AI:

- what this piece is roughly about
- which domain it belongs to
- which methods it uses
- which project it belongs to

#### `retrieve`

This tells the AI more precisely:

- what problem the piece is addressing
- what questions it raises
- what claims it currently makes
- what remains unresolved

#### `associate`

This tells the AI:

- where this piece might inspire other questions
- how it may connect to methods, structures, or older problems

---

## 4. Maps Are a Key Part of the Design

One of the most important conclusions from the discussion was:

**The AI should not search the whole library blindly. It should be given maps first.**

### 4.1 What “Maps” Means Here

These are not visual maps in the narrow sense.  
They are pre-organized entry views, such as:

- by project
- by time
- by domain
- by method
- by unresolved questions
- by relationships between pieces

So the AI does not always start from the full library. Instead, it can:

1. look at maps first
2. find promising regions
3. inspect a small number of surfaces
4. only read full content when necessary

### 4.2 Why Maps Matter

Maps do not replace content.  
They help by:

- giving the AI a good starting point
- reducing search burden
- improving retrieval precision
- preserving room for creative association

This led to one of the core principles:

> Maps guide.  
> Surfaces judge.  
> Full content confirms.

### 4.3 Maps Are Not Singular

There is not one single master map.  
There should be a family of maps, each offering a different entry view.

For example:

- project maps
- time maps
- domain maps
- method maps
- unresolved-question maps
- relationship maps

And in the long run, this system should not stop at only two levels.  
It should behave more like a multi-layer navigation structure:

- high level: overview maps
- middle level: regional or topic maps
- lower level: piece surfaces
- final level: full content

In other words, this is not “a folder plus a search box.”  
It is “stable storage + multiple maps + multi-layer navigation.”

---

## 5. How a Piece Enters the Library

The goal is not to make users fill out technical fields manually.  
The process should feel lightweight.

The intended flow is:

```text
a chat / a text input / a WeChat exchange
        ↓
one-click piece generation
        ↓
AI organizes the content and structure
        ↓
the user mainly checks whether the content is right
        ↓
the piece is committed into the library
        ↓
maps update automatically
```

### 5.1 What the User Mainly Checks

The user mainly reviews:

- the title
- the body summary
- the main body

The user is not expected to decide:

- what the `type` should be
- which fields are best for retrieval
- which fields are best for association

Those are system responsibilities.

### 5.2 Why This Matters

The user is not designing an AI retrieval system.  
The user knows:

- what matters
- what was omitted
- whether the discussion was captured correctly

So the human should check the content, not the underlying machine structure.

---

## 6. How the Style / Adaptation System Works

This is the second independent system.

It does not store “what the user thought.”  
It stores “how the user prefers to be helped.”

### 6.1 It Should Not Be Too Sensitive

We explicitly agreed that the system should not overreact to one single conversation.

So the path should look like this:

```text
style signals from one session
        ↓
accumulation across multiple sessions
        ↓
periodic summary
        ↓
stable profile update
        ↓
future answers become better adapted
```

### 6.2 What It Tracks

For example:

- whether the user prefers rigor or intuition
- whether the user wants answers to start from familiar knowledge
- whether research questions need stronger boundary statements
- whether learning questions should be more step-by-step
- whether the user is open to more associative exploration

### 6.3 It Should Not Become a Purely Obedient System

Another important conclusion was that the system should not only adapt.  
It should also preserve a small corrective role.

For example:

- if the user is consistently too cautious, the system may gently encourage more exploration
- if the user tends to skip too many steps, the system may add more argument and structure

So this is not just a “preference memory” system.  
It is a long-term interaction strategy system.

---

## 7. What the Future User Experience Could Feel Like

If this plan is gradually built out, the ideal experience might look like this.

### Scenario 1: Turning a Discussion Into Long-term Memory

After an important exchange with the AI, the user can turn it into a piece with one click.  
Later, it can be found again by project, topic, time, question, or relationship.

### Scenario 2: Ordinary Q&A Can Use the User’s Long-term Library

When the user asks a physics question, the AI does not only provide a generic answer.  
It can also draw on:

- what the user has discussed before
- what the user already knows
- how the user prefers to understand things
- whether the library contains relevant ideas, methods, or earlier questions

### Scenario 3: Reviewing the Last Few Months

The user can ask:

- What have I been working on recently?
- What paths has this project already tried?
- Which questions keep returning?
- Has my research style changed recently?

The system should not just retrieve. It should help summarize and organize.

### Scenario 4: The AI Becomes More Like a Long-term Assistant

Over time, the AI learns:

- where to start
- when to be more rigorous
- when to be more exploratory
- when to remind the user of boundaries
- when to follow the user’s rhythm and when to gently push it

---

## 8. Why This Design Is Strong

### 8.1 It Is Not Just a Notes App

It connects content, structure, relationships, maps, and long-term usage into one system.

### 8.2 It Supports Both Precision and Association

This matters because real research needs both:

- finding the right thing
- and making new connections

### 8.3 It Separates “Understanding Content” from “Understanding the User”

That makes the whole system cleaner and more stable:

- the `piece` system handles knowledge and ideas
- the adaptation system handles interaction style and long-term fit

### 8.4 It Respects the User Without Blindly Following the User

That makes it closer to a real long-term collaborator than a tool that only imitates habits.

### 8.5 It Fits Naturally Into the Current Aether Project

Because Aether already has:

- a session system
- a skill system
- a knowledge-base system
- WeChat connectivity
- a global event layer

So IPK is not a completely separate invention.  
It is a next step built on top of an existing foundation.

---

## 9. High-level Architecture Diagram

Here is the simplest way to explain the architecture:

```text
                   User's everyday interaction
      (chat / WeChat / Q&A / research discussion / learning)
                              |
          ------------------------------------------------
          |                                              |
          v                                              v
  +---------------------+                      +-----------------------+
  |   Piece / IPK Library |                      | Style / Adaptation System |
  |   stores content      |                      | stores user tendencies     |
  +---------------------+                      +-----------------------+
          |                                              |
          | provides knowledge, paths, history           | shapes future answers
          ------------------------------------------------
                              |
                              v
                    +----------------------+
                    |    The AI Assistant  |
                    | understands more over time |
                    +----------------------+
```

---

## 10. Final Summary

If I had to explain the whole plan in one paragraph, I would say:

> We are not designing a new note feature.  
> We are designing a long-term personal cognitive system.  
> One part turns ideas, knowledge, discussions, and reflections into a reusable `piece` library.  
> Another part gradually helps the AI understand the user’s background, preferred explanation style, and research habits.  
> The long-term goal is not only to answer questions, but to build an AI assistant that can remember, organize, support, and develop the user’s learning and research process over time.

---

## 11. What This Overview Does Not Cover

For presentation purposes, this document intentionally does not go deep into:

- low-level schema details
- API design
- implementation steps
- module-level engineering split

Those have already been discussed in the other files under `docs/IPK/`, and can be used later for technical review or implementation planning.
