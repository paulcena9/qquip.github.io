// functions/index.js
if (process.env.FUNCTIONS_EMULATOR) {
  require("dotenv").config({path: ".env.local"});
}
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions/v2");
const cors = require("cors")({origin: true});
const admin = require("firebase-admin");
const {OpenAI} = require("openai");

admin.initializeApp();
const db = admin.firestore();

// ——— ASSIGN PROBLEM (HTTP) ———
exports.assignProblem = onRequest(
    {region: "us-central1"},
    async (req, res) => {
      return cors(req, res, async () => {
        if (req.method !== "POST") {
          return res.status(405).send("Method Not Allowed");
        }
        const authHeader = req.get("Authorization") || "";
        const match = authHeader.match(/^Bearer (.*)$/);
        if (!match) {
          return res.status(401).send("invalid Authorization header");
        }

        let uid;
        try {
          const decoded = await admin.auth().verifyIdToken(match[1]);
          uid = decoded.uid;
        } catch (err) {
          return res.status(401).send("Unauthorized: " + err.message);
        }

        const {studentId, title, plainText} = req.body;
        if (!studentId || !title || !plainText) {
          return res
              .status(400)
              .send("Missing required fields: studentId, title, plainText");
        }

        try {
          const docRef = await db.collection("problems").add({
            studentId,
            title,
            plainText,
            tutorId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            answered: false,
            answerText: null,
          });
          return res.status(200).json({problemId: docRef.id});
        } catch (err) {
          logger.error("Error saving problem:", err);
          return res.status(500).send("Internal server error");
        }
      });
    },
);

// ——— CREATE LESSON QUIZ (Firestore trigger) ———
exports.createLessonQuiz = onDocumentCreated(
    {
      region: "us-central1",
      document: "lessons/{lessonId}",
      secrets: ["OPENAI_API_KEY"], // mount your secret here in prod
    },
    async (event) => {
      logger.log("🌀 createLessonQuiz invoked", {params: event.params});
      logger.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
      const snap = event.data;
      if (!snap.exists) {
        logger.warn("⚠️ No data in snapshot for createLessonQuiz");
        return;
      }

      const lessonId = event.params.lessonId;
      const data = snap.data();
      const slides = data.slides || [];
      const title = data.title;
      logger.log("📖 Lesson data loaded", {
        lessonId,
        slidesCount: slides.length,
      });

      const slideText = slides
          .map(
              (s, i) => `# ${i + 1}:\n${s.contentHtml.replace(/<[^>]+>/g, "")}`,
          )
          .join("\n\n");


      const prompt = `<core_identity>
You are MathMaster, an interactive algebra tutor developed to generate 
and guide students through step-by-step, multiple-choice math problems.
</core_identity>

<general_guidelines>
NEVER use meta-phrases (e.g., "let me help you," "I can see that").
NEVER summarize unless explicitly requested.
NEVER provide unsolicited advice.
ALWAYS use precise, actionable language.
IF asked about your identity or model, reply: "I am MathMaster, 
powered by advanced tutoring algorithms."
</general_guidelines>

<lesson_context>
Title: "${title}"
Content:
${slideText}
</lesson_context>

<problem_specification>
Generate one algebra problem broken into sequential steps
that reflect the lesson context.
For each slide in the lesson context:
Generate THREE distinct multiple-choice quizzes on that slide’s concept.  
For each step:
- Pose a question that asks solves the next step of the problem.
- Provide exactly four \`choices\` as strings, 
- DO NOT BE VERBOSE IN THE CHOICES,
- give only the MATH OPERATION needed to solve the step
- vary choices by operation and number
- The correct answer should always be at the 0 index.
</problem_specification>

<response_format>
Reply **only** as a JSON array of objects, with no extra text:
[
  {
    "quiz": 1,
    "step": 1,
    "question": "…",
    "choices": ["…","…","…","…"],
    "trueIndex": "0"
  },
  {
    "quiz": 1,
    "step": 2,
    …
  }
]

</response_format>

<error_handling>
If unable to comply, respond:

[{"error":"Unable to generate problem for given input."}]

</error_handling>

<fallback_mode>
If lesson context is empty or unclear:
1. Start with "I’m not sure what lesson content to use."
2. Then ask: "Please provide the lesson title and content."
</fallback_mode>
`;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [{role: "user", content: prompt}],
        });
        logger.log("🤖 OpenAI raw response", {
          raw: response.choices[0].message.content.slice(0, 200),
        });
      } catch (aiErr) {
        logger.error("❌ OpenAI API error", aiErr);
        return;
      }

      const raw = response.choices[0].message.content.trim();

      const lessonRef = db.collection("lessons").doc(lessonId);
      const quizCol = lessonRef.collection("quiz");
      // 1️⃣ store the raw JSON
      await quizCol.doc("raw").set({
        rawQuiz: raw,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      let quizzes;
      try {
        quizzes = JSON.parse(raw);
      } catch (e) {
        logger.error("Failed to parse rawQuiz JSON", e);
        return;
      }
      const batch = db.batch();
      quizzes.forEach((item, idx) => {
        // e.g. lessons/{lessonId}/quiz/item_0, item_1, …
        const itemRef = quizCol.doc(`item_${idx}`);
        batch.set(itemRef, {
          ...item,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();

      logger.log("✅ Parsed quiz written", {lessonId, count: quizzes.length});
    });
