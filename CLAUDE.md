# QQuip Tutor Web Portal

A Firebase-hosted web application that serves as the tutor portal for QQuip, a nonverbal autism communication iOS app. This webapp enables tutors to create homework problems, design interactive lessons, and leverage AI-powered quiz generation to support students with nonverbal autism.

## Project Overview

### Purpose
QQuip is designed to help nonverbal autistic students communicate through math and learning exercises. This web portal allows tutors to:
- Submit homework questions with math notation support
- Create multimedia lessons with rich text, images, and PDFs  
- Generate AI-powered quizzes based on lesson content
- Track student progress and responses

### Architecture
- **Frontend**: Static web app hosted on Firebase Hosting
- **Backend**: Firebase Cloud Functions (Node.js)
- **Database**: Firestore for real-time data sync
- **Storage**: Firebase Storage for images and PDFs
- **AI Integration**: OpenAI GPT for automated quiz generation

## Tech Stack

### Frontend Technologies
- **HTML5/CSS3**: Responsive web interface
- **Vanilla JavaScript**: ES6+ modules with Firebase SDK
- **Quill.js**: Rich text editor for lesson creation
- **Firebase Client SDK v10**: Authentication, Firestore, Storage

### Backend Technologies
- **Node.js 20**: Runtime environment
- **Firebase Admin SDK**: Server-side Firebase operations
- **OpenAI API v4/v5**: AI-powered quiz generation
- **CORS**: Cross-origin resource sharing

## Project Structure

```
qquip.github.io/
├── public/                 # Static web assets (hosted)
│   ├── index.html         # Single-page application
│   └── submit.js          # Main application logic
├── functions/             # Cloud Functions
│   ├── index.js          # Function definitions
│   ├── package.json      # Backend dependencies
│   └── .env.local        # Environment variables (local)
├── firebase.json         # Firebase configuration
├── firestore.rules       # Security rules
├── firestore.indexes.json # Database indexes
└── package.json          # Root dependencies
```

## Key Features

### 1. Authentication System
- Email/password login for tutors
- Secure Firebase Authentication
- Password reset functionality

### 2. Homework Problem Creation
- Interactive math keyboard with special symbols (÷, ×, √, π, etc.)
- Problem assignment to specific students
- Real-time problem tracking and deletion

### 3. Lesson Creation System
- Rich text editor with formatting options
- Image upload and preview
- PDF lesson material upload
- Multi-slide lesson organization

### 4. AI-Powered Quiz Generation
- Automatic quiz creation from lesson content
- Multiple-choice questions with 4 options
- Step-by-step problem breakdown
- Configurable difficulty and question types

## Development Setup

### Prerequisites
- Node.js 20+
- Firebase CLI
- Firebase project with enabled services:
  - Authentication
  - Firestore
  - Storage
  - Hosting
  - Cloud Functions

### Environment Variables
Create `functions/.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local Development
```bash
# Install dependencies
npm install
cd functions && npm install

# Start local development
firebase emulators:start

# Deploy functions only
cd functions && npm run deploy

# Deploy entire project
firebase deploy
```

### Testing
```bash
# Lint functions code
cd functions && npm run lint

# Local function testing
cd functions && npm run serve
```

## API Endpoints

### Cloud Functions

#### `assignProblem` (POST)
Assigns a homework problem to a student.

**URL**: `https://us-central1-qquip-21c6e.cloudfunctions.net/assignProblem`

**Headers**:
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "studentId": "string",
  "title": "string", 
  "plainText": "string"
}
```

**Response**:
```json
{
  "problemId": "string"
}
```

#### `createLessonQuiz` (Firestore Trigger)
Automatically generates quizzes when a lesson document is created in the `lessons` collection.

**Trigger**: Document creation in `/lessons/{lessonId}`

**Generated Data**: Creates subcollection `quiz` with AI-generated questions

## Data Models

### Problems Collection
```typescript
interface Problem {
  studentId: string;
  title: string;
  plainText: string;
  tutorId: string;
  createdAt: Timestamp;
  answered: boolean;
  answerText: string | null;
}
```

### Lessons Collection
```typescript
interface Lesson {
  tutorId: string;
  studentId: string;
  title: string;
  slides: Slide[];
  pdfUrl: string | null;
  createdAt: Timestamp;
}

interface Slide {
  contentHtml: string;
  imageUrl: string | null;
  order: number;
}
```

### Quiz Subcollection
```typescript
interface QuizItem {
  quiz: number;
  step: number;
  question: string;
  choices: [string, string, string, string];
  trueIndex: "0"; // Correct answer always at index 0
  createdAt: Timestamp;
}
```

## Deployment

### Production Deployment
```bash
# Full deployment
firebase deploy

# Functions only
firebase deploy --only functions

# Hosting only  
firebase deploy --only hosting
```

### Environment Configuration
- Production Firebase config is embedded in `submit.js`
- OpenAI API key configured in Cloud Functions secrets
- CORS enabled for cross-origin requests

## Security

### Firestore Rules
- Problems: Read/write restricted to authenticated tutors
- Lessons: Read/write restricted to lesson creators
- Quiz data: Read-only access for students

### Authentication
- Firebase Auth with email/password
- ID token verification on Cloud Function calls
- Secure admin operations via Firebase Admin SDK

## Math Keyboard Layout
The app includes a specialized math keyboard for equation input:

```
7  8  9  ÷
4  5  6  ×  
1  2  3  −
/  ^  *  =
√  π  e  ln
f(x) | ⅆ/ⅆx ⅆ/ⅆt
Frac ^ ⌫ Clear
```

## AI Quiz Generation

The system uses OpenAI's GPT model to generate educational content based on lesson materials. The AI:
- Analyzes lesson slide content
- Creates multiple-choice questions
- Ensures proper difficulty progression
- Generates step-by-step problem solutions

### Prompt Engineering
The AI uses a specialized prompt system optimized for:
- Mathematical accuracy
- Age-appropriate language
- Multiple-choice format consistency
- Autism-friendly communication patterns

## Troubleshooting

### Common Issues
1. **CORS errors**: Ensure proper Firebase hosting setup
2. **Authentication failures**: Check Firebase project configuration
3. **Function timeouts**: Verify OpenAI API key and network connectivity
4. **Upload failures**: Check Firebase Storage rules and file size limits

### Debug Commands
```bash
# View function logs
firebase functions:log

# Local emulator debugging
firebase emulators:start --inspect-functions

# Firestore data inspection
firebase firestore:delete --recursive --shallow collections/problems
```

## Contributing

### Code Style
- Use ES6+ syntax with modules
- Follow Firebase best practices
- Maintain consistent indentation (2 spaces)
- Add JSDoc comments for functions

### Testing Checklist
- [ ] Authentication flow works
- [ ] Problem submission successful
- [ ] Lesson creation with multimedia
- [ ] Quiz generation triggers properly
- [ ] Mobile responsive design
- [ ] Accessibility compliance

## Support

For issues related to:
- **Firebase services**: Check Firebase Console
- **OpenAI integration**: Verify API key and model availability
- **iOS app integration**: Coordinate with mobile development team