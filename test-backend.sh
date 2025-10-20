#!/bin/bash

# SynapseX Backend Test Script

echo "🧪 Testing SynapseX Backend API..."
echo ""

BASE_URL="http://127.0.0.1:5000"

# Test 1: Agent Query
echo "1️⃣ Testing Agent Query (NLP Agent)..."
curl -s -X POST "${BASE_URL}/api/agents/ask" \
  -H "Content-Type: application/json" \
  -d '{"role":"nlp","query":"In one sentence, what is machine learning?"}' | jq .
echo ""

# Test 2: Create Task
echo "2️⃣ Creating Task (Critic Agent)..."
TASK_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review methodology",
    "description": "Provide critical analysis of the research methodology",
    "agentType": "critic",
    "priority": "high",
    "workspaceId": "test-workspace"
  }')
echo "$TASK_RESPONSE" | jq .
TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
echo ""

# Test 3: Get Task Queue
echo "3️⃣ Getting Task Queue..."
sleep 2
curl -s "${BASE_URL}/api/tasks/queue/test-workspace" | jq .
echo ""

# Test 4: Get All Tasks
echo "4️⃣ Getting All Tasks..."
sleep 3
curl -s "${BASE_URL}/api/tasks/workspace/test-workspace" | jq .
echo ""

# Test 5: Create Canvas
echo "5️⃣ Creating Canvas Document..."
CANVAS_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/canvas" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research Sprint Canvas",
    "content": "# Team Collaboration\n\nKey findings...",
    "workspaceId": "test-workspace"
  }')
echo "$CANVAS_RESPONSE" | jq .
CANVAS_ID=$(echo "$CANVAS_RESPONSE" | jq -r '.id')
echo ""

# Test 6: Update Canvas
echo "6️⃣ Updating Canvas Document..."
curl -s -X PATCH "${BASE_URL}/api/canvas/${CANVAS_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Team Collaboration\n\nUpdated findings...",
    "userId": "test-user"
  }' | jq .
echo ""

# Test 7: Send Workspace Message
echo "7️⃣ Sending Workspace Message..."
curl -s -X POST "${BASE_URL}/api/workspace/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "test-workspace",
    "content": "Let us discuss the latest research",
    "role": "user"
  }' | jq .
echo ""

# Test 8: Agent Chat
echo "8️⃣ Agent Participation in Chat..."
curl -s -X POST "${BASE_URL}/api/workspace/messages/agent" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "test-workspace",
    "query": "What are the main challenges we should focus on?",
    "agentType": "reasoning"
  }' | jq .
echo ""

# Test 9: Get Workspace Messages
echo "9️⃣ Getting Workspace Messages..."
curl -s "${BASE_URL}/api/workspace/messages/test-workspace" | jq .
echo ""

echo "✅ Backend tests completed!"
