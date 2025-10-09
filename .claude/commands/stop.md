---
description: Stop the development server and API
---

Execute these commands sequentially using the Bash tool:

First, find and kill process on port 3001:
- Run: netstat -ano | findstr :3001
- Extract the PID from the last column
- Run: taskkill //F //PID [extracted_pid]

Then, find and kill process on port 5175:
- Run: netstat -ano | findstr :5175
- Extract the PID from the last column
- Run: taskkill //F //PID [extracted_pid]
