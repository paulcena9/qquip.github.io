const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});

admin.initializeApp();
const db = admin.firestore();

exports.assignProblem = onRequest({region: "us-central1"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
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
});
exports.getProblems = onRequest({region: "us-central1"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }
    const studentId = req.query.studentId;
    if (!studentId || typeof studentId !== "string") {
      return res
          .status(400)
          .send("Missing required query param: studentId");
    }
    try {
      const snapshot = await db
          .collection("problems")
          .where("studentId", "==", studentId)
          .orderBy("createdAt", "desc")
          .get();
      const problems = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.plainText,
          answer: data.answerText !== undefined ? data.answerText : null,
          answered: data.answered !== undefined ? data.answered : false,
        };
      });
      return res.status(200).json(problems);
    } catch (err) {
      logger.error("Error fetching problems:", err);
      return res.status(500).send("Internal server error");
    }
  });
});

exports.submitAnswer = onRequest({region: "us-central1"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const {problemId, answerText} = req.body;
    if (!problemId || !answerText) {
      return res
          .status(400)
          .send("Missing required fields: problemId, answerText");
    }

    try {
      const docRef = db.collection("problems").doc(problemId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).send("Problem not found");
      }

      await docRef.update({
        answerText,
        answered: true,
        answeredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).send("Answer submitted successfully");
    } catch (err) {
      logger.error("Error submitting answer:", err);
      return res.status(500).send("Internal server error");
    }
  });
});
