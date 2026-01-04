import admin from "firebase-admin";
import { readFileSync } from "fs";
import { SYSTEM_USERS } from "./personalities.js";
import fetch from "node-fetch";

// ---- Firebase Admin ----
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(readFileSync("./serviceAccount.json"))
  )
});

const POST_PROBABILITY = 0.45;
const db = admin.firestore();

// ---- Gemini ----
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generatePost(systemPrompt) {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: systemPrompt }]
        }
      ]
    })
  });

  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

async function run() {

    if(Math.random() > POST_PROBABILITY){
        console.log("Skipping this run ");
        return;
    }
  const user = random(SYSTEM_USERS);
  const content = await generatePost(user.systemPrompt);

  await db.collection("posts").add({
    authorUid: user.uid,
    authorTag: user.tag,
    content,
    createdAt: Date.now(),
    isSystem: true
  });

  console.log("Posted:", content);
}

run().then(() => process.exit());
