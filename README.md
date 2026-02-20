# TEAS – The Entropic Archival System

A cloud-inspired archival simulation that models long-term storage decay and makes autonomous, irreversible preservation decisions based on semantic value. Built for **Problem Statement 1 (PS1)**.

---
## Live Depolyment
https://the-entropic-archival-system.vercel.app

---

## Overview
TEAS simulates a distributed archival system over **60 years**, where storage capacity gradually decays. Unlike traditional storage, TEAS focuses on **preserving knowledge**, not just files.

* **Autonomous Decisions:** The system decides what to keep, compress, summarize, or delete.
* **Semantic Valuation:** Decisions are based on the inherent importance of the data rather than just timestamps.

---

## Core Idea
Instead of binary deletion, TEAS utilizes **progressive irreversible degradation**. As storage shrinks, data transitions through stages to save space while retaining meaning.



**The Pipeline:**
`FULL` → `COMPRESSED` → `SUMMARIZED` → `MINIMAL` → `DELETED`

---

## Simulation Model
* **Total Duration:** 60 simulated years
* **Capacity Decay:** 5% every 2 years
* **Total Decay Events:** 30
* **Final Capacity:** ~21% of original volume

---

## Semantic Valuation
Each archival item is scored across three dimensions to determine its "survival" priority:

1.  **Relevance:** Long-term importance and utility.
2.  **Uniqueness:** Lack of redundancy compared to other items.
3.  **Reconstructability:** The ease with which meaning can be rebuilt from a summary.

> **Note:** The final semantic score is a weighted combination of these dimensions, which can be tuned in the settings.

---

## System Architecture
The system follows a cloud-inspired separation of concerns:

1.  **Compute Layer:** Handles the simulation engine, decay logic, and semantic scoring.
2.  **Storage Layer:** Manages the actual archive items and their various degraded representations.
3.  **Metadata Layer:** Tracks semantic scores, degradation history, and query signals.

---

## Progressive Degradation Stages

| Stage | Description |
| :--- | :--- |
| **FULL** | Original, un-degraded content. |
| **COMPRESSED** | Lossless compression. |
| **SUMMARIZED** | AI-generated summary of the core meaning. |
| **MINIMAL** | Metadata and keywords only. |
| **DELETED** | Permanently removed from storage. |

---

## Queryable Under Loss
Even as data degrades, the system remains searchable via **The Query Archive**:
* Uses **semantic vector search** to find matches.
* Retrieves information from any available state (Full, Summary, or Metadata).
* Displays **uncertainty levels** based on the degradation state of the source material.

---

## Baseline Comparisons
TEAS is benchmarked against two standard strategies:
* **Time-based deletion:** Removing the oldest files first (FIFO).
* **Random deletion:** Deleting items without any specific logic.

**Metrics tracked:** Knowledge coverage, semantic diversity, retrieval quality, and storage efficiency.

---

## Key Features
* **60-year entropy simulation** engine.
* **Autonomous degradation** logic based on importance.
* **AI-powered semantic scoring** and vector-based search.
* **Global timeline replay** for auditing system decisions.
* **Baseline comparison dashboard** to visualize TEAS efficiency.

---

## Tech Stack
* **Frontend:** React / Next.js, Tailwind CSS
* **Backend:** Node.js / API routes
* **Database:** Supabase (PostgreSQL) + `pgvector` for embeddings

---

## How to Run the Project
1.  **Add Data:** Navigate to `Ingest Data` and upload your archival items.
2.  **Start Simulation:** Go to the `Dashboard` and click **Start**.
3.  **Observe:** Use the `Archive Explorer` to watch items degrade in real-time.
4.  **Test:** Use the `Query Archive` to see how well the system retrieves information from degraded data.

---

## Final Outcome
After 60 years:
* Only **~21%** storage remains.
* High-semantic-value knowledge is prioritized for survival.
* The archive remains searchable and useful despite the massive data loss.

---

## Our Team - PythonCatchers 
* Bhuvan Patil(Team Lead) 
bhuvanpatil1313@gmail.com
*[GitHub](https://github.com/Bhuvan1326)*

* Chhatrapal Girase
girasechhatrapal0@gmail.com
*[GitHub](https://github.com/chhatrapalgirase285)*

* Soham Patil
sohampatil0702@gmail.com
*[GitHub](https://github.com/sohampatil0702-cmd)*

* Yash Wankhade
yashwankhade229@gmail.com
*[GitHub](https://github.com/Yashwankhade229)*

---

*TEAS – Entropic Archive Project*
