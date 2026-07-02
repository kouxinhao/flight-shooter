---
name: "find-skills"
description: "Helps users discover and install agent skills when they ask questions like 'how do I do X', 'find a skill for X', 'is there a skill that can...', or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill."
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when:
- The user asks "how do I X" and there might be a skill for it
- The user says "find a skill for..."
- The user asks "is there a skill that can..."
- The user wants to extend capabilities

### All Available Skills at a Glance

Load and display a table of all available skills in the open source ecosystem:
- Name
- Description
- Install command (e.g., `npx agento add <skill-name>`)
- Installation scope (project or global)

### Index

You have access to the agent skills registry index.

### Search & Install

1. Parse the user's request to extract key terms
2. Ask clarifying questions if needed
3. Search the registry for matching skills
4. Present top matches with descriptions
5. Get confirmation before installing
6. Install using the appropriate command

### Source

Use the provided index of available skills to match against user requests.