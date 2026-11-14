#!/usr/bin/env node
"use strict";

// Build a versioned data snapshot from the canonical AKSI semantic engine.
// This is generated from the source of truth; do not hand-edit the output.
const fs = require("node:fs");
const path = require("node:path");
const semantic = require("../../aksi-semantic-reasoning.js");

if (!semantic || !Array.isArray(semantic.concepts) || typeof semantic.conceptInfo !== "function") {
  throw new Error("Canonical AKSI semantic engine API is unavailable");
}

const concepts = semantic.concepts.map((id) => semantic.conceptInfo(id)).sort((a, b) =>
  a.id.localeCompare(b.id, "ru")
);
const seen = new Set();
for (const concept of concepts) {
  if (!concept || typeof concept.id !== "string" || !concept.id.trim()) {
    throw new Error("Semantic concept has no valid id");
  }
  if (seen.has(concept.id)) throw new Error("Duplicate semantic concept: " + concept.id);
  seen.add(concept.id);
  if (typeof concept.definition !== "string" || !concept.definition.trim()) {
    throw new Error("Concept definition missing: " + concept.id);
  }
  if (!Array.isArray(concept.parents) || !Array.isArray(concept.features)) {
    throw new Error("Concept relations/features malformed: " + concept.id);
  }
}

const payload = {
  schema: "AKSI-SEMANTIC-GRAPH/1",
  source: "aksi-semantic-reasoning.js",
  source_version: semantic.version,
  concepts
};
const output = path.join(__dirname, "..", "data", "semantic-graph.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(payload, null, 2) + "\n", "utf8");
process.stdout.write("Exported " + concepts.length + " concepts from AKSI semantic engine v" + semantic.version + "\n");
